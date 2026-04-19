const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const xlsx = require("xlsx");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors({ origin: "*", credentials: false }));
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ── DB Config ─────────────────────────────────────────────────────
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "your_mysql_password",
  database: process.env.DB_NAME || "driver_log_db",
  port: process.env.DB_PORT || 3306,
};
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key_change_this";
const JWT_EXPIRES = "6h";

async function db(fn) {
  const conn = await mysql.createConnection(dbConfig);
  try {
    return await fn(conn);
  } finally {
    await conn.end();
  }
}

async function testDB() {
  try {
    await db((c) => c.query("SELECT 1"));
    console.log("✅ MySQL connected");
  } catch (err) {
    console.error("❌ MySQL failed:", err.message);
  }
}

// ── Auth middleware ────────────────────────────────────────────────
function verifyToken(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided." });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token." });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin")
    return res.status(403).json({ message: "Admin access required." });
  next();
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// ════════════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ════════════════════════════════════════════════════════════════════

// Register (creates driver, role='driver' always)
app.post("/api/auth/register", async (req, res) => {
  const { full_name, username, email, password } = req.body;
  if (!full_name || !username || !email || !password)
    return res.status(400).json({ message: "All fields are required." });
  if (password.length < 6)
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters." });
  try {
    const result = await db(async (conn) => {
      const [existing] = await conn.execute(
        "SELECT ID FROM USERS WHERE EMAIL = ? OR USERNAME = ?",
        [email.toLowerCase(), username.toLowerCase()],
      );
      if (existing.length > 0)
        throw { status: 409, message: "Email or username already exists." };
      const hashed = await bcrypt.hash(password, 10);
      const [r] = await conn.execute(
        "INSERT INTO USERS (FULL_NAME, USERNAME, EMAIL, PASSWORD, ROLE, STATUS) VALUES (?, ?, ?, ?, 'driver', 'active')",
        [
          full_name.trim(),
          username.trim().toLowerCase(),
          email.trim().toLowerCase(),
          hashed,
        ],
      );
      return r;
    });
    res.status(201).json({ message: "Account created!", id: result.insertId });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res
      .status(400)
      .json({ message: "Email/username and password are required." });
  }

  try {
    const users = await db(async (conn) => {
      const [rows] = await conn.execute(
        "SELECT * FROM USERS WHERE LOWER(USERNAME) = ? OR LOWER(EMAIL) = ? LIMIT 1",
        [identifier.toLowerCase(), identifier.toLowerCase()],
      );
      return rows;
    });

    console.log("👉 DB rows:", users);

    if (users.length === 0) {
      console.log("❌ No user found");
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const user = users[0];

    console.log("👉 Stored password:", user.PASSWORD);

    // 🔥 IMPORTANT: detect plain text vs hashed
    let isMatch = false;

    if (user.PASSWORD.startsWith("$2a$") || user.PASSWORD.startsWith("$2b$")) {
      // bcrypt hash
      isMatch = await bcrypt.compare(password, user.PASSWORD);
    } else {
      // plain text (fallback for old data)
      isMatch = password === user.PASSWORD;
    }

    console.log("👉 Password match:", isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    if ((user.STATUS || "active").toLowerCase() === "inactive") {
      return res.status(403).json({
        message: "Your account is inactive.",
      });
    }

    const token = jwt.sign(
      {
        id: user.ID,
        email: user.EMAIL,
        username: user.USERNAME,
        role: user.ROLE || "driver",
      },
      JWT_SECRET,
      { expiresIn: "6h" },
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.ID,
        username: user.USERNAME,
        role: user.ROLE,
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
app.get("/api/auth/me", verifyToken, async (req, res) => {
  try {
    const [rows] = await db(async (conn) =>
      conn.execute(
        "SELECT ID, FULL_NAME, USERNAME, EMAIL, ROLE, CREATED_AT FROM USERS WHERE ID = ?",
        [req.user.id],
      ),
    );
    if (!rows.length)
      return res.status(404).json({ message: "User not found." });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/me
app.put("/api/auth/me", verifyToken, async (req, res) => {
  const { full_name, username, email } = req.body;
  if (!full_name || !username || !email)
    return res.status(400).json({ message: "All fields required." });
  try {
    const updatedUser = await db(async (conn) => {
      const [conflict] = await conn.execute(
        "SELECT ID FROM USERS WHERE (EMAIL = ? OR USERNAME = ?) AND ID != ?",
        [email.toLowerCase(), username.toLowerCase(), req.user.id],
      );
      if (conflict.length)
        throw { status: 409, message: "Email or username already taken." };
      await conn.execute(
        "UPDATE USERS SET FULL_NAME = ?, USERNAME = ?, EMAIL = ? WHERE ID = ?",
        [
          full_name.trim(),
          username.trim().toLowerCase(),
          email.trim().toLowerCase(),
          req.user.id,
        ],
      );
      const [rows] = await conn.execute(
        "SELECT ID, FULL_NAME, USERNAME, EMAIL, ROLE FROM USERS WHERE ID = ?",
        [req.user.id],
      );
      return rows[0];
    });
    const token = signToken({
      id: updatedUser.ID,
      email: updatedUser.EMAIL,
      username: updatedUser.USERNAME,
      role: updatedUser.ROLE,
    });
    res.json({
      message: "Profile updated!",
      token,
      user: {
        id: updatedUser.ID,
        full_name: updatedUser.FULL_NAME,
        username: updatedUser.USERNAME,
        email: updatedUser.EMAIL,
        role: updatedUser.ROLE,
      },
    });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/change-password
app.put("/api/auth/change-password", verifyToken, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password || new_password.length < 6)
    return res
      .status(400)
      .json({ message: "New password must be at least 6 characters." });
  try {
    await db(async (conn) => {
      const [users] = await conn.execute("SELECT * FROM USERS WHERE ID = ?", [
        req.user.id,
      ]);
      if (!users.length) throw { status: 404, message: "User not found." };
      const isMatch = await bcrypt.compare(current_password, users[0].PASSWORD);
      if (!isMatch)
        throw { status: 401, message: "Current password is incorrect." };
      const hashed = await bcrypt.hash(new_password, 10);
      await conn.execute("UPDATE USERS SET PASSWORD = ? WHERE ID = ?", [
        hashed,
        req.user.id,
      ]);
    });
    res.json({ message: "Password changed!" });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/refresh
app.post("/api/auth/refresh", verifyToken, async (req, res) => {
  try {
    const [rows] = await db(async (conn) =>
      conn.execute(
        "SELECT ID, FULL_NAME, USERNAME, EMAIL, ROLE FROM USERS WHERE ID = ?",
        [req.user.id],
      ),
    );
    if (!rows.length)
      return res.status(404).json({ message: "User not found." });
    const user = rows[0];
    const token = signToken({
      id: user.ID,
      email: user.EMAIL,
      username: user.USERNAME,
      role: user.ROLE,
    });
    res.json({ message: "Token refreshed.", token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════
//  ADMIN — DRIVER MANAGEMENT ROUTES
// ════════════════════════════════════════════════════════════════════

// GET /api/admin/drivers — list all drivers with stats
app.get("/api/admin/drivers", verifyToken, requireAdmin, async (req, res) => {
  try {
    const drivers = await db(async (conn) => {
      const [rows] = await conn.execute(`
        SELECT 
          u.ID, u.FULL_NAME, u.USERNAME, u.EMAIL, u.ROLE, u.STATUS, u.CREATED_AT,
          COUNT(dl.ID) AS TRIP_COUNT,
          COALESCE(SUM(dl.KM_DIFFERENCE), 0) AS TOTAL_KM
        FROM USERS u
        LEFT JOIN DRIVER_LOG dl ON dl.DRIVER_NAME = u.FULL_NAME
        WHERE u.ROLE = 'driver'
        GROUP BY u.ID
        ORDER BY u.CREATED_AT DESC
      `);
      return rows;
    });
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/drivers/:id — admin edits driver info
app.put(
  "/api/admin/drivers/:id",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { full_name, username, email, status } = req.body;
    try {
      await db(async (conn) => {
        const [conflict] = await conn.execute(
          "SELECT ID FROM USERS WHERE (EMAIL = ? OR USERNAME = ?) AND ID != ?",
          [email?.toLowerCase(), username?.toLowerCase(), id],
        );
        if (conflict.length)
          throw { status: 409, message: "Email or username already taken." };
        await conn.execute(
          "UPDATE USERS SET FULL_NAME = ?, USERNAME = ?, EMAIL = ?, STATUS = ? WHERE ID = ? AND ROLE = 'driver'",
          [
            full_name?.trim(),
            username?.trim().toLowerCase(),
            email?.trim().toLowerCase(),
            status || "active",
            id,
          ],
        );
      });
      res.json({ message: "Driver updated." });
    } catch (err) {
      if (err.status)
        return res.status(err.status).json({ message: err.message });
      res.status(500).json({ message: err.message });
    }
  },
);

// PATCH /api/admin/drivers/:id/status
app.patch(
  "/api/admin/drivers/:id/status",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!["active", "inactive"].includes(status))
      return res.status(400).json({ message: "Invalid status." });
    try {
      await db(async (conn) =>
        conn.execute(
          "UPDATE USERS SET STATUS = ? WHERE ID = ? AND ROLE = 'driver'",
          [status, id],
        ),
      );
      res.json({ message: `Driver marked ${status}.` });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ════════════════════════════════════════════════════════════════════
//  DRIVER LOG ROUTES
// ════════════════════════════════════════════════════════════════════

// GET /api/driver-log/stats
app.get("/api/driver-log/stats", verifyToken, async (req, res) => {
  try {
    const stats = await db(async (conn) => {
      const isAdmin = req.user.role === "admin";
      const userFilter = isAdmin ? "" : `WHERE dl.CREATED_BY = ${req.user.id}`;

      const [[{ total_logs }]] = await conn.execute(
        `SELECT COUNT(*) AS total_logs FROM DRIVER_LOG dl ${userFilter}`,
      );
      const [[{ logs_today }]] = await conn.execute(
        `SELECT COUNT(*) AS logs_today FROM DRIVER_LOG dl ${userFilter} ${userFilter ? "AND" : "WHERE"} DATE(dl.CREATED_AT) = CURDATE()`,
      );
      const [[{ total_km }]] = await conn.execute(
        `SELECT COALESCE(SUM(KM_DIFFERENCE),0) AS total_km FROM DRIVER_LOG dl ${userFilter}`,
      );
      const [[topRow]] = await conn.execute(
        `SELECT DRIVER_NAME, COUNT(*) AS cnt FROM DRIVER_LOG dl ${userFilter} GROUP BY DRIVER_NAME ORDER BY cnt DESC LIMIT 1`,
      );
      const [[{ active_drivers }]] = await conn.execute(
        "SELECT COUNT(*) AS active_drivers FROM USERS WHERE ROLE='driver' AND (STATUS IS NULL OR STATUS='active')",
      );

      return {
        total_logs,
        logs_today,
        total_km: parseFloat(total_km).toFixed(1),
        top_driver: topRow?.DRIVER_NAME || null,
        active_drivers,
      };
    });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/driver-log
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
  )
    return res.status(400).json({ message: "All fields required." });
  try {
    const result = await db(async (conn) => {
      const [r] = await conn.execute(
        `INSERT INTO DRIVER_LOG (DRIVER_NAME, PURPOSE, VEHICLE_TYPE, VEHICLE_NUMBER, IN_TIME, OUT_TIME, TIME_DIFFERENCE, IN_KM, OUT_KM, KM_DIFFERENCE, CREATED_BY)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          req.user.id,
        ],
      );
      return r;
    });
    res.status(201).json({ message: "Log saved!", id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/driver-log — admin sees all, driver sees own
app.get("/api/driver-log", verifyToken, async (req, res) => {
  try {
    const rows = await db(async (conn) => {
      const isAdmin = req.user.role === "admin";
      const [r] = isAdmin
        ? await conn.execute(
            "SELECT * FROM DRIVER_LOG ORDER BY CREATED_AT DESC LIMIT 500",
          )
        : await conn.execute(
            "SELECT * FROM DRIVER_LOG WHERE CREATED_BY = ? ORDER BY CREATED_AT DESC LIMIT 200",
            [req.user.id],
          );
      return r;
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/driver-log/:id — admin only edit
app.put("/api/driver-log/:id", verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
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
  try {
    await db(async (conn) => {
      const [existing] = await conn.execute(
        "SELECT ID FROM DRIVER_LOG WHERE ID = ?",
        [id],
      );
      if (!existing.length) throw { status: 404, message: "Log not found." };
      await conn.execute(
        `UPDATE DRIVER_LOG SET DRIVER_NAME=?, PURPOSE=?, VEHICLE_TYPE=?, VEHICLE_NUMBER=?, IN_TIME=?, OUT_TIME=?, TIME_DIFFERENCE=?, IN_KM=?, OUT_KM=?, KM_DIFFERENCE=? WHERE ID=?`,
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
          id,
        ],
      );
    });
    res.json({ message: "Log updated." });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/driver-log/:id — admin only
app.delete(
  "/api/driver-log/:id",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    const { id } = req.params;
    try {
      await db(async (conn) => {
        const [existing] = await conn.execute(
          "SELECT ID FROM DRIVER_LOG WHERE ID = ?",
          [id],
        );
        if (!existing.length) throw { status: 404, message: "Log not found." };
        await conn.execute("DELETE FROM DRIVER_LOG WHERE ID = ?", [id]);
      });
      res.json({ message: "Log deleted." });
    } catch (err) {
      if (err.status)
        return res.status(err.status).json({ message: err.message });
      res.status(500).json({ message: err.message });
    }
  },
);

// ════════════════════════════════════════════════════════════════════
//  BULK UPLOAD — Excel / CSV
// ════════════════════════════════════════════════════════════════════

const REQUIRED_BULK_COLS = [
  "driver_name",
  "purpose",
  "vehicle_type",
  "vehicle_number",
  "in_time",
  "out_time",
  "in_km",
  "out_km",
];
const VALID_VEHICLE_TYPES = ["Car", "Truck", "Van", "Bike", "Bus", "Other"];

function parseBulkFile(buffer, mimetype, originalname) {
  const ext = path.extname(originalname).toLowerCase();
  let rows = [];
  let headers = [];

  if (ext === ".csv") {
    const text = buffer.toString("utf-8");
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) throw new Error("File has no data rows.");
    headers = lines[0]
      .split(",")
      .map((h) => h.replace(/"/g, "").trim().toLowerCase());
    rows = lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.replace(/"/g, "").trim());
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = vals[i] ?? "";
      });
      return obj;
    });
  } else {
    const wb = xlsx.read(buffer, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(ws, { raw: false, defval: "" });
    if (!data.length) throw new Error("Sheet is empty.");
    headers = Object.keys(data[0]).map((h) => h.trim().toLowerCase());
    rows = data.map((row) => {
      const obj = {};
      Object.entries(row).forEach(([k, v]) => {
        obj[k.trim().toLowerCase()] = String(v).trim();
      });
      return obj;
    });
  }

  return { headers, rows };
}

function validateBulkRows(rows) {
  const validRows = [];
  const errors = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const rowErrors = [];

    REQUIRED_BULK_COLS.forEach((col) => {
      if (!row[col] || row[col].toString().trim() === "")
        rowErrors.push(`Missing '${col}'`);
    });

    if (row.vehicle_type && !VALID_VEHICLE_TYPES.includes(row.vehicle_type))
      rowErrors.push(`Invalid vehicle_type '${row.vehicle_type}'`);
    if (
      row.in_time &&
      row.out_time &&
      new Date(row.out_time) <= new Date(row.in_time)
    )
      rowErrors.push("out_time must be after in_time");
    if (
      row.in_km &&
      row.out_km &&
      parseFloat(row.out_km) < parseFloat(row.in_km)
    )
      rowErrors.push("out_km must be >= in_km");

    if (rowErrors.length) {
      errors.push({ row: rowNum, msg: rowErrors.join("; ") });
    } else {
      const inKm = parseFloat(row.in_km);
      const outKm = parseFloat(row.out_km);
      const kmDiff = parseFloat((outKm - inKm).toFixed(1));
      const inTime = new Date(row.in_time);
      const outTime = new Date(row.out_time);
      const diffMs = outTime - inTime;
      const h = Math.floor(diffMs / 3600000);
      const m = Math.floor((diffMs % 3600000) / 60000);
      validRows.push({
        ...row,
        in_km: inKm,
        out_km: outKm,
        km_difference: kmDiff,
        time_difference: `${h}h ${m}m`,
        vehicle_number: row.vehicle_number.toUpperCase(),
      });
    }
  });

  return { validRows, errors };
}

// POST /api/driver-log/bulk/preview — parse & validate file, return preview
app.post(
  "/api/driver-log/bulk/preview",
  verifyToken,
  requireAdmin,
  upload.single("file"),
  async (req, res) => {
    if (!req.file)
      return res.status(400).json({ message: "No file uploaded." });
    try {
      const { headers, rows } = parseBulkFile(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
      );
      const missingCols = REQUIRED_BULK_COLS.filter(
        (c) => !headers.includes(c),
      );
      if (missingCols.length)
        return res.status(400).json({
          message: `Missing required columns: ${missingCols.join(", ")}`,
        });
      const { validRows, errors } = validateBulkRows(rows);
      res.json({
        headers: REQUIRED_BULK_COLS,
        rows: validRows,
        errors,
        total: rows.length,
        valid: validRows.length,
      });
    } catch (err) {
      res.status(400).json({ message: "Could not parse file: " + err.message });
    }
  },
);

// POST /api/driver-log/bulk — insert confirmed rows
app.post(
  "/api/driver-log/bulk",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0)
      return res.status(400).json({ message: "No rows to insert." });
    try {
      let inserted = 0;
      await db(async (conn) => {
        for (const row of rows) {
          await conn.execute(
            `INSERT INTO DRIVER_LOG (DRIVER_NAME, PURPOSE, VEHICLE_TYPE, VEHICLE_NUMBER, IN_TIME, OUT_TIME, TIME_DIFFERENCE, IN_KM, OUT_KM, KM_DIFFERENCE, CREATED_BY)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              row.driver_name,
              row.purpose,
              row.vehicle_type,
              row.vehicle_number,
              new Date(row.in_time),
              new Date(row.out_time),
              row.time_difference,
              row.in_km,
              row.out_km,
              row.km_difference,
              req.user.id,
            ],
          );
          inserted++;
        }
      });
      res.json({
        message: `${inserted} records inserted successfully.`,
        inserted,
      });
    } catch (err) {
      res.status(500).json({ message: "Bulk insert error: " + err.message });
    }
  },
);

// ── Health ─────────────────────────────────────────────────────────
app.get("/health", (req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() }),
);

const PORT = process.env.PORT || 3001;
testDB().then(() =>
  app.listen(PORT, () =>
    console.log(`🚀 Server running on http://localhost:${PORT}`),
  ),
);
