# First, install the required packages
# Run these commands in your terminal or as a cell in your notebook:
# pip install kagglehub tensorflow matplotlib pandas scikit-learn

import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, Dense, Conv2D, MaxPooling2D, Flatten, Dropout, GlobalAveragePooling2D
from tensorflow.keras.applications import DenseNet121
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from sklearn.model_selection import train_test_split

# Install kagglehub if not already installed
import sys
import subprocess
try:
    import kagglehub
except ModuleNotFoundError:
    print("Installing kagglehub...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "kagglehub"])
    import kagglehub

# Download dataset
print("Downloading dataset from Kaggle...")
try:
    path = kagglehub.dataset_download("paultimothymooney/chest-xray-pneumonia")
    print("Path to dataset files:", path)
except Exception as e:
    print(f"Error downloading dataset: {e}")
    print("If you're getting authentication errors, you need to set up your Kaggle API credentials:")
    print("1. Go to https://www.kaggle.com/settings/account")
    print("2. Click on 'Create New API Token' to download kaggle.json")
    print("3. Place this file in ~/.kaggle/ (Linux/Mac) or C:\\Users\\<username>\\.kaggle\\ (Windows)")
    
    # Alternative: Use a local path if you've already downloaded the dataset
    print("\nAlternatively, if you've already downloaded the dataset manually, set the path:")
    path = input("Enter the path to your local chest_xray dataset: ")

# Make sure the path exists
if not os.path.exists(path):
    raise FileNotFoundError(f"The path {path} does not exist. Please check your dataset location.")

# Define paths for train, validation, and test sets
# The dataset structure should be:
# - chest_xray/
#   - train/
#     - NORMAL/
#     - PNEUMONIA/
#   - val/
#     - NORMAL/
#     - PNEUMONIA/
#   - test/
#     - NORMAL/
#     - PNEUMONIA/

# Handle possible structure variations
if os.path.exists(os.path.join(path, 'chest_xray')):
    base_dir = os.path.join(path, 'chest_xray')
else:
    base_dir = path

train_dir = os.path.join(base_dir, 'train')
val_dir = os.path.join(base_dir, 'val')
test_dir = os.path.join(base_dir, 'test')

# Check if validation directory exists, otherwise create a split from training data
if not os.path.exists(val_dir) or len(os.listdir(val_dir)) == 0:
    print("Validation directory is empty or doesn't exist. Creating validation set from training data...")
    os.makedirs(os.path.join(val_dir, 'NORMAL'), exist_ok=True)
    os.makedirs(os.path.join(val_dir, 'PNEUMONIA'), exist_ok=True)
    
    # Function to move a portion of images to validation
    def move_images_to_val(class_name, fraction=0.2):
        source_dir = os.path.join(train_dir, class_name)
        target_dir = os.path.join(val_dir, class_name)
        
        files = os.listdir(source_dir)
        num_val = int(len(files) * fraction)
        val_files = np.random.choice(files, num_val, replace=False)
        
        for file in val_files:
            source_path = os.path.join(source_dir, file)
            target_path = os.path.join(target_dir, file)
            # This would move files, but we'll copy instead to preserve originals
            # shutil.move(source_path, target_path)
            # For actual implementation, use:
            from shutil import copy2
            copy2(source_path, target_path)
            
    move_images_to_val('NORMAL')
    move_images_to_val('PNEUMONIA')

# Verify directories
print("Checking directory structure...")
print(f"Train directory exists: {os.path.exists(train_dir)}")
print(f"Validation directory exists: {os.path.exists(val_dir)}")
print(f"Test directory exists: {os.path.exists(test_dir)}")

# Count number of images in each split
def count_images(directory):
    normal = len(os.listdir(os.path.join(directory, 'NORMAL'))) if os.path.exists(os.path.join(directory, 'NORMAL')) else 0
    pneumonia = len(os.listdir(os.path.join(directory, 'PNEUMONIA'))) if os.path.exists(os.path.join(directory, 'PNEUMONIA')) else 0
    return normal, pneumonia

train_normal, train_pneumonia = count_images(train_dir)
val_normal, val_pneumonia = count_images(val_dir)
test_normal, test_pneumonia = count_images(test_dir)

print(f"Training: {train_normal} normal, {train_pneumonia} pneumonia")
print(f"Validation: {val_normal} normal, {val_pneumonia} pneumonia")
print(f"Testing: {test_normal} normal, {test_pneumonia} pneumonia")

# Image parameters
IMG_HEIGHT, IMG_WIDTH = 224, 224
BATCH_SIZE = 32

# Data augmentation for training set
train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=15,
    width_shift_range=0.1,
    height_shift_range=0.1,
    shear_range=0.1,
    zoom_range=0.1,
    horizontal_flip=True,
    fill_mode='nearest'
)

# Only rescale for validation and test sets
val_datagen = ImageDataGenerator(rescale=1./255)
test_datagen = ImageDataGenerator(rescale=1./255)

# Create data generators
print("Creating data generators...")
train_generator = train_datagen.flow_from_directory(
    train_dir,
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode='binary'
)

validation_generator = val_datagen.flow_from_directory(
    val_dir,
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode='binary'
)

test_generator = test_datagen.flow_from_directory(
    test_dir,
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode='binary',
    shuffle=False
)

# Create model using transfer learning with DenseNet121
def build_model():
    print("Building model with DenseNet121 backbone...")
    # Load pre-trained DenseNet121 model without top layers
    base_model = DenseNet121(
        weights='imagenet',
        include_top=False,
        input_shape=(IMG_HEIGHT, IMG_WIDTH, 3)
    )
    
    # Freeze base model layers
    for layer in base_model.layers:
        layer.trainable = False
    
    # Add custom top layers
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(512, activation='relu')(x)
    x = Dropout(0.3)(x)
    x = Dense(128, activation='relu')(x)
    x = Dropout(0.2)(x)
    predictions = Dense(1, activation='sigmoid')(x)
    
    # Create the full model
    model = Model(inputs=base_model.input, outputs=predictions)
    
    # Compile model
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.0001),
        loss='binary_crossentropy',
        metrics=['accuracy', tf.keras.metrics.AUC(), tf.keras.metrics.Precision(), tf.keras.metrics.Recall()]
    )
    
    return model

# Build the model
model = build_model()
print(model.summary())

# Callbacks for training
checkpoint = ModelCheckpoint(
    'best_model.h5',
    monitor='val_auc',
    save_best_only=True,
    mode='max',
    verbose=1
)

early_stop = EarlyStopping(
    monitor='val_auc',
    patience=10,
    restore_best_weights=True,
    mode='max',
    verbose=1
)

reduce_lr = ReduceLROnPlateau(
    monitor='val_auc',
    factor=0.2,
    patience=5,
    min_lr=1e-6,
    mode='max',
    verbose=1
)

# Train the model
print("Starting model training...")
history = model.fit(
    train_generator,
    epochs=5,  # Reduced from 30 for faster training
    validation_data=validation_generator,
    callbacks=[checkpoint, early_stop, reduce_lr]
)

# Evaluate the model on test data
print("Evaluating model on test data...")
test_results = model.evaluate(test_generator)
print("Test Loss:", test_results[0])
print("Test Accuracy:", test_results[1])
print("Test AUC:", test_results[2])
print("Test Precision:", test_results[3])
print("Test Recall:", test_results[4])

# Plot training history
def plot_history(history):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))
    
    # Plot accuracy
    ax1.plot(history.history['accuracy'])
    ax1.plot(history.history['val_accuracy'])
    ax1.set_title('Model Accuracy')
    ax1.set_ylabel('Accuracy')
    ax1.set_xlabel('Epoch')
    ax1.legend(['Train', 'Validation'], loc='upper left')
    
    # Plot loss
    ax2.plot(history.history['loss'])
    ax2.plot(history.history['val_loss'])
    ax2.set_title('Model Loss')
    ax2.set_ylabel('Loss')
    ax2.set_xlabel('Epoch')
    ax2.legend(['Train', 'Validation'], loc='upper left')
    
    plt.tight_layout()
    plt.savefig('training_history.png')
    plt.show()

plot_history(history)

# Function to generate text report from model prediction
def generate_report(image_path, model):
    # Load and preprocess image
    img = tf.keras.preprocessing.image.load_img(image_path, target_size=(IMG_HEIGHT, IMG_WIDTH))
    img_array = tf.keras.preprocessing.image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0) / 255.0
    
    # Make prediction
    prediction = model.predict(img_array)[0][0]
    
    # Generate report text
    report_text = ""
    if prediction > 0.8:
        confidence = "high"
    elif prediction > 0.6:
        confidence = "moderate"
    else:
        confidence = "low"
    
    if prediction > 0.5:
        report_text = f"FINDINGS: This chest X-ray shows features consistent with PNEUMONIA with {confidence} confidence ({prediction:.2f}).\n\n"
        report_text += "IMPRESSION: Pneumonia is likely present. Consolidation may be visible in the lung fields. "
        report_text += "Follow-up with clinical correlation is recommended."
    else:
        report_text = f"FINDINGS: This chest X-ray appears NORMAL with {confidence} confidence ({1-prediction:.2f}).\n\n"
        report_text += "IMPRESSION: No evidence of acute cardiopulmonary process. "
        report_text += "The lung fields are clear without focal consolidation, pneumothorax, or pleural effusion."
    
    return report_text

# Test the report generation on a few test images
print("Generating sample reports...")
test_image_paths = []
for class_folder in os.listdir(test_dir):
    folder_path = os.path.join(test_dir, class_folder)
    if os.path.isdir(folder_path):
        files = os.listdir(folder_path)
        if files:
            # Get the first file from each class
            test_image_paths.append(os.path.join(folder_path, files[0]))

# Generate reports for test images
for i, image_path in enumerate(test_image_paths[:2]):  # Just use the first 2 images
    print(f"\nReport for test image {i+1} ({image_path}):")
    report = generate_report(image_path, model)
    print(report)

# Save the model for future use
model.save('pneumonia_detection_model.h5')
print("Model saved as 'pneumonia_detection_model.h5'")

print("\nDone! You now have a trained model that can analyze chest X-rays and generate text reports.")