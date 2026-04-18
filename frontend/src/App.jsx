import { useState, useEffect } from "react";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

const VEHICLE_TYPES = [
  { label: "Car", icon: "🚗" },
  { label: "Truck", icon: "🚛" },
  { label: "Van", icon: "🚐" },
  { label: "Bike", icon: "🏍️" },
  { label: "Bus", icon: "🚌" },
  { label: "Other", icon: "🚙" },
];

function calcTimeDiff(inTime, outTime) {
  if (!inTime || !outTime) return "";
  const diff = new Date(outTime) - new Date(inTime);
  if (diff < 0) return "Invalid";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

// ── Eye Icon ──────────────────────────────────────────────────────
function EyeIcon({ visible }) {
  return visible ? (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ── Toast ─────────────────────────────────────────────────────────
function Toast({ toast }) {
  return (
    <div className={`toast ${toast.type}${toast.show ? " show" : ""}`}>
      <span>{toast.type === "success" ? "✓" : "✕"}</span>
      <span>{toast.msg}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  LOGIN SCREEN
// ════════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin, onGoRegister }) {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ show: false, msg: "", type: "error" });

  const showToast = (msg, type = "error") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500);
  };

  const validate = () => {
    const e = {};
    if (!form.identifier.trim()) e.identifier = "Email or username is required";
    if (!form.password) e.password = "Password is required";
    return e;
  };

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((err) => ({ ...err, [e.target.name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: form.identifier.trim(),
          password: form.password,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        showToast(data.message || "Login failed");
      }
    } catch {
      showToast("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">🚗</div>
          <h1 className="auth-title">
            Driver<span>Log</span>
          </h1>
          <p className="auth-subtitle">Fleet Management System</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="auth-form">
          <div className="auth-field">
            <label>Email or Username</label>
            <input
              type="text"
              name="identifier"
              value={form.identifier}
              onChange={handleChange}
              placeholder="Enter email or username"
              className={errors.identifier ? "error" : ""}
            />
            {errors.identifier && (
              <span className="err-msg">{errors.identifier}</span>
            )}
          </div>

          <div className="auth-field">
            <label>Password</label>
            <div className="pwd-wrap">
              <input
                type={showPwd ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter password"
                className={errors.password ? "error" : ""}
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPwd(!showPwd)}
              >
                <EyeIcon visible={showPwd} />
              </button>
            </div>
            {errors.password && (
              <span className="err-msg">{errors.password}</span>
            )}
          </div>

          <button
            type="submit"
            className={`auth-btn${loading ? " loading" : ""}`}
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="auth-divider">
          <span>Don't have an account?</span>
        </div>
        <button className="auth-btn-outline" onClick={onGoRegister}>
          Create Account
        </button>
      </div>
      <Toast toast={toast} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  REGISTER SCREEN
// ════════════════════════════════════════════════════════════════════
function RegisterScreen({ onGoLogin }) {
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [show, setShow] = useState({
    password: false,
    confirm_password: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ show: false, msg: "", type: "success" });

  const showToast = (msg, type = "success") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500);
  };

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Full name is required";
    if (!form.username.trim()) e.username = "Username is required";
    else if (form.username.length < 3)
      e.username = "Username must be at least 3 characters";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6)
      e.password = "Password must be at least 6 characters";
    if (!form.confirm_password)
      e.confirm_password = "Please confirm your password";
    else if (form.password !== form.confirm_password)
      e.confirm_password = "Passwords do not match";
    return e;
  };

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((err) => ({ ...err, [e.target.name]: "" }));
  };

  const toggleShow = (field) => setShow((s) => ({ ...s, [field]: !s[field] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Account created! Please sign in.", "success");
        setTimeout(() => onGoLogin(), 1800);
      } else {
        showToast(data.message || "Registration failed", "error");
      }
    } catch {
      showToast("Could not connect to server.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card register-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">🚗</div>
          <h1 className="auth-title">
            Create <span>Account</span>
          </h1>
          <p className="auth-subtitle">Join the Fleet Management System</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="auth-form">
          <div className="auth-grid-2">
            <div className="auth-field">
              <label>
                First & Last Name <span className="req">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                placeholder="e.g. Giri Patel"
                className={errors.full_name ? "error" : ""}
              />
              {errors.full_name && (
                <span className="err-msg">{errors.full_name}</span>
              )}
            </div>

            <div className="auth-field">
              <label>
                Username <span className="req">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="e.g. giripatel"
                className={errors.username ? "error" : ""}
              />
              {errors.username && (
                <span className="err-msg">{errors.username}</span>
              )}
            </div>
          </div>

          <div className="auth-field">
            <label>
              Email <span className="req">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className={errors.email ? "error" : ""}
            />
            {errors.email && <span className="err-msg">{errors.email}</span>}
          </div>

          <div className="auth-field">
            <label>
              Password <span className="req">*</span>
            </label>
            <div className="pwd-wrap">
              <input
                type={show.password ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min. 6 characters"
                className={errors.password ? "error" : ""}
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => toggleShow("password")}
              >
                <EyeIcon visible={show.password} />
              </button>
            </div>
            {errors.password && (
              <span className="err-msg">{errors.password}</span>
            )}
          </div>

          <div className="auth-field">
            <label>
              Confirm Password <span className="req">*</span>
            </label>
            <div className="pwd-wrap">
              <input
                type={show.confirm_password ? "text" : "password"}
                name="confirm_password"
                value={form.confirm_password}
                onChange={handleChange}
                placeholder="Re-enter password"
                className={errors.confirm_password ? "error" : ""}
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => toggleShow("confirm_password")}
              >
                <EyeIcon visible={show.confirm_password} />
              </button>
            </div>
            {errors.confirm_password && (
              <span className="err-msg">{errors.confirm_password}</span>
            )}
          </div>

          <button
            type="submit"
            className={`auth-btn${loading ? " loading" : ""}`}
            disabled={loading}
          >
            {loading ? "Creating Account…" : "Create Account"}
          </button>
        </form>

        <div className="auth-divider">
          <span>Already have an account?</span>
        </div>
        <button className="auth-btn-outline" onClick={onGoLogin}>
          Back to Sign In
        </button>
      </div>
      <Toast toast={toast} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  DRIVER LOG SCREEN
// ════════════════════════════════════════════════════════════════════
function DriverLogScreen({ user, onLogout }) {
  const [dark, setDark] = useState(false);
  const [form, setForm] = useState({
    driverName: "",
    purpose: "",
    vehicleType: "",
    vehicleNumber: "",
    inTime: "",
    outTime: "",
    inKm: "",
    outKm: "",
  });
  const [timeDiff, setTimeDiff] = useState("");
  const [kmDiff, setKmDiff] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: "", type: "success" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    document.body.className = dark ? "dark" : "";
  }, [dark]);
  useEffect(() => {
    setTimeDiff(calcTimeDiff(form.inTime, form.outTime));
  }, [form.inTime, form.outTime]);
  useEffect(() => {
    const diff = parseFloat(form.outKm) - parseFloat(form.inKm);
    setKmDiff(!isNaN(diff) && diff >= 0 ? diff.toFixed(1) + " km" : "");
  }, [form.inKm, form.outKm]);

  const showToast = (msg, type = "success") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500);
  };

  const validate = () => {
    const e = {};
    if (!form.driverName.trim()) e.driverName = "Required";
    if (!form.purpose.trim()) e.purpose = "Required";
    if (!form.vehicleType) e.vehicleType = "Select a vehicle type";
    if (!form.vehicleNumber.trim()) e.vehicleNumber = "Required";
    if (!form.inTime) e.inTime = "Required";
    if (!form.outTime) e.outTime = "Required";
    if (
      form.inTime &&
      form.outTime &&
      new Date(form.outTime) <= new Date(form.inTime)
    )
      e.outTime = "Must be after In Time";
    if (!form.inKm) e.inKm = "Required";
    if (!form.outKm) e.outKm = "Required";
    if (
      form.inKm &&
      form.outKm &&
      parseFloat(form.outKm) < parseFloat(form.inKm)
    )
      e.outKm = "Must be ≥ In KM";
    return e;
  };

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((err) => ({ ...err, [e.target.name]: "" }));
  };

  const handleVehicle = (v) => {
    setForm((f) => ({ ...f, vehicleType: v }));
    setErrors((err) => ({ ...err, vehicleType: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        driver_name: form.driverName.trim(),
        purpose: form.purpose.trim(),
        vehicle_type: form.vehicleType,
        vehicle_number: form.vehicleNumber.trim().toUpperCase(),
        in_time: form.inTime,
        out_time: form.outTime,
        time_difference: timeDiff,
        in_km: parseFloat(form.inKm),
        out_km: parseFloat(form.outKm),
        km_difference: parseFloat(
          (parseFloat(form.outKm) - parseFloat(form.inKm)).toFixed(1),
        ),
      };
      const res = await fetch(`${API_URL}/api/driver-log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Driver log saved successfully!", "success");
        setForm({
          driverName: "",
          purpose: "",
          vehicleType: "",
          vehicleNumber: "",
          inTime: "",
          outTime: "",
          inKm: "",
          outKm: "",
        });
        setTimeDiff("");
        setKmDiff("");
        setErrors({});
      } else {
        showToast(data.message || "Server error", "error");
      }
    } catch {
      showToast("Could not connect to server.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    onLogout();
  };

  return (
    <div className="app">
      <div className="header">
        <div className="header-left">
          <div className="eyebrow">Fleet Management</div>
          <h1 className="title">
            Driver <span>Log</span>
          </h1>
          <p className="subtitle">
            Record vehicle trips and track mileage in real-time
          </p>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-avatar">
              {user?.full_name?.charAt(0).toUpperCase()}
            </span>
            <span className="user-name">{user?.full_name}</span>
          </div>
          <button className="theme-btn" onClick={() => setDark(!dark)}>
            <span>{dark ? "☀️" : "🌙"}</span>
            <span>{dark ? "Light" : "Dark"}</span>
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="card">
          <div className="section-label">Driver Information</div>
          <div className="grid-2">
            <div className="field full">
              <label>
                Driver Name <span className="req">*</span>
              </label>
              <input
                type="text"
                name="driverName"
                value={form.driverName}
                onChange={handleChange}
                placeholder="Enter full name"
                className={errors.driverName ? "error" : ""}
              />
              {errors.driverName && (
                <span className="err-msg">{errors.driverName}</span>
              )}
            </div>
            <div className="field full">
              <label>
                Purpose of Trip <span className="req">*</span>
              </label>
              <input
                type="text"
                name="purpose"
                value={form.purpose}
                onChange={handleChange}
                placeholder="e.g. Client Visit, Delivery…"
                className={errors.purpose ? "error" : ""}
              />
              {errors.purpose && (
                <span className="err-msg">{errors.purpose}</span>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-label">Vehicle Details</div>
          <div className="field">
            <label>
              Vehicle Type <span className="req">*</span>
            </label>
            <div className="vehicle-options">
              {VEHICLE_TYPES.map((v) => (
                <div
                  key={v.label}
                  className={`vehicle-opt${form.vehicleType === v.label ? " selected" : ""}`}
                  onClick={() => handleVehicle(v.label)}
                >
                  <span className="vicon">{v.icon}</span>
                  {v.label}
                </div>
              ))}
            </div>
            {errors.vehicleType && (
              <span className="err-msg">{errors.vehicleType}</span>
            )}
          </div>
          <div className="field" style={{ marginTop: "1rem" }}>
            <label>
              Vehicle Number <span className="req">*</span>
            </label>
            <input
              type="text"
              name="vehicleNumber"
              value={form.vehicleNumber}
              onChange={handleChange}
              placeholder="e.g. GJ05AB1234"
              className={errors.vehicleNumber ? "error" : ""}
              style={{ textTransform: "uppercase" }}
            />
            {errors.vehicleNumber && (
              <span className="err-msg">{errors.vehicleNumber}</span>
            )}
          </div>
        </div>

        <div className="card">
          <div className="section-label">Trip Timing</div>
          <div className="grid-2">
            <div className="field">
              <label>
                In Time <span className="req">*</span>
              </label>
              <input
                type="datetime-local"
                name="inTime"
                value={form.inTime}
                onChange={handleChange}
                className={errors.inTime ? "error" : ""}
              />
              {errors.inTime && (
                <span className="err-msg">{errors.inTime}</span>
              )}
            </div>
            <div className="field">
              <label>
                Out Time <span className="req">*</span>
              </label>
              <input
                type="datetime-local"
                name="outTime"
                value={form.outTime}
                onChange={handleChange}
                className={errors.outTime ? "error" : ""}
              />
              {errors.outTime && (
                <span className="err-msg">{errors.outTime}</span>
              )}
            </div>
            <div className="field full">
              <label className="auto-label">
                <span>Time Difference</span>
                <span className="auto-badge">
                  <span className="auto-dot"></span>Auto-calculated
                </span>
              </label>
              <input
                type="text"
                value={timeDiff}
                readOnly
                className="readonly-field"
                placeholder="Will calculate automatically"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-label">Odometer Readings</div>
          <div className="grid-2">
            <div className="field">
              <label>
                In KM <span className="req">*</span>
              </label>
              <input
                type="number"
                name="inKm"
                value={form.inKm}
                onChange={handleChange}
                placeholder="0"
                min="0"
                className={errors.inKm ? "error" : ""}
              />
              {errors.inKm && <span className="err-msg">{errors.inKm}</span>}
            </div>
            <div className="field">
              <label>
                Out KM <span className="req">*</span>
              </label>
              <input
                type="number"
                name="outKm"
                value={form.outKm}
                onChange={handleChange}
                placeholder="0"
                min="0"
                className={errors.outKm ? "error" : ""}
              />
              {errors.outKm && <span className="err-msg">{errors.outKm}</span>}
            </div>
            <div className="field full">
              <label className="auto-label">
                <span>KM Difference</span>
                <span className="auto-badge">
                  <span className="auto-dot"></span>Auto-calculated
                </span>
              </label>
              <input
                type="text"
                value={kmDiff}
                readOnly
                className="readonly-field"
                placeholder="Will calculate automatically"
              />
            </div>
          </div>
        </div>

        <div className="card submit-card">
          <div className="submit-row">
            <p className="submit-info">
              Fields marked <span className="req">*</span> are required
            </p>
            <button
              type="submit"
              className={`submit-btn${loading ? " loading" : ""}`}
              disabled={loading}
            >
              <span>{loading ? "⟳" : "✓"}</span>
              <span>{loading ? "Submitting…" : "Submit Log"}</span>
            </button>
          </div>
        </div>
      </form>

      <Toast toast={toast} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  ROOT APP — manages which screen is shown
// ════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("login"); // "login" | "register" | "app"
  const [user, setUser] = useState(null);

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setScreen("app");
    }
  }, []);

  if (screen === "register")
    return <RegisterScreen onGoLogin={() => setScreen("login")} />;
  if (screen === "app")
    return (
      <DriverLogScreen
        user={user}
        onLogout={() => {
          setUser(null);
          setScreen("login");
        }}
      />
    );
  return (
    <LoginScreen
      onLogin={(u) => {
        setUser(u);
        setScreen("app");
      }}
      onGoRegister={() => setScreen("register")}
    />
  );
}
