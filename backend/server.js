const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ── MySQL DB Config ───────────────────────────────────────────────
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "your_mysql_password",
  database: process.env.DB_NAME || "driver_log_db",
  port: process.env.DB_PORT || 3306,
};

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key_change_this";

// ── Test DB connection on startup ─────────────────────────────────
async function testDB() {
  try {
    const conn = await mysql.createConnection(dbConfig);
    await conn.query("SELECT 1");
    await conn.end();
    console.log("✅ MySQL connected successfully");
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
  }
}

// ── MIDDLEWARE: Verify JWT Token ──────────────────────────────────
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>
  if (!token)
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token." });
  }
}

// ═══════════════════════════════════════════════════════════════════
//  USER ROUTES
// ═══════════════════════════════════════════════════════════════════

// ── POST /api/auth/register ───────────────────────────────────────
app.post("/api/auth/register", async (req, res) => {
  const { full_name, username, email, password } = req.body;

  if (!full_name || !username || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters." });
  }

  try {
    const conn = await mysql.createConnection(dbConfig);

    // Check if email or username already exists
    const [existing] = await conn.execute(
      "SELECT ID FROM USERS WHERE EMAIL = ? OR USERNAME = ?",
      [email.toLowerCase(), username.toLowerCase()],
    );

    if (existing.length > 0) {
      await conn.end();
      return res
        .status(409)
        .json({ message: "Email or username already exists." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await conn.execute(
      "INSERT INTO USERS (FULL_NAME, USERNAME, EMAIL, PASSWORD) VALUES (?, ?, ?, ?)",
      [
        full_name.trim(),
        username.trim().toLowerCase(),
        email.trim().toLowerCase(),
        hashedPassword,
      ],
    );

    await conn.end();
    res
      .status(201)
      .json({ message: "User registered successfully!", id: result.insertId });
  } catch (err) {
    console.error("❌ Register error:", err.message);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  const { identifier, password } = req.body;
  // identifier = email OR username

  if (!identifier || !password) {
    return res
      .status(400)
      .json({ message: "Email/username and password are required." });
  }

  try {
    const conn = await mysql.createConnection(dbConfig);

    // Find user by email or username
    const [users] = await conn.execute(
      "SELECT * FROM USERS WHERE EMAIL = ? OR USERNAME = ?",
      [identifier.toLowerCase(), identifier.toLowerCase()],
    );

    await conn.end();

    if (users.length === 0) {
      return res
        .status(401)
        .json({ message: "Invalid email/username or password." });
    }

    const user = users[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.PASSWORD);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Invalid email/username or password." });
    }

    // Generate JWT token (expires in 6h)
    const token = jwt.sign(
      { id: user.ID, email: user.EMAIL, username: user.USERNAME },
      JWT_SECRET,
      { expiresIn: "6h" },
    );

    res.json({
      message: "Login successful!",
      token,
      user: {
        id: user.ID,
        full_name: user.FULL_NAME,
        username: user.USERNAME,
        email: user.EMAIL,
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────
// Get logged in user info (protected route)
app.get("/api/auth/me", verifyToken, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [users] = await conn.execute(
      "SELECT ID, FULL_NAME, USERNAME, EMAIL, CREATED_AT FROM USERS WHERE ID = ?",
      [req.user.id],
    );
    await conn.end();
    console.log("usressss", users);
    if (users.length === 0)
      return res.status(404).json({ message: "User not found." });
    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  DRIVER LOG ROUTES
// ═══════════════════════════════════════════════════════════════════

// ── POST /api/driver-log ──────────────────────────────────────────
app.post("/api/driver-log", verifyToken, async (req, res) => {
  const {
    driver_name,
    purpose,
    vehicle_type,
    vehicle_number,
    in_time,
    out_time,
    time_difference,
    in_km,
    out_km,
    km_difference,
  } = req.body;

  if (
    !driver_name ||
    !purpose ||
    !vehicle_type ||
    !vehicle_number ||
    !in_time ||
    !out_time ||
    in_km == null ||
    out_km == null
  ) {
    return res
      .status(400)
      .json({ message: "All required fields must be provided." });
  }

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [result] = await conn.execute(
      `INSERT INTO DRIVER_LOG
        (DRIVER_NAME, PURPOSE, VEHICLE_TYPE, VEHICLE_NUMBER, IN_TIME, OUT_TIME, TIME_DIFFERENCE, IN_KM, OUT_KM, KM_DIFFERENCE)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        driver_name.trim(),
        purpose.trim(),
        vehicle_type,
        vehicle_number.trim().toUpperCase(),
        new Date(in_time),
        new Date(out_time),
        time_difference || null,
        parseFloat(in_km),
        parseFloat(out_km),
        km_difference != null
          ? parseFloat(km_difference)
          : parseFloat((out_km - in_km).toFixed(1)),
      ],
    );
    await conn.end();
    res
      .status(201)
      .json({ message: "Driver log saved successfully!", id: result.insertId });
  } catch (err) {
    console.error("❌ Insert error:", err.message);
    res.status(500).json({ message: "Database error: " + err.message });
  }
});

// ── GET /api/driver-log ───────────────────────────────────────────
app.get("/api/driver-log", verifyToken, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      "SELECT * FROM DRIVER_LOG ORDER BY CREATED_AT DESC LIMIT 100",
    );
    await conn.end();
    res.json(rows);
  } catch (err) {
    console.error("❌ Fetch error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
testDB().then(() => {
  app.listen(PORT, () =>
    console.log(`🚀 Server running on http://localhost:${PORT}`),
  );
});
