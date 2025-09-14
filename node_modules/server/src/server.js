const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = 5000;
const JWT_SECRET = 'your-super-secret-key-that-should-be-in-an-env-file'; // Use a more secure secret in production

// --- Multer and File System Setup ---
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// --- Database Connection ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123@localhost:5432/civic_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Authentication Routes ---

// Register a new admin
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUserQuery = 'INSERT INTO admins (email, password_hash) VALUES ($1, $2) RETURNING id, email;';
    const { rows } = await pool.query(newUserQuery, [email, passwordHash]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Login an admin
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  // --- NEW DEBUGGING LOGS ---
  console.log(`\n--- Login Attempt Received ---`);
  console.log(`Email: ${email}`);
  
  try {
    const userQuery = 'SELECT * FROM admins WHERE email = $1;';
    const { rows } = await pool.query(userQuery, [email]);

    if (rows.length === 0) {
      console.log('Result: User not found in database.');
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];
    console.log('Result: Found user in database with ID:', user.id);

    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log(`Result: Password comparison returned: ${isMatch}`);

    if (!isMatch) {
      console.log('Action: Passwords do not match. Denying access.');
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    console.log('Action: Passwords match. Generating token.');
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    console.log('Action: Token generated successfully.');
    console.log(`------------------------------`);

    res.json({ token });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// --- Protected Issue Routes ---

// GET /api/issues
app.get('/api/issues', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM issues ORDER BY "reportedAt" DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/issues
app.post('/api/issues',  upload.single('photo'), async (req, res) => {
  const { title, latitude, longitude } = req.body;
  let imageUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null;
  try {
    const newIssueQuery = 'INSERT INTO issues (title, status, "reportedAt", latitude, longitude, image_url) VALUES ($1, \'New\', NOW(), $2, $3, $4) RETURNING *;';
    const { rows } = await pool.query(newIssueQuery, [title, latitude, longitude, imageUrl]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/issues/:id
app.patch('/api/issues/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const updateQuery = 'UPDATE issues SET status = $1 WHERE id = $2 RETURNING *;';
    const { rows } = await pool.query(updateQuery, [status, id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Issue not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.listen(port, () => {
  console.log(`Server is running successfully on http://localhost:${port}`);
});

