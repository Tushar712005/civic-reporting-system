require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");
const webpush = require("web-push");

const app = express();
const port = 5000;
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";

// Multer (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Postgres pool
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:Reddy@123@localhost:5432/civic_db",
});

app.use(cors());
app.use(express.json());

// Ensure uploads dir exists and serve it
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

// ============================
// Setup Socket.IO
// ============================
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // React app
    methods: ["GET", "POST", "PATCH"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("register", (mobile) => {
    if (!mobile) return;
    const room = `mobile:${mobile}`;
    socket.join(room);
    console.log(`Mobile ${mobile} joined room ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ============================
// Web Push Config
// ============================
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject =
  process.env.VAPID_SUBJECT || "mailto:admin@example.com";

webpush.setVapidDetails(vapidSubject, publicVapidKey, privateVapidKey);

// ---------------- JWT auth middleware ----------------
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// ---------------- Auth ----------------
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  try {
    const { rows } = await pool.query(
      "SELECT id, email, password_hash, department, role FROM admins WHERE email = $1",
      [email.trim()]
    );
    if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role, department: admin.department },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token, department: admin.department, role: admin.role });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- Admin creation (superadmin only) ----------------
app.post("/api/admins", authenticateToken, async (req, res) => {
  const { email, password, department, role } = req.body;
  if (req.user.role !== "superadmin")
    return res.status(403).json({ error: "Only superadmins can create admins" });

  if (!email || !password || !department || !role)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const insertQuery = `
      INSERT INTO admins (email, password_hash, department, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, department, role;
    `;
    const { rows } = await pool.query(insertQuery, [email, passwordHash, department, role]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Create admin error:", err);
    if (err.code === "23505") {
      return res.status(400).json({ error: "Admin with this email already exists" });
    }
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- Create Issue ----------------
app.post("/api/issues", upload.single("photo"), async (req, res) => {
  try {
    const { title, category, description, mobile, latitude, longitude } = req.body;
    const issueDescription = description || title;

    let aiResult = { department: category, priority: "Medium" };
    try {
      const response = await fetch("http://localhost:5001/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: issueDescription }),
      });
      if (response.ok) {
        const data = await response.json();
        aiResult.department = data.department || category;
        aiResult.priority = data.priority || "Medium";
      }
    } catch (err) {
      console.error("AI service call failed:", err);
    }

    let photoPath = null;
    if (req.file) {
      const filename = Date.now() + path.extname(req.file.originalname);
      photoPath = `/uploads/${filename}`;
      fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
    }

    const insertQuery = `
      INSERT INTO issues 
        (title, department, priority, mobile, latitude, longitude, status, "reportedAt", image_url)
      VALUES ($1,$2,$3,$4,$5,$6,'New',NOW(),$7)
      RETURNING *;
    `;
    const values = [title, aiResult.department, aiResult.priority, mobile, latitude, longitude, photoPath];
    const { rows } = await pool.query(insertQuery, values);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Create issue error:", err);
    res.status(500).json({ error: "Failed to create issue" });
  }
});

// ---------------- Admin: List Issues ----------------
app.get("/api/issues", authenticateToken, async (req, res) => {
  try {
    const { department, role } = req.user;
    let query = 'SELECT * FROM issues ORDER BY "reportedAt" DESC';
    const { rows } = await pool.query(query);
    const filtered = role === "superadmin" ? rows : rows.filter((r) => r.department === department);
    res.json(filtered);
  } catch (err) {
    console.error("Error fetching issues:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- Admin: Update Issue Status ----------------
app.patch("/api/issues/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updateQuery = `UPDATE issues SET status = $1 WHERE id = $2 RETURNING *;`;
    const { rows } = await pool.query(updateQuery, [status, id]);
    if (!rows.length) return res.status(404).json({ error: "Issue not found" });

    const updatedIssue = rows[0];

    // ✅ Notify citizen in real-time (socket.io)
    io.to(`mobile:${updatedIssue.mobile}`).emit("statusUpdate", {
      id: updatedIssue.id,
      title: updatedIssue.title,
      status: updatedIssue.status,
      reportedAt: updatedIssue.reportedAt,
    });

    // ✅ Send web push if subscribed
    try {
      const subs = await pool.query(
        "SELECT subscription FROM push_subscriptions WHERE mobile = $1",
        [updatedIssue.mobile]
      );
      if (subs.rows.length) {
        const subscription = subs.rows[0].subscription;
        const payload = JSON.stringify({
          title: "Report Update",
          body: `"${updatedIssue.title}" is now ${updatedIssue.status}`,
          url: "/track",
        });
        await webpush.sendNotification(subscription, payload);
      }
    } catch (err) {
      console.error("Web Push error:", err);
    }

    res.json(updatedIssue);
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// ---------------- Citizen: Track Reports ----------------
app.get("/api/issues/track", async (req, res) => {
  try {
    const { mobile } = req.query;
    if (!mobile) return res.status(400).json({ error: "Mobile number required" });
    const query = `SELECT id, title, department, status, "reportedAt"
                   FROM issues WHERE mobile = $1 ORDER BY "reportedAt" DESC`;
    const { rows } = await pool.query(query, [mobile]);

    const transformed = rows.map((r) => ({
      ...r,
      status: r.status === "New" ? "Pending" : r.status,
    }));

    res.json(transformed);
  } catch (err) {
    console.error("Track reports error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- Feedback Endpoints ----------------
// Create Feedback
app.post("/api/feedback", async (req, res) => {
  try {
    const { reportId, message } = req.body;
    if (!reportId || !message) {
      return res.status(400).json({ error: "reportId and message required" });
    }

    const insertQuery = `
      INSERT INTO feedback (report_id, message, created_at)
      VALUES ($1, $2, NOW())
      RETURNING *;
    `;
    const { rows } = await pool.query(insertQuery, [reportId, message]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Create feedback error:", err);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

// Get Feedback for a Report
app.get("/api/feedback/:reportId", async (req, res) => {
  try {
    const { reportId } = req.params;
    const { rows } = await pool.query(
      `SELECT * FROM feedback WHERE report_id = $1 ORDER BY created_at DESC`,
      [reportId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Fetch feedback error:", err);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

// ---------------- Web Push Endpoints ----------------
app.get("/api/vapidPublicKey", (req, res) => {
  res.send(publicVapidKey);
});

app.post("/api/subscribe", async (req, res) => {
  try {
    const { mobile, subscription } = req.body;
    if (!mobile || !subscription) {
      return res.status(400).json({ error: "mobile & subscription required" });
    }
    await pool.query(
      `INSERT INTO push_subscriptions (mobile, subscription)
       VALUES ($1, $2)
       ON CONFLICT (mobile) DO UPDATE SET subscription = EXCLUDED.subscription, created_at = NOW()`,
      [mobile, subscription]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("Subscribe error:", err);
    res.status(500).json({ error: "Failed to subscribe" });
  }
});

// ---------------- Start Server ----------------
server.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
