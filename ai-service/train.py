import tensorflow as tf
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import matplotlib.pyplot as plt
import numpy as np

# --- 1. SETUP & CONFIGURATION ---
# Define the size of our images and the path to our dataset
IMG_HEIGHT = 224
IMG_WIDTH = 224
BATCH_SIZE = 32 # How many images to process at a time
DATA_DIR = 'dataset'

print("--- Step 1: Loading and Preparing Data ---")
# Use ImageDataGenerator to load images and apply data augmentation
# Data augmentation creates new training examples by transforming the images
# (e.g., rotating, flipping) to make our model more robust.
train_datagen = ImageDataGenerator(
    rescale=1./255,           # Normalize pixel values to be between 0 and 1
    rotation_range=20,        # Randomly rotate images
    width_shift_range=0.2,    # Randomly shift images horizontally
    height_shift_range=0.2,   # Randomly shift images vertically
    horizontal_flip=True,     # Randomly flip images horizontally
    validation_split=0.2      # Use 20% of the data for validation (testing)
)

# Load training data from the 'dataset' directory
train_generator = train_datagen.flow_from_directory(
    DATA_DIR,
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode='categorical', # We are classifying into categories (High, Medium, Low)
    subset='training'         # Specify this is the training set
)

# Load validation data (the 20% we set aside)
validation_generator = train_datagen.flow_from_directory(
    DATA_DIR,
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='validation'       # Specify this is the validation set
)

# Get the class names (High, Low, Medium) from the generator
class_names = list(train_generator.class_indices.keys())
print(f"Found {len(class_names)} classes: {class_names}")

# --- 2. BUILD THE MODEL WITH TRANSFER LEARNING ---
print("\n--- Step 2: Building Model with Transfer Learning ---")
# Load the pre-trained MobileNetV2 model, without its final classification layer
base_model = tf.keras.applications.MobileNetV2(
    input_shape=(IMG_WIDTH, IMG_HEIGHT, 3),
    include_top=False, # This is the key: we want to provide our own final layer
    weights='imagenet' # Use weights pre-trained on the massive ImageNet dataset
)

# Freeze the layers of the base model so they don't get retrained
# We are only training our new, final layers.
base_model.trainable = False

# Create our new custom layers on top of the pre-trained base
x = base_model.output
x = GlobalAveragePooling2D()(x) # A layer to flatten the features
# The final Dense layer is our "brain" for the classification.
# The number of units must match the number of classes we have.
predictions = Dense(len(class_names), activation='softmax')(x) 

# Combine the base model and our new layers into the final model
model = Model(inputs=base_model.input, outputs=predictions)

# Compile the model, specifying the optimizer and loss function
model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

print("Model built successfully!")
model.summary()


# --- 3. TRAIN THE MODEL ---
print("\n--- Step 3: Starting Model Training ---")
# This is where the learning happens. We'll train for 10 epochs (cycles).
# For a real project, you might train for more, but 10 is great for a hackathon.
EPOCHS = 10

history = model.fit(
    train_generator,
    epochs=EPOCHS,
    validation_data=validation_generator
)

# --- 4. SAVE THE TRAINED MODEL ---
print("\n--- Step 4: Saving the Trained Model ---")
# Save the final model to a single file. This file IS your trained AI.
model.save('civic_issue_classifier.h5')
print("Model saved successfully as 'civic_issue_classifier.h5'")


# --- 5. VISUALIZE TRAINING (Optional but good for presentations) ---
acc = history.history['accuracy']
val_acc = history.history['val_accuracy']
loss = history.history['loss']
val_loss = history.history['val_loss']

epochs_range = range(EPOCHS)

plt.figure(figsize=(8, 8))
plt.subplot(1, 2, 1)
plt.plot(epochs_range, acc, label='Training Accuracy')
plt.plot(epochs_range, val_acc, label='Validation Accuracy')
plt.legend(loc='lower right')
plt.title('Training and Validation Accuracy')

plt.subplot(1, 2, 2)
plt.plot(epochs_range, loss, label='Training Loss')
plt.plot(epochs_range, val_loss, label='Validation Loss')
plt.legend(loc='upper right')
plt.title('Training and Validation Loss')

# Save the plot to an image file
plt.savefig('training_history.png')
print("Training history plot saved as 'training_history.png'")