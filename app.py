import pandas as pd
import hashlib
import time
import firebase_admin
from firebase_admin import credentials, db
from google import genai
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import threading
import json
import asyncio
from queue import Queue
from concurrent.futures import ThreadPoolExecutor

# ========== CONFIGURE GEMINI CLIENT ==========
client = genai.Client(api_key="AIzaSyCjYu4ylz27kUUrLam69jo1R7gTQHX_e1A")

# ========== FIREBASE CONFIGURATION ==========
cred = credentials.Certificate("firebase.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://cpaglu-18a8f-default-rtdb.firebaseio.com/'
})

firebase_ref = db.reference("patients")

# ========== FILE PATH ==========
CSV_FILE = "patients.csv"

# Store the hash of each row to detect changes
previous_hashes = {}

# Create a message queue for cross-thread communication
message_queue = Queue()

# ========== WEBSOCKET CONNECTION MANAGER ==========
class ConnectionManager:
    def __init__(self):
        self.active_connections = []
        self.lock = threading.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        with self.lock:
            self.active_connections.append(websocket)
        print(f"New WebSocket client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        with self.lock:
            self.active_connections.remove(websocket)
        print(f"WebSocket client disconnected. Remaining connections: {len(self.active_connections)}")

    async def broadcast(self, message):
        disconnected = []
        with self.lock:
            connections = self.active_connections.copy()
        
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        
        # Clean up any disconnected clients
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

# ========== FASTAPI SETUP ==========
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial data to newly connected client
        patients = firebase_ref.get() or {}
        await websocket.send_json({"type": "initial_data", "data": patients})
        
        # Keep connection alive
        while True:
            await websocket.receive_text()  # Wait for any message, used to keep connection alive
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Background task that processes the message queue and broadcasts updates
@app.on_event("startup")
async def start_background_tasks():
    asyncio.create_task(process_broadcast_queue())

async def process_broadcast_queue():
    while True:
        if not message_queue.empty():
            message = message_queue.get()
            await manager.broadcast(message)
        await asyncio.sleep(0.1)  # Small delay to prevent CPU overuse

# Function to safely queue a message from synchronous code
def queue_broadcast(message):
    message_queue.put(message)
    
# ========== FUNCTION TO HASH ROWS ==========
def hash_row(row):
    row_str = ",".join(map(str, row))
    return hashlib.md5(row_str.encode()).hexdigest()

# ========== FUNCTION TO CHECK CHANGES ==========
def check_for_changes():
    global previous_hashes
    df = pd.read_csv(CSV_FILE)

    # Get all names from Firebase
    firebase_patients = firebase_ref.get() or {}
    firebase_names = set(firebase_patients.keys() if firebase_patients else [])
    csv_names = set(df["Name"])

    # Remove names from Firebase that are not in the CSV
    names_to_remove = firebase_names - csv_names
    for name in names_to_remove:
        print(f"❌ Removing {name} from Firebase (not in CSV)")
        firebase_ref.child(name).delete()
        queue_broadcast({
            "type": "delete", 
            "data": {"name": name}
        })

    # Process changes for rows in CSV
    for index, row in df.iterrows():
        row_hash = hash_row(row)
        if index in previous_hashes and previous_hashes[index] == row_hash:
            continue  # Skip unchanged row
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

    patient_data = {
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
    }

    firebase_ref.child(row['Name']).set(patient_data)
    
    # Queue the update for broadcasting
    queue_broadcast({
        "type": "update", 
        "data": patient_data
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
print("🔌 WebSocket server will run at ws://0.0.0.0:8000/ws")

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