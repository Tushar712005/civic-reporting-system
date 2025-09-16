from flask import Flask, request, jsonify
import tensorflow as tf
from PIL import Image
import numpy as np
import io

# --- 1. SETUP & INITIALIZATION ---
# Initialize the Flask application
app = Flask(__name__)

# Load our trained AI model
try:
    model = tf.keras.models.load_model('civic_issue_classifier.h5')
    print("AI model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# Define the image dimensions our model expects
IMG_HEIGHT = 224
IMG_WIDTH = 224
# Define the class names in the same order the model was trained
# (You can see this order in your previous terminal output: ['High', 'Low', 'Medium'])
CLASS_NAMES = ['High', 'Low', 'Medium'] 


# --- 2. IMAGE PREPROCESSING FUNCTION ---
# This function takes an uploaded image and prepares it for the model
def preprocess_image(image_bytes):
    # Open the image from the raw bytes
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    # Resize it to the required 224x224 pixels
    img = img.resize((IMG_WIDTH, IMG_HEIGHT))
    # Convert the image to a NumPy array of numbers
    img_array = np.array(img)
    # Normalize the pixel values (from 0-255 to 0-1)
    img_array = img_array / 255.0
    # Add an extra dimension because the model expects a "batch" of images
    img_array = np.expand_dims(img_array, axis=0)
    return img_array


# --- 3. CREATE THE PREDICTION API ENDPOINT ---
@app.route('/predict', methods=['POST'])
def predict():
    # Check if a model was loaded successfully
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
        
    # Check if a file was included in the request
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    # Check if the user selected a file
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        # Read the image file as bytes
        image_bytes = file.read()
        
        # Preprocess the image for our model
        processed_image = preprocess_image(image_bytes)
        
        # Get the AI's prediction
        prediction = model.predict(processed_image)
        
        # Find the class with the highest probability
        predicted_class_index = np.argmax(prediction)
        predicted_class_name = CLASS_NAMES[predicted_class_index]
        
        print(f"Prediction successful. Result: {predicted_class_name}")

        # Return the prediction as a JSON response
        return jsonify({'priority': predicted_class_name})

    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({'error': 'Error processing image'}), 500


# --- 4. RUN THE FLASK SERVER ---
if __name__ == '__main__':
    # We'll run this on port 5001 to avoid conflicts with our Node.js server
    app.run(debug=True, port=5001)