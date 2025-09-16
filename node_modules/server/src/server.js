const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// --- NEW: Import libraries for making requests to the AI service ---
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const port = 5000;
const JWT_SECRET = 'your-super-secret-key-that-should-be-in-an-env-file';

// --- Multer Configuration (changed to in-memory storage) ---
// We'll temporarily hold the file in memory to send it to the AI service
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Database Connection ---
const pool = new Pool({
  // IMPORTANT: Remember to replace 'password' with your actual PostgreSQL password
  connectionString: 'postgresql://postgres:123@localhost:5432/civic_db',
});

app.use(cors());
app.use(express.json());
// Note: We no longer need to serve the uploads folder statically

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
  // ... existing code, no changes needed ...
};

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => { /* ... existing code ... */ });
app.post('/api/auth/login', async (req, res) => { /* ... existing code ... */ });

// --- HEAVILY UPDATED Public Issue Submission Route ---
app.post('/api/issues', upload.single('photo'), async (req, res) => {
  const { title, category, latitude, longitude } = req.body;

  let department;
  switch (category) {
    case 'pothole': department = 'Public Works Department'; break;
    // ... other cases ...
    default: department = 'General Administration';
  }

  let imageUrl = null;
  let priority = 'Medium'; // Default priority

  // --- NEW: AI Prediction Logic ---
  if (req.file) {
    try {
      // 1. Send the image to the Python AI service for priority prediction
      const formData = new FormData();
      formData.append('file', req.file.buffer, { filename: req.file.originalname });
      
      const aiResponse = await axios.post('http://localhost:5001/predict', formData, {
        headers: formData.getHeaders(),
      });
      
      priority = aiResponse.data.priority; // Get the priority from the AI
      console.log(`AI Service predicted priority: ${priority}`);

      // 2. If prediction is successful, then upload the image to storage (local in this case)
      // This part is now manual instead of using multer's diskStorage
      const uniqueFilename = Date.now() + '-' + req.file.originalname;
      const imagePath = path.join(__dirname, '../uploads', uniqueFilename);
      fs.writeFileSync(imagePath, req.file.buffer);
      imageUrl = `${req.protocol}://${req.get('host')}/uploads/${uniqueFilename}`;

    } catch (err) {
      console.error('Error during AI prediction or file handling:', err.message);
      // If the AI fails, we can proceed with a default priority
      priority = 'Medium';
    }
  }

  try {
    // --- NEW: Add the 'priority' column to the INSERT query ---
    const newIssueQuery = 'INSERT INTO issues (title, status, "reportedAt", latitude, longitude, image_url, department, priority) VALUES ($1, \'New\', NOW(), $2, $3, $4, $5, $6) RETURNING *;';
    const { rows } = await pool.query(newIssueQuery, [title, latitude, longitude, imageUrl, department, priority]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error inserting new issue into database:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// --- Protected Admin Routes (No changes needed) ---
app.get('/api/issues', authenticateToken, async (req, res) => { /* ... */ });
app.patch('/api/issues/:id', authenticateToken, async (req, res) => { /* ... */ });


app.listen(port, () => {
  console.log(`Server is running successfully on http://localhost:${port}`);
});