import csv
import time
import os
import logging
import json
from datetime import datetime
from typing import List, Dict, Optional, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
from google import genai
import firebase_admin
from firebase_admin import credentials
from firebase_admin import db
import threading
import watchdog.events
import watchdog.observers

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("triage_log.txt"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger()

# Set Gemini API Key directly
GEMINI_API_KEY = "AIzaSyCjYu4ylz27kUUrLam69jo1R7gTQHX_e1A"

if not GEMINI_API_KEY:
    raise ValueError("Error: Gemini API key is missing. Please set it correctly.")

# Initialize Gemini API Client
client = genai.Client(api_key=GEMINI_API_KEY)

# Initialize Firebase
try:
    cred = credentials.Certificate("firebase.json")
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://cpaglu-18a8f-default-rtdb.firebaseio.com/'
    })
    logger.info("Firebase initialized successfully")
except Exception as e:
    logger.error(f"Firebase initialization error: {str(e)}")
    raise ValueError("Error: Firebase initialization failed. Please check your credentials.")

# Initialize FastAPI app
app = FastAPI(
    title="Patient Triage API",
    description="API for classifying patients using medical triage with Gemini AI and Firebase",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class PatientBase(BaseModel):
    Name: str
    Age: int = Field(..., ge=0, le=120)
    Gender: str
    Temperature: float = Field(..., ge=30, le=45)
    BP_Systolic: int = Field(..., ge=50, le=250)
    BP_Diastolic: int = Field(..., ge=30, le=150)
    SpO2: int = Field(..., ge=50, le=100)
    Heart_Rate: int = Field(..., ge=30, le=220)
    
class PatientCreate(PatientBase):
    ID: Optional[str] = None
    Additional_Notes: Optional[str] = None

class PatientResponse(PatientBase):
    ID: str
    Classification: str
    Explanation: str
    Last_Updated: str
    Additional_Notes: Optional[str] = None

class PatientList(BaseModel):
    patients: List[PatientResponse]

# Function to generate a refined triage classification prompt
def generate_prompt(temp, bp_sys, bp_dia, spo2, heart_rate, age, gender):
    return f"""
    You are an advanced AI specializing in medical triage classification.
    Your task is to assess a patient's condition and classify it as **Immediate, Urgent, or Delayed** based on their vital signs.

    ### **Patient Data:**
    - **Temperature:** {temp} °C
    - **Blood Pressure:** {bp_sys}/{bp_dia} mmHg
    - **SpO2 (Oxygen Saturation):** {spo2} %
    - **Heart Rate:** {heart_rate} BPM
    - **Age:** {age} years
    - **Gender:** {gender}

    ### **Triage Classification Guidelines:**
    1. **Immediate (Critical - Requires Emergency Care)**  
       - Signs of severe distress, such as extremely low oxygen, abnormal blood pressure, or life-threatening heart rate.  
       - Symptoms suggesting organ failure, shock, or imminent collapse.  

    2. **Urgent (Serious - Needs Medical Attention Soon)**  
       - Moderate distress, where the patient is stable but at risk of deterioration.  
       - Vitals outside the normal range but not immediately life-threatening.  

    3. **Delayed (Stable - Can Wait for Routine Care)**  
       - Vitals within acceptable ranges, with no immediate signs of distress.  
       - No evidence of rapid deterioration or acute medical risk.  

    ### **Instructions for AI:**  
    - Analyze the input vitals holistically instead of relying on fixed thresholds.  
    - Use **clinical reasoning** rather than strict numerical cutoffs.  
    - If vitals suggest multiple classifications, prioritize the **most critical one**.  
    - Provide a clear but concise explanation with supporting medical reasoning.  

    ### **Response Format:**  
    ```
    Classification: [Immediate/Urgent/Delayed]
    Explanation: [Brief medical reasoning for classification]
    ```
    """

# Function to call Gemini API and get classification
def get_triage_classification(temp, bp_sys, bp_dia, spo2, heart_rate, age, gender):
    prompt = generate_prompt(temp, bp_sys, bp_dia, spo2, heart_rate, age, gender)

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash", 
            contents=prompt
        )

        if response and hasattr(response, "text"):
            return response.text.strip()
        return "Error: No valid response received from AI."

    except Exception as e:
        logger.error(f"API error: {str(e)}")
        return f"Error: {str(e)}"

# Function to extract classification and explanation
def parse_classification_result(result):
    classification = "Unknown"
    explanation = "Could not determine classification"
    
    if "Classification:" in result:
        classification_parts = result.split("Classification:")
        if len(classification_parts) > 1:
            classification_line = classification_parts[1].split("\n")[0].strip()
            classification = classification_line
    
    if "Explanation:" in result:
        explanation_parts = result.split("Explanation:")
        if len(explanation_parts) > 1:
            explanation = explanation_parts[1].strip()
    
    return classification, explanation

# Function to update Firebase with patient data
def update_firebase_data(patient_data):
    try:
        # Get patient ID (or generate one if not present)
        patient_id = patient_data.get("ID")
        if not patient_id:
            patient_id = f"patient_{patient_data.get('Name', '').replace(' ', '_').lower()}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            patient_data["ID"] = patient_id
        
        # Reference to patients node in database
        patients_ref = db.reference('patients')
        
        # Update data for specific patient
        patient_ref = patients_ref.child(patient_id)
        patient_ref.set(patient_data)
        
        logger.info(f"Successfully updated data for patient ID: {patient_id}")
        return patient_data
    except Exception as e:
        logger.error(f"Firebase update error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Firebase update failed: {str(e)}")

# Function to get all patients from Firebase
def get_all_patients_from_firebase():
    try:
        patients_ref = db.reference('patients')
        patients_data = patients_ref.get()
        
        if not patients_data:
            return []
            
        # Convert to list of patient objects
        patients_list = [patient_data for patient_id, patient_data in patients_data.items()]
        return patients_list
        
    except Exception as e:
        logger.error(f"Firebase read error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Firebase read failed: {str(e)}")

# Function to get patient by ID from Firebase
def get_patient_by_id(patient_id):
    try:
        patient_ref = db.reference(f'patients/{patient_id}')
        patient_data = patient_ref.get()
        
        if not patient_data:
            raise HTTPException(status_code=404, detail=f"Patient with ID {patient_id} not found")
            
        return patient_data
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Firebase read error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Firebase read failed: {str(e)}")

# Function to process a single patient
def process_patient(patient: PatientCreate):
    try:
        patient_dict = patient.dict()
        
        # Process the patient
        temp = patient.Temperature
        bp_sys = patient.BP_Systolic
        bp_dia = patient.BP_Diastolic
        spo2 = patient.SpO2
        heart_rate = patient.Heart_Rate
        age = patient.Age
        gender = patient.Gender

        # Get classification from AI
        classification_result = get_triage_classification(
            temp, bp_sys, bp_dia, spo2, heart_rate, age, gender
        )

        # Parse classification and explanation
        classification, explanation = parse_classification_result(classification_result)
        
        # Add classification data to patient record
        patient_dict["Classification"] = classification
        patient_dict["Explanation"] = explanation
        patient_dict["Last_Updated"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Update Firebase
        updated_patient = update_firebase_data(patient_dict)
        return updated_patient
        
    except Exception as e:
        logger.error(f"Error processing patient: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing patient: {str(e)}")

# Function to process CSV file
def process_csv(file_path):
    try:
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            return
        
        logger.info(f"Processing CSV file: {file_path}")
        
        with open(file_path, newline="", mode="r", encoding="utf-8") as file:
            reader = csv.DictReader(file)
            patients_data = list(reader)
        
        processed_count = 0
        error_count = 0
        
        for row in patients_data:
            try:
                # Convert values to appropriate types
                processed_row = {
                    "Name": row.get("Name", "Unknown"),
                    "Age": int(row.get("Age", 40)),
                    "Gender": row.get("Gender", "Unknown"),
                    "Temperature": float(row.get("Temperature", 37.0)),
                    "BP_Systolic": int(row.get("BP_Systolic", 120)),
                    "BP_Diastolic": int(row.get("BP_Diastolic", 80)),
                    "SpO2": int(row.get("SpO2", 98)),
                    "Heart_Rate": int(row.get("Heart Rate", 75)),
                    "ID": row.get("ID", None),
                    "Additional_Notes": row.get("Additional_Notes", "")
                }
                
                # Create patient object and process
                patient = PatientCreate(**processed_row)
                process_patient(patient)
                processed_count += 1
                
            except Exception as e:
                logger.error(f"Error processing patient from CSV: {str(e)}")
                error_count += 1
                
        logger.info(f"CSV processing complete - Processed: {processed_count}, Errors: {error_count}")
    
    except Exception as e:
        logger.error(f"Error processing CSV file: {str(e)}")

# File change event handler for watchdog
class CSVFileHandler(watchdog.events.FileSystemEventHandler):
    def __init__(self, csv_path):
        self.csv_path = csv_path
        self.last_modified = 0
        self.cooldown = 2  # seconds between processing to prevent multiple rapid changes

    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith(self.csv_path):
            current_time = time.time()
            if current_time - self.last_modified > self.cooldown:
                self.last_modified = current_time
                logger.info(f"Detected changes in {self.csv_path}")
                # Sleep briefly to ensure file is fully written
                time.sleep(0.5)
                process_csv(self.csv_path)

# Function to start the file watcher
def start_csv_watcher(csv_path="patients.csv"):
    try:
        logger.info(f"Starting file watcher for {csv_path}")
        
        # Process the file initially if it exists
        if os.path.exists(csv_path):
            process_csv(csv_path)
        
        # Set up the file watcher
        event_handler = CSVFileHandler(csv_path)
        observer = watchdog.observers.Observer()
        observer.schedule(event_handler, path=os.path.dirname(csv_path) or '.', recursive=False)
        observer.start()
        
        logger.info(f"File watcher started for {csv_path}")
        return observer
    except Exception as e:
        logger.error(f"Error starting file watcher: {str(e)}")
        return None

# API Routes
@app.get("/")
def read_root():
    return {"message": "Patient Triage API is running", "status": "active"}

@app.post("/patients/", response_model=PatientResponse)
def create_patient(patient: PatientCreate):
    """Process a single patient and store in Firebase"""
    try:
        result = process_patient(patient)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/patients/", response_model=PatientList)
def read_patients():
    """Get all patients from Firebase"""
    try:
        patients = get_all_patients_from_firebase()
        return {"patients": patients}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/patients/{patient_id}", response_model=PatientResponse)
def read_patient(patient_id: str):
    """Get a specific patient by ID"""
    return get_patient_by_id(patient_id)

@app.get("/stats/")
def get_stats():
    """Get triage statistics"""
    try:
        patients = get_all_patients_from_firebase()
        
        if not patients:
            return {"total": 0, "classifications": {}}
        
        # Count classifications
        classifications = {}
        for patient in patients:
            classification = patient.get("Classification", "Unknown")
            classifications[classification] = classifications.get(classification, 0) + 1
        
        return {
            "total": len(patients),
            "classifications": classifications
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Run the server
if __name__ == "__main__":
    logger.info("="*50)
    logger.info("Starting Patient Triage API with Firebase integration...")
    logger.info("Starting CSV file watcher for automatic updates...")
    
    # Start file watcher in a separate thread
    csv_observer = start_csv_watcher("patients.csv")
    
    # Print server start message
    logger.info("API available at http://localhost:8000")
    logger.info("CSV file watcher is active - Edit patients.csv to auto-update Firebase")
    logger.info("="*50)
    
    # Start FastAPI server
    try:
        uvicorn.run(app, host="0.0.0.0", port=8000)
    finally:
        # Ensure the observer is stopped when the app stops
        if csv_observer:
            csv_observer.stop()
            csv_observer.join()