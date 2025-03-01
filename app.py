import pandas as pd
import hashlib
import time
import firebase_admin
from firebase_admin import credentials, db
from google import genai
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import threading

# ========== CONFIGURE GEMINI CLIENT ==========
client = genai.Client(api_key="AIzaSyDPNY5J14efn43fOxmEI9hbZOb2__e-s4I")  # Replace with your actual API key

# ========== FIREBASE CONFIGURATION ==========
cred = credentials.Certificate("firebase.json")  # Replace with your Firebase service account key
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://cpaglu-18a8f-default-rtdb.firebaseio.com/'  # Replace with your Firebase DB URL
})

firebase_ref = db.reference("patients")

# ========== FILE PATH ==========
CSV_FILE = "patients.csv"

# Store the hash of each row to detect changes
previous_hashes = {}

# ========== FASTAPI SETUP ==========
app = FastAPI()

# Enable CORS (Allow all origins, methods, and headers)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (*), or specify a list: ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

@app.get("/patients")
def get_patients():
    return firebase_ref.get() or {}

@app.get("/patients/{name}")
def get_patient_by_name(name: str):
    patient = firebase_ref.child(name).get()
    if patient:
        return patient
    return {"error": "Patient not found"}

# ========== FUNCTION TO HASH ROWS ==========
def hash_row(row):
    row_str = ",".join(map(str, row))
    return hashlib.md5(row_str.encode()).hexdigest()

# ========== FUNCTION TO CHECK CHANGES ==========
def check_for_changes():
    global previous_hashes
    df = pd.read_csv(CSV_FILE)
    
    for index, row in df.iterrows():
        row_hash = hash_row(row)
        
        if index in previous_hashes and previous_hashes[index] == row_hash:
            continue  # Row is unchanged, skip it
        
        previous_hashes[index] = row_hash
        process_changed_row(row)

# ========== FUNCTION TO GENERATE PROMPT ==========
def generate_prompt(temp, bp_sys, bp_dia, spo2, heart_rate, age, gender):
    return f"""
    You are an AI specializing in medical triage classification.
    Classify the patient's condition as Immediate, Urgent, or Delayed based on vital signs.
    
    Temperature: {temp} °C
    Blood Pressure: {bp_sys}/{bp_dia} mmHg
    SpO2: {spo2} %
    Heart Rate: {heart_rate} BPM
    Age: {age} years
    Gender: {gender}
    
    Response Format:
    Classification: [Immediate/Urgent/Delayed]
    Explanation: [Brief medical reasoning]
    """

# ========== FUNCTION TO CALL GEMINI API ==========
def get_triage_classification(temp, bp_sys, bp_dia, spo2, heart_rate, age, gender):
    prompt = generate_prompt(temp, bp_sys, bp_dia, spo2, heart_rate, age, gender)
    
    try:
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        if response and response.text:
            return response.text.strip()
        return "Error: No valid response received from AI."
    except Exception as e:
        return f"Error: {str(e)}"

# ========== FUNCTION TO PARSE AI RESPONSE ==========
def parse_classification_result(result):
    classification = "Unknown"
    explanation = "Could not determine classification"
    
    if "Classification:" in result:
        classification = result.split("Classification:")[1].split("\n")[0].strip()
    
    if "Explanation:" in result:
        explanation = result.split("Explanation:")[1].strip()
    
    return classification, explanation

# ========== FUNCTION TO PROCESS CHANGED ROW ==========
def process_changed_row(row):
    temp = row["Temperature"]
    bp_sys = row["BP_Systolic"]
    bp_dia = row["BP_Diastolic"]
    spo2 = row["SpO2"]
    heart_rate = row["Heart Rate"]
    age = row["Age"]
    gender = row["Gender"]
    
    result = get_triage_classification(temp, bp_sys, bp_dia, spo2, heart_rate, age, gender)
    classification, explanation = parse_classification_result(result)
    
    print(f"\n🔄 Updated Patient: {row['Name']} ({row['Admission Date']})")
    print(f"🏥 Classification: {classification}")
    print(f"📋 Explanation: {explanation}\n")
    
    # Save to Firebase
    firebase_ref.child(row['Name']).set({
        "Name": row["Name"],
        "Temperature": temp,
        "BP_Systolic": bp_sys,
        "BP_Diastolic": bp_dia,
        "SpO2": spo2,
        "Heart Rate": heart_rate,
        "Age": age,
        "Gender": gender,
        "Classification": classification,
        "Explanation": explanation,
        "Admission Date": row["Admission Date"]
    })

# ========== WATCHDOG FILE MONITOR ==========
class CSVChangeHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith(".csv"):
            print("📂 CSV file updated. Checking for changes...")
            check_for_changes()

# ========== START MONITORING ==========
event_handler = CSVChangeHandler()
observer = Observer()
observer.schedule(event_handler, path=".", recursive=False)
observer.start()

print("🔍 Monitoring CSV file for real-time changes...")

# Run FastAPI in a separate thread
def start_api():
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

api_thread = threading.Thread(target=start_api, daemon=True)
api_thread.start()

try:
    while True:
        time.sleep(5)
except KeyboardInterrupt:
    observer.stop()
observer.join()
