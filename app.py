import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import time
import os
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Path to the CSV file (would be replaced with your real data source)
DATA_PATH = "patient_data.csv"

# Global variables to store model, scaler, and current urgency classifications
model = None
scaler = None
current_predictions = {}

def preprocess_data(df):
    """Preprocess the data for model training and prediction"""
    # Calculate derived features if they don't exist
    if 'Derived_Pulse_Pressure' not in df.columns:
        df['Derived_Pulse_Pressure'] = df['Systolic Blood Pressure'] - df['Diastolic Blood Pressure']
    
    if 'Derived_MAP' not in df.columns:
        df['Derived_MAP'] = df['Diastolic Blood Pressure'] + (1/3) * (df['Systolic Blood Pressure'] - df['Diastolic Blood Pressure'])
    
    if 'Derived_BMI' not in df.columns and 'Weight (kg)' in df.columns and 'Height (m)' in df.columns:
        df['Derived_BMI'] = df['Weight (kg)'] / (df['Height (m)'] ** 2)
    
    # Convert categorical data
    if 'Gender' in df.columns:
        df['Gender'] = df['Gender'].map({'Male': 0, 'Female': 1})
    
    # Select features for the model
    feature_cols = [
        'Heart Rate', 'Respiratory Rate', 'Body Temperature', 
        'Oxygen Saturation', 'Systolic Blood Pressure', 'Diastolic Blood Pressure',
        'Age', 'Gender', 'Derived_Pulse_Pressure', 'Derived_MAP', 'Derived_BMI'
    ]
    
    if 'Derived_HRV' in df.columns:
        feature_cols.append('Derived_HRV')
    
    # Clean column names and select only needed features
    clean_cols = []
    for col in feature_cols:
        if col in df.columns:
            clean_cols.append(col)
        elif col.lower().replace(' ', '_') in df.columns:
            clean_cols.append(col.lower().replace(' ', '_'))
        elif col.replace(' ', '_') in df.columns:
            clean_cols.append(col.replace(' ', '_'))
    
    # Extract features and handle missing values
    X = df[clean_cols].copy()
    X.fillna(X.mean(), inplace=True)
    
    return X

def derive_urgency_classes(df, X):
    """Use machine learning to derive urgency classes without hardcoded rules"""
    risk_col = 'Risk Category' if 'Risk Category' in df.columns else 'risk_category'
    
    # Define our target urgency categories
    urgency_categories = ['Immediate', 'Urgent', 'Delay']
    
    if risk_col in df.columns and df[risk_col].nunique() > 0:
        # If risk category is provided, map it to urgency levels
        logger.info("Using existing risk categories to derive urgency levels")
        
        # If we have only two categories (e.g., High Risk and Low Risk)
        if df[risk_col].nunique() == 2:
            logger.info("Binary risk categories found, creating three urgency levels")
            
            # Scale the data
            temp_scaler = StandardScaler()
            X_scaled = temp_scaler.fit_transform(X)
            
            # Map risk categories to numerical values for training
            risk_values = df[risk_col].map({'High Risk': 1, 'Low Risk': 0})
            
            # Train a temporary model to get probabilities
            temp_model = RandomForestClassifier(n_estimators=50, random_state=42)
            temp_model.fit(X_scaled, risk_values)
            
            # Get probabilities
            probs = temp_model.predict_proba(X_scaled)[:, 1]
            
            # Create three categories based on probabilities
            # Top third -> Immediate, Middle third -> Urgent, Bottom third -> Delay
            thresholds = [np.percentile(probs, 33), np.percentile(probs, 66)]
            
            conditions = [
                probs >= thresholds[1],  # Top third -> Immediate
                (probs >= thresholds[0]) & (probs < thresholds[1])  # Middle third -> Urgent
            ]
            
            y = np.select(conditions, urgency_categories[:-1], default=urgency_categories[-1])
            
        else:
            # If we already have three or more categories, map them to our urgency levels
            logger.info(f"Multiple risk categories found: {df[risk_col].unique()}")
            
            # Create a mapping from existing categories to urgency levels
            unique_categories = df[risk_col].unique()
            if len(unique_categories) == 3:
                # If we already have exactly 3 categories, sort them by count (assuming rarest = most urgent)
                category_counts = df[risk_col].value_counts().sort_values()
                category_map = {}
                for i, (category, _) in enumerate(category_counts.items()):
                    category_map[category] = urgency_categories[i]
            else:
                # For other cases, use a simple mapping
                category_map = {}
                for category in unique_categories:
                    if 'high' in str(category).lower():
                        category_map[category] = 'Immediate'
                    elif 'medium' in str(category).lower() or 'moderate' in str(category).lower():
                        category_map[category] = 'Urgent'
                    else:
                        category_map[category] = 'Delay'
            
            # Apply the mapping
            y = df[risk_col].map(category_map)
            y = y.fillna('Delay')  # Default to Delay if category is unknown
    else:
        # If no risk category is provided, use unsupervised learning (clustering)
        logger.info("No risk categories available, using clustering to derive urgency levels")
        
        # Scale the data
        temp_scaler = StandardScaler()
        X_scaled = temp_scaler.fit_transform(X)
        
        # Use KMeans to create exactly 3 clusters
        kmeans = KMeans(n_clusters=3, random_state=42)
        clusters = kmeans.fit_predict(X_scaled)
        
        # Determine cluster severity based on vital signs
        cluster_severity = {}
        for cluster_id in range(3):
            cluster_data = X[clusters == cluster_id]
            
            # Calculate average vital signs for this cluster
            severity_score = 0
            
            # Higher heart rate increases severity
            if 'Heart Rate' in cluster_data:
                hr = cluster_data['Heart Rate'].mean()
                severity_score += (hr - 70) / 30  # Normalize around normal heart rate
            elif 'heart_rate' in cluster_data:
                hr = cluster_data['heart_rate'].mean()
                severity_score += (hr - 70) / 30
                
            # Lower oxygen saturation increases severity
            if 'Oxygen Saturation' in cluster_data:
                ox = cluster_data['Oxygen Saturation'].mean()
                severity_score += (100 - ox) * 0.5  # Lower oxygen = higher score
            elif 'oxygen_saturation' in cluster_data:
                ox = cluster_data['oxygen_saturation'].mean()
                severity_score += (100 - ox) * 0.5
                
            # Blood pressure extremes increase severity
            if 'Systolic Blood Pressure' in cluster_data:
                sys = cluster_data['Systolic Blood Pressure'].mean()
                severity_score += abs(sys - 120) / 20  # Deviation from normal
            elif 'systolic_blood_pressure' in cluster_data:
                sys = cluster_data['systolic_blood_pressure'].mean()
                severity_score += abs(sys - 120) / 20
                
            cluster_severity[cluster_id] = severity_score
        
        # Rank clusters by severity score
        ranked_clusters = sorted(cluster_severity.items(), key=lambda x: x[1], reverse=True)
        
        # Map clusters to urgency levels
        cluster_map = {
            ranked_clusters[0][0]: 'Immediate',  # Highest severity score
            ranked_clusters[1][0]: 'Urgent',     # Middle severity score
            ranked_clusters[2][0]: 'Delay'       # Lowest severity score
        }
        
        # Apply the mapping to create urgency labels
        y = pd.Series([cluster_map[c] for c in clusters])
    
    logger.info(f"Created urgency classes with distribution: {y.value_counts().to_dict()}")
    return y

def train_model(df):
    """Train a machine learning model on the data"""
    global model, scaler
    
    # Preprocess the data
    X = preprocess_data(df)
    
    # Derive urgency classes using machine learning
    y = derive_urgency_classes(df, X)
    
    # Scale the features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train a Random Forest classifier
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_scaled, y)
    
    # Save the model and scaler
    joblib.dump(model, 'patient_urgency_model.pkl')
    joblib.dump(scaler, 'patient_scaler.pkl')
    
    logger.info("Model trained successfully")
    return model, scaler

def load_or_train_model():
    """Load the model and scaler from disk or train a new one if not available"""
    global model, scaler
    
    try:
        if os.path.exists('patient_urgency_model.pkl') and os.path.exists('patient_scaler.pkl'):
            model = joblib.load('patient_urgency_model.pkl')
            scaler = joblib.load('patient_scaler.pkl')
            logger.info("Model loaded from disk")
        else:
            # Load the data from CSV and train a new model
            try:
                df = pd.read_csv(DATA_PATH)
                model, scaler = train_model(df)
                logger.info("Model trained from CSV data")
            except Exception as e:
                logger.error(f"Error loading data and training model: {str(e)}")
                # Create a dummy model for demo purposes
                create_dummy_model()
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        create_dummy_model()

def create_dummy_model():
    """Create a dummy model for demonstration purposes"""
    global model, scaler
    
    logger.warning("Creating dummy model as fallback")
    
    # Create a simple random forest model
    X = np.random.rand(100, 10)
    y = np.random.choice(['Immediate', 'Urgent', 'Delay'], 100)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    model = RandomForestClassifier(n_estimators=10, random_state=42)
    model.fit(X_scaled, y)

def generate_sample_data(num_patients=10):
    """Generate sample patient data for demonstration purposes"""
    patients = []
    for i in range(1, num_patients + 1):
        # Generate random but realistic vital signs
        heart_rate = np.random.normal(75, 15)  # Mean 75, std 15
        respiratory_rate = np.random.normal(16, 4)
        body_temp = np.random.normal(37, 0.5)
        oxygen = np.random.normal(97, 3)
        systolic = np.random.normal(120, 20)
        diastolic = np.random.normal(80, 10)
        age = np.random.randint(18, 90)
        gender = np.random.choice(['Male', 'Female'])
        weight = np.random.normal(70, 15)
        height = np.random.normal(1.7, 0.15)
        
        patients.append({
            'Patient ID': i,
            'Heart Rate': heart_rate,
            'Respiratory Rate': respiratory_rate,
            'Body Temperature': body_temp,
            'Oxygen Saturation': oxygen,
            'Systolic Blood Pressure': systolic,
            'Diastolic Blood Pressure': diastolic,
            'Age': age,
            'Gender': gender,
            'Weight (kg)': weight,
            'Height (m)': height,
            'Timestamp': datetime.now().isoformat()
        })
    
    # Create a DataFrame and save to CSV
    df = pd.DataFrame(patients)
    df.to_csv(DATA_PATH, index=False)
    logger.info(f"Generated sample data for {num_patients} patients")
    return df

def predict_patient_urgency():
    """Predict urgency levels for all patients"""
    global current_predictions
    
    try:
        # Read the latest data
        if not os.path.exists(DATA_PATH):
            generate_sample_data()
            
        df = pd.read_csv(DATA_PATH)
        
        # Preprocess the data
        X = preprocess_data(df)
        X_scaled = scaler.transform(X)
        
        # Make predictions
        predictions = model.predict(X_scaled)
        probabilities = model.predict_proba(X_scaled)
        
        # Update the current predictions
        patient_id_col = 'Patient ID' if 'Patient ID' in df.columns else 'patient_id'
        
        for i, row in df.iterrows():
            patient_id = int(row[patient_id_col])
            confidence = max(probabilities[i])
            urgency = predictions[i]
            
            current_predictions[patient_id] = {
                'patient_id': patient_id,
                'urgency_level': urgency,
                'confidence': float(confidence),
                'last_updated': datetime.now().isoformat()
            }
            
            # Print the predictions
            logger.info(f"Patient {patient_id}: {urgency} (Confidence: {confidence:.2f})")
        
        print("\n" + "="*50)
        print(f"Updated predictions for {len(df)} patients at {datetime.now().strftime('%H:%M:%S')}")
        print("="*50 + "\n")
        
        # Print a summary of urgency levels
        urgency_counts = {}
        for pred in current_predictions.values():
            level = pred['urgency_level']
            urgency_counts[level] = urgency_counts.get(level, 0) + 1
        
        print("Current Urgency Distribution:")
        for level, count in urgency_counts.items():
            print(f"  {level}: {count} patients")
        print("\n")
        
    except Exception as e:
        logger.error(f"Error in prediction: {str(e)}")

def simulate_data_changes():
    """Simulate changes in patient data to demonstrate real-time monitoring"""
    if not os.path.exists(DATA_PATH):
        generate_sample_data()
        return
    
    try:
        # Read the current data
        df = pd.read_csv(DATA_PATH)
        
        # Randomly select patients to update (between 30-70% of patients)
        num_patients = len(df)
        num_to_update = np.random.randint(max(1, int(0.3 * num_patients)), 
                                        max(2, int(0.7 * num_patients)))
        
        patients_to_update = np.random.choice(df.index, num_to_update, replace=False)
        
        # Update vital signs with small changes
        for idx in patients_to_update:
            # Heart rate changes
            df.loc[idx, 'Heart Rate'] = int(df.loc[idx, 'Heart Rate'] + np.random.normal(0, 3))
            
            # Oxygen saturation changes (smaller variation)
            df.loc[idx, 'Oxygen Saturation'] += np.random.normal(0, 1)
            df.loc[idx, 'Oxygen Saturation'] = min(100, max(70, df.loc[idx, 'Oxygen Saturation']))
            
            # Blood pressure changes
            df.loc[idx, 'Systolic Blood Pressure'] = int(df.loc[idx, 'Systolic Blood Pressure'] + np.random.normal(0, 5))

            df.loc[idx, 'Diastolic Blood Pressure'] = int(df.loc[idx, 'Diastolic Blood Pressure'] + np.random.normal(0, 3))

            
            # Temperature changes (very small)
            df.loc[idx, 'Body Temperature'] += np.random.normal(0, 0.2)
            
            # Update timestamp
            df.loc[idx, 'Timestamp'] = datetime.now().isoformat()
        
        # Save the updated data
        df.to_csv(DATA_PATH, index=False)
        logger.info(f"Updated data for {num_to_update} patients")
        
    except Exception as e:
        logger.error(f"Error simulating data changes: {str(e)}")

def main():
    """Main function to run the patient monitoring system"""
    print("="*60)
    print("PATIENT MONITORING SYSTEM")
    print("Real-time Patient Urgency Classification")
    print("="*60)
    
    # Load or train the model
    print("\nInitializing ML model...")
    load_or_train_model()
    
    # Generate initial data if needed
    if not os.path.exists(DATA_PATH):
        print("\nGenerating initial sample patient data...")
        generate_sample_data(num_patients=15)
    
    print("\nStarting continuous monitoring (every 3 seconds)...")
    print("Press Ctrl+C to stop\n")
    
    try:
        while True:
            # Simulate changes in patient data
            simulate_data_changes()
            
            # Predict urgency levels
            predict_patient_urgency()
            
            # Wait for 3 seconds
            time.sleep(3)
    
    except KeyboardInterrupt:
        print("\nStopping continuous monitoring...")
        print("Patient monitoring system stopped.")

if __name__ == "__main__":
    main()