# 🚗 Driver Log App — Fleet Management

A full-stack fleet management app with React frontend + Express backend + Oracle DB.

---

## 📁 Project Structure

```
driver-log-app/
├── frontend/          ← React app
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   └── .env.example
├── backend/           ← Express + Oracle
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── database/
    └── setup.sql      ← Run this first in Oracle
```

---

## ⚙️ Setup Guide

### Step 1 — Oracle Database

1. Open **SQL*Plus** or **SQL Developer**
2. Run `database/setup.sql` to create the `DRIVER_LOG` table

### Step 2 — Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your Oracle credentials
npm install
npm start
# Server runs on http://localhost:3001
```

#### Backend `.env`
```
DB_USER=your_oracle_username
DB_PASSWORD=your_oracle_password
DB_CONNECT_STRING=localhost:1521/XEPDB1
PORT=3001
```

> **Oracle Instant Client**: `oracledb` requires Oracle Instant Client.
> Download from: https://www.oracle.com/database/technologies/instant-client.html

### Step 3 — Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm start
# App runs on http://localhost:3000
```

---

## 🗃️ Database Table

| Column           | Type           | Description                    |
|------------------|----------------|--------------------------------|
| ID               | NUMBER (PK)    | Auto-generated ID              |
| DRIVER_NAME      | VARCHAR2(200)  | Driver's full name             |
| PURPOSE          | VARCHAR2(500)  | Trip purpose                   |
| VEHICLE_TYPE     | VARCHAR2(100)  | Car / Truck / Van / Bike / Bus |
| IN_TIME          | TIMESTAMP      | Trip start time                |
| OUT_TIME         | TIMESTAMP      | Trip end time                  |
| TIME_DIFFERENCE  | VARCHAR2(50)   | e.g. "2h 30m"                  |
| IN_KM            | NUMBER(10,2)   | Starting odometer reading      |
| OUT_KM           | NUMBER(10,2)   | Ending odometer reading        |
| KM_DIFFERENCE    | NUMBER(10,2)   | Distance travelled             |
| CREATED_AT       | TIMESTAMP      | Record creation time           |

---

## 🔌 API Endpoints

### POST `/api/driver-log`
Save a new driver log entry.

**Body:**
```json
{
  "driver_name": "Raj Patel",
  "purpose": "Client Visit",
  "vehicle_type": "Car",
  "in_time": "2026-04-12T09:00",
  "out_time": "2026-04-12T11:30",
  "time_difference": "2h 30m",
  "in_km": 15200,
  "out_km": 15350,
  "km_difference": 150
}
```

### GET `/api/driver-log`
Retrieve the latest 100 log entries.

---

## 🎨 Features

- ✅ White/Dark theme toggle
- ✅ Visual vehicle type selector (clickable icons)
- ✅ Auto-calculated time difference (read-only)
- ✅ Auto-calculated KM difference (read-only)
- ✅ Form validation with inline error messages
- ✅ Toast notifications on success/error
- ✅ Oracle DB with auto table creation
- ✅ Responsive design (mobile-friendly)
