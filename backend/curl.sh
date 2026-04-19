# ═══════════════════════════════════════════════════════════════════
#  DRIVERLOG API — CURL COMMANDS
#  Base URL: http://localhost:3001  (change to your Render URL in prod)
# ═══════════════════════════════════════════════════════════════════

BASE_URL="http://localhost:3001"

# After login, copy the token from the response and set it here:
TOKEN="your_jwt_token_here"


# ───────────────────────────────────────────────────────────────────
#  1. HEALTH CHECK
# ───────────────────────────────────────────────────────────────────

curl -X GET "$BASE_URL/health"


# ═══════════════════════════════════════════════════════════════════
#  AUTH ROUTES
# ═══════════════════════════════════════════════════════════════════

# ── 2. REGISTER ────────────────────────────────────────────────────
curl -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Giri Patel",
    "username": "giripatel",
    "email": "giri@example.com",
    "password": "password123"
  }'

# Expected 201:
# { "message": "User registered successfully!", "id": 1 }

# ── Error: duplicate email/username ────────────────────────────────
curl -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Giri Patel",
    "username": "giripatel",
    "email": "giri@example.com",
    "password": "password123"
  }'

# Expected 409:
# { "message": "Email or username already exists." }


# ── 3. LOGIN (with email) ──────────────────────────────────────────
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "giri@example.com",
    "password": "password123"
  }'

# ── 3b. LOGIN (with username) ──────────────────────────────────────
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "giripatel",
    "password": "password123"
  }'

# Expected 200:
# { "message": "Login successful!", "token": "eyJ...", "user": { ... } }

# ── Error: wrong password ──────────────────────────────────────────
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "giripatel",
    "password": "wrongpassword"
  }'

# Expected 401:
# { "message": "Invalid email/username or password." }


# ── 4. GET MY PROFILE (protected) ─────────────────────────────────
curl -X GET "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN"

# Expected 200:
# { "ID": 1, "FULL_NAME": "Giri Patel", "USERNAME": "giripatel", "EMAIL": "giri@example.com", "CREATED_AT": "..." }


# ── 5. UPDATE PROFILE (protected) ─────────────────────────────────
curl -X PUT "$BASE_URL/api/auth/me" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "full_name": "Giri R Patel",
    "username": "giripatel",
    "email": "giri.updated@example.com"
  }'

# Expected 200:
# { "message": "Profile updated successfully!", "token": "eyJ...(new token)", "user": { ... } }

# ── Error: email already taken by another user ─────────────────────
curl -X PUT "$BASE_URL/api/auth/me" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "full_name": "Giri Patel",
    "username": "giripatel",
    "email": "someone_else@example.com"
  }'

# Expected 409:
# { "message": "Email or username already taken by another account." }


# ── 6. CHANGE PASSWORD (protected) ────────────────────────────────
curl -X PUT "$BASE_URL/api/auth/change-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "current_password": "password123",
    "new_password": "newpassword456"
  }'

# Expected 200:
# { "message": "Password changed successfully!" }

# ── Error: wrong current password ─────────────────────────────────
curl -X PUT "$BASE_URL/api/auth/change-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "current_password": "wrongcurrent",
    "new_password": "newpassword456"
  }'

# Expected 401:
# { "message": "Current password is incorrect." }


# ── 7. REFRESH JWT TOKEN (protected) ──────────────────────────────
curl -X POST "$BASE_URL/api/auth/refresh" \
  -H "Authorization: Bearer $TOKEN"

# Expected 200:
# { "message": "Token refreshed.", "token": "eyJ...(fresh token)", "user": { ... } }

# ── Error: expired/invalid token ──────────────────────────────────
curl -X POST "$BASE_URL/api/auth/refresh" \
  -H "Authorization: Bearer expiredtoken123"

# Expected 401:
# { "message": "Invalid or expired token." }


# ═══════════════════════════════════════════════════════════════════
#  DRIVER LOG ROUTES
# ═══════════════════════════════════════════════════════════════════

# ── 8. GET DASHBOARD STATS (protected) ────────────────────────────
curl -X GET "$BASE_URL/api/driver-log/stats" \
  -H "Authorization: Bearer $TOKEN"

# Expected 200:
# {
#   "total_logs": 42,
#   "logs_today": 5,
#   "total_km": "1284.5",
#   "top_driver": "Ramesh Kumar"
# }


# ── 9. CREATE DRIVER LOG (protected) ──────────────────────────────
curl -X POST "$BASE_URL/api/driver-log" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "driver_name": "Ramesh Kumar",
    "purpose": "Client Visit",
    "vehicle_type": "Car",
    "vehicle_number": "GJ05AB1234",
    "in_time": "2026-04-19T09:00:00",
    "out_time": "2026-04-19T11:30:00",
    "time_difference": "2h 30m",
    "in_km": 12000,
    "out_km": 12085,
    "km_difference": 85
  }'

# Expected 201:
# { "message": "Driver log saved successfully!", "id": 1 }

# ── Error: missing required fields ────────────────────────────────
curl -X POST "$BASE_URL/api/driver-log" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "driver_name": "Ramesh Kumar"
  }'

# Expected 400:
# { "message": "All required fields must be provided." }


# ── 10. GET ALL LOGS (protected) ──────────────────────────────────
curl -X GET "$BASE_URL/api/driver-log" \
  -H "Authorization: Bearer $TOKEN"

# Expected 200:
# [ { "ID": 1, "DRIVER_NAME": "Ramesh Kumar", "PURPOSE": "Client Visit", ... }, ... ]


# ── 11. UPDATE A LOG ENTRY (protected) ────────────────────────────
# Replace 1 with the actual log ID
curl -X PUT "$BASE_URL/api/driver-log/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "driver_name": "Ramesh Kumar",
    "purpose": "Airport Drop",
    "vehicle_type": "Car",
    "vehicle_number": "GJ05AB1234",
    "in_time": "2026-04-19T09:00:00",
    "out_time": "2026-04-19T12:00:00",
    "time_difference": "3h 0m",
    "in_km": 12000,
    "out_km": 12110,
    "km_difference": 110
  }'

# Expected 200:
# { "message": "Log updated successfully!" }

# ── Error: log not found ───────────────────────────────────────────
curl -X PUT "$BASE_URL/api/driver-log/9999" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "driver_name": "Test", "purpose": "Test", "vehicle_type": "Car",
    "vehicle_number": "GJ01AA0001", "in_time": "2026-04-19T09:00:00",
    "out_time": "2026-04-19T10:00:00", "time_difference": "1h 0m",
    "in_km": 100, "out_km": 150, "km_difference": 50
  }'

# Expected 404:
# { "message": "Log entry not found." }


# ── 12. DELETE A LOG ENTRY (protected) ────────────────────────────
# Replace 1 with the actual log ID
curl -X DELETE "$BASE_URL/api/driver-log/1" \
  -H "Authorization: Bearer $TOKEN"

# Expected 200:
# { "message": "Log deleted successfully!" }

# ── Error: log not found ───────────────────────────────────────────
curl -X DELETE "$BASE_URL/api/driver-log/9999" \
  -H "Authorization: Bearer $TOKEN"

# Expected 404:
# { "message": "Log entry not found." }


# ═══════════════════════════════════════════════════════════════════
#  PRODUCTION (RENDER) — just swap BASE_URL
# ═══════════════════════════════════════════════════════════════════

# BASE_URL="https://your-app.onrender.com"
# Then run any of the commands above exactly the same way.


# ═══════════════════════════════════════════════════════════════════
#  QUICK ONE-LINER: login and auto-capture token
# ═══════════════════════════════════════════════════════════════════

TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"giripatel","password":"password123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: $TOKEN"

# Then use $TOKEN in any subsequent command automatically.