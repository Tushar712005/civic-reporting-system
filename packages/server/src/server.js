// server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const FormData = require('form-data');
const { Parser } = require('json2csv');

const app = express();
const port = 5000;
const JWT_SECRET = 'your-super-secret-key-that-should-be-in-an-env-file';

// Multer (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Postgres pool — change connectionString if needed
const pool = new Pool({
  connectionString: 'postgresql://postgres:123@localhost:5432/civic_db',
});

app.use(cors());
app.use(express.json());

// Ensure uploads dir exists and serve it
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Simple JWT auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Helper to map category input to canonical department
function categoryToDepartment(category) {
  const s = (category || '').toString().toLowerCase().trim();
  if (['road', 'roads', 'pothole', 'potholes', 'road issue', 'road_issue'].includes(s)) {
    return 'Public Works Department';
  }
  if (['electricity', 'electric', 'streetlight', 'street lights', 'street_light'].includes(s)) {
    return 'Electricity Department';
  }
  if (['sanitation', 'garbage', 'waste', 'waste management'].includes(s)) {
    return 'Sanitation Department';
  }
  if (['water', 'water supply', 'leak', 'leakage'].includes(s)) {
    return 'Water Supply Department';
  }
  if (['general', 'other', 'misc', 'miscellaneous'].includes(s)) {
    return 'General Administration';
  }
  // fallback: if it's already a department-like string, return title-case-ish
  return category || 'General Administration';
}

// ---------------- Auth & Admin creation ----------------

// Public register: only allowed when there are zero admins (first-time setup).
// After the first admin exists, use the protected /api/admins route (Super Admin).
app.post('/api/auth/register', async (req, res) => {
  const { email, password, department } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS c FROM admins;');
    const adminCount = parseInt(countRows[0].c, 10);

    if (adminCount > 0) {
      return res.status(403).json({ error: 'Registration disabled. Use Super Admin to create accounts.' });
    }

    const dept = categoryToDepartment(department || 'ALL'); // for first admin you can set department 'ALL'
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const insert = 'INSERT INTO admins (email, password_hash, department) VALUES ($1, $2, $3) RETURNING id, email, department;';
    const { rows } = await pool.query(insert, [email, passwordHash, dept]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Protected route for Super Admin to create admins
app.post('/api/admins', authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.department !== 'ALL') {
      return res.status(403).json({ error: 'Only Super Admin can create admins' });
    }

    const { email, password, department } = req.body;
    if (!email || !password || !department) {
      return res.status(400).json({ error: 'Email, password, and department are required' });
    }

    const dept = categoryToDepartment(department);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const insert = 'INSERT INTO admins (email, password_hash, department) VALUES ($1, $2, $3) RETURNING id, email, department;';
    const { rows } = await pool.query(insert, [email, passwordHash, dept]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create admin error:', err);
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM admins WHERE email = $1;', [email]);
    if (rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, department: user.department }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, department: user.department });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ---------------- Issues API ----------------

// Create issue (public PWA)
app.post('/api/issues', upload.single('photo'), async (req, res) => {
  try {
    const { title, category, latitude, longitude, mobile } = req.body;
    const department = categoryToDepartment(category);

    let imageUrl = null;
    let priority = 'Medium';

    if (req.file) {
      // Try AI service to get priority
      try {
        const formData = new FormData();
        formData.append('file', req.file.buffer, { filename: req.file.originalname });

        const aiRes = await axios.post('http://127.0.0.1:5001/predict', formData, {
          headers: formData.getHeaders(),
          timeout: 15000,
        });
        if (aiRes && aiRes.data && aiRes.data.priority) priority = aiRes.data.priority;
      } catch (err) {
        console.warn('AI service unavailable or failed, using default priority. Error:', err.message || err);
        priority = 'Medium';
      }

      // Save image to uploads
      try {
        const uniqueFilename = Date.now() + '-' + req.file.originalname;
        const imagePath = path.join(uploadsDir, uniqueFilename);
        fs.writeFileSync(imagePath, req.file.buffer);
        imageUrl = `${req.protocol}://${req.get('host')}/uploads/${uniqueFilename}`;
      } catch (fsErr) {
        console.error('Failed to save uploaded file:', fsErr);
      }
    }

    const insert = `INSERT INTO issues 
      (title, status, "reportedAt", latitude, longitude, image_url, department, priority, mobile) 
      VALUES ($1, 'New', NOW(), $2, $3, $4, $5, $6, $7) RETURNING *;`;
    const { rows } = await pool.query(insert, [title, latitude, longitude, imageUrl, department, priority, mobile]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Insert issue error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get issues (admin protected, filtered by department unless Super Admin)
app.get('/api/issues', authenticateToken, async (req, res) => {
  try {
    const { department } = req.user;
    let query = 'SELECT * FROM issues ORDER BY "reportedAt" DESC';
    let params = [];
    if (department && department !== 'ALL') {
      query = 'SELECT * FROM issues WHERE department = $1 ORDER BY "reportedAt" DESC';
      params = [department];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching issues:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update status (and set resolvedAt when resolved)
app.patch('/api/issues/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    let query, params;
    if (status === 'Resolved') {
      query = 'UPDATE issues SET status = $1, "resolvedAt" = NOW() WHERE id = $2 RETURNING *;';
      params = [status, id];
    } else {
      query = 'UPDATE issues SET status = $1 WHERE id = $2 RETURNING *;';
      params = [status, id];
    }

    const { rows } = await pool.query(query, params);
    if (rows.length === 0) return res.status(404).json({ error: 'Issue not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating issue:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Track by mobile (public)
app.get('/api/issues/by-mobile/:mobile', async (req, res) => {
  try {
    const { mobile } = req.params;
    const { rows } = await pool.query('SELECT * FROM issues WHERE mobile = $1 ORDER BY "reportedAt" DESC', [mobile]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching issues by mobile:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ---------------- Analytics (Super Admin only) ----------------

// Basic aggregated analytics
app.get('/api/analytics/reports', authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.department !== 'ALL') return res.status(403).json({ error: 'Access denied' });

    const query = `
      SELECT 
        COUNT(*) as total_reports,
        COUNT(*) FILTER (WHERE status = 'Resolved') as resolved_reports,
        AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "reportedAt")) / 3600) as avg_resolution_hours
      FROM issues;
    `;
    const { rows } = await pool.query(query);
    res.json(rows[0] || {});
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// CSV download of issues (Super Admin only)
app.get('/api/analytics/reports/download', authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.department !== 'ALL') return res.status(403).json({ error: 'Access denied' });

    const query = `SELECT id, title, status, department, priority, mobile, "reportedAt", "resolvedAt" FROM issues ORDER BY "reportedAt" DESC;`;
    const { rows } = await pool.query(query);

    const parser = new Parser();
    const csv = parser.parse(rows || []);

    res.header('Content-Type', 'text/csv');
    res.attachment('reports.csv');
    return res.send(csv);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
