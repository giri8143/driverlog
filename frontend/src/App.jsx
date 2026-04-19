import { useState, useEffect, useCallback, useRef } from "react";
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
function getTokenExpiry() {
  return parseInt(localStorage.getItem("tokenExpiry") || "0", 10);
}
function isTokenExpired() {
  return Date.now() >= getTokenExpiry();
}
function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}
function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ── Icons ─────────────────────────────────────────────────────────
function Icon({ path, size = 16, stroke = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}
const ICONS = {
  dashboard:
    "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  drivers:
    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  logs: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  upload: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
  profile:
    "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  settings:
    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 18L18 6M6 6l12 12",
  edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  trash:
    "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z",
  eyeOff:
    "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24 M1 1l22 22",
  logout:
    "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  car: "M5 17H3v-5l2.5-4.5A1.5 1.5 0 016.8 6h10.4a1.5 1.5 0 011.3.75L21 12v5h-2m-14 0h10m-10 0a2 2 0 004 0m6 0a2 2 0 004 0",
  bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  chevronRight: "M9 5l7 7-7 7",
  check: "M5 13l4 4L19 7",
};

// ── Toast ─────────────────────────────────────────────────────────
function Toast({ toast }) {
  return (
    <div
      className={`toast toast-${toast.type}${toast.show ? " toast-show" : ""}`}
    >
      <Icon
        path={toast.type === "success" ? ICONS.check : ICONS.close}
        size={14}
      />
      <span>{toast.msg}</span>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────
function Modal({ title, onClose, children, size = "md" }) {
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`modal-card modal-${size}`}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose}>
            <Icon path={ICONS.close} size={14} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ── Eye Button ────────────────────────────────────────────────────
function EyeBtn({ show, toggle }) {
  return (
    <button type="button" className="eye-btn" onClick={toggle}>
      <Icon path={show ? ICONS.eye : ICONS.eyeOff} size={15} />
    </button>
  );
}

// ── Session Warning ───────────────────────────────────────────────
function SessionWarning({ onRefresh, onLogout }) {
  return (
    <div className="session-warn">
      <Icon path={ICONS.bell} size={15} />
      <span>Your session expires in 5 minutes.</span>
      <button onClick={onRefresh}>Refresh session</button>
      <button className="sw-logout" onClick={onLogout}>
        Logout now
      </button>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────
function Sidebar({
  user,
  activePage,
  onNavigate,
  collapsed,
  onToggle,
  onLogout,
}) {
  const isAdmin = user?.role === "admin";
  const navItems = isAdmin
    ? [
        { id: "dashboard", icon: ICONS.dashboard, label: "Dashboard" },
        { id: "drivers", icon: ICONS.drivers, label: "Drivers" },
        { id: "logs", icon: ICONS.logs, label: "Trip logs" },
        { id: "bulk", icon: ICONS.upload, label: "Bulk upload" },
        { id: "profile", icon: ICONS.profile, label: "My profile" },
        { id: "settings", icon: ICONS.settings, label: "Settings" },
      ]
    : [
        { id: "dashboard", icon: ICONS.dashboard, label: "My dashboard" },
        { id: "logs", icon: ICONS.logs, label: "My trips" },
        { id: "profile", icon: ICONS.profile, label: "My profile" },
      ];

  return (
    <aside className={`sidebar${collapsed ? " sidebar-collapsed" : ""}`}>
      <div className="sb-brand">
        <div className="sb-logo">
          <Icon path={ICONS.car} size={16} stroke="white" />
        </div>
        {!collapsed && (
          <span className="sb-title">
            Fleet<span>Log</span>
          </span>
        )}
        <button className="icon-btn sb-toggle" onClick={onToggle}>
          <Icon path={ICONS.menu} size={14} />
        </button>
      </div>

      <nav className="sb-nav">
        {!collapsed && <div className="sb-section">Menu</div>}
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item${activePage === item.id ? " nav-active" : ""}`}
            onClick={() => onNavigate(item.id)}
            title={collapsed ? item.label : ""}
          >
            <span className="nav-icon">
              <Icon path={item.icon} size={15} />
            </span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="sb-footer">
        <div className="sb-user" onClick={() => onNavigate("profile")}>
          <div className={`u-avatar ${isAdmin ? "av-admin" : "av-driver"}`}>
            {getInitials(user?.full_name)}
          </div>
          {!collapsed && (
            <div className="u-info">
              <div className="u-name">{user?.full_name}</div>
              <div className="u-role">
                {isAdmin ? "Administrator" : "Driver"}
              </div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            className="icon-btn sb-logout"
            onClick={onLogout}
            title="Sign out"
          >
            <Icon path={ICONS.logout} size={14} />
          </button>
        )}
      </div>
    </aside>
  );
}

// ── Topbar ────────────────────────────────────────────────────────
function Topbar({ title, user, onLogout }) {
  const isAdmin = user?.role === "admin";
  return (
    <header className="topbar">
      <h1 className="tb-title">{title}</h1>
      <div className="tb-right">
        <span className={`role-badge ${isAdmin ? "rb-admin" : "rb-driver"}`}>
          {isAdmin ? "Admin" : "Driver"}
        </span>
        <span className="tb-username">{user?.full_name}</span>
        <button className="btn btn-ghost btn-danger" onClick={onLogout}>
          <Icon path={ICONS.logout} size={14} /> Sign out
        </button>
      </div>
    </header>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`stat-card${accent ? " stat-accent" : ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-val">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  AUTH — LOGIN
// ══════════════════════════════════════════════════════════════════
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

  const handleSubmit = async (ev) => {
    ev.preventDefault();
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
        localStorage.setItem(
          "tokenExpiry",
          String(Date.now() + 6 * 60 * 60 * 1000),
        );
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
          <div className="auth-brand-icon">
            <Icon path={ICONS.car} size={28} stroke="#534AB7" />
          </div>
          <h1 className="auth-title">
            Fleet<span>Log</span>
          </h1>
          <p className="auth-subtitle">Fleet Management System</p>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label>Email or username</label>
            <input
              type="text"
              value={form.identifier}
              onChange={(e) => {
                setForm((f) => ({ ...f, identifier: e.target.value }));
                setErrors((er) => ({ ...er, identifier: "" }));
              }}
              placeholder="Enter email or username"
              className={errors.identifier ? "inp-error" : ""}
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
                value={form.password}
                onChange={(e) => {
                  setForm((f) => ({ ...f, password: e.target.value }));
                  setErrors((er) => ({ ...er, password: "" }));
                }}
                placeholder="Enter password"
                className={errors.password ? "inp-error" : ""}
              />
              <EyeBtn show={showPwd} toggle={() => setShowPwd(!showPwd)} />
            </div>
            {errors.password && (
              <span className="err-msg">{errors.password}</span>
            )}
          </div>
          <button
            type="submit"
            className={`btn btn-primary btn-full${loading ? " btn-loading" : ""}`}
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="auth-divider">
          <span>Don't have an account?</span>
        </div>
        <button className="btn btn-outline btn-full" onClick={onGoRegister}>
          Create account (register as driver)
        </button>
      </div>
      <Toast toast={toast} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  AUTH — REGISTER
// ══════════════════════════════════════════════════════════════════
function RegisterScreen({ onGoLogin }) {
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [show, setShow] = useState({ password: false, confirm: false });
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
    if (!form.username.trim() || form.username.length < 3)
      e.username = "Min. 3 characters";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      e.email = "Valid email required";
    if (!form.password || form.password.length < 6)
      e.password = "Min. 6 characters";
    if (form.password !== form.confirm_password)
      e.confirm_password = "Passwords do not match";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
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
        showToast("Account created! Please sign in.");
        setTimeout(onGoLogin, 1800);
      } else showToast(data.message || "Registration failed", "error");
    } catch {
      showToast("Could not connect to server.", "error");
    } finally {
      setLoading(false);
    }
  };

  const f = (field, val) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    setErrors((er) => ({ ...er, [field]: "" }));
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-lg">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <Icon path={ICONS.car} size={28} stroke="#534AB7" />
          </div>
          <h1 className="auth-title">
            Create <span>Account</span>
          </h1>
          <p className="auth-subtitle">Register as a driver</p>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid-2">
            <div className="auth-field">
              <label>Full name *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => f("full_name", e.target.value)}
                placeholder="Giri Patel"
                className={errors.full_name ? "inp-error" : ""}
              />
              {errors.full_name && (
                <span className="err-msg">{errors.full_name}</span>
              )}
            </div>
            <div className="auth-field">
              <label>Username *</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => f("username", e.target.value)}
                placeholder="giripatel"
                className={errors.username ? "inp-error" : ""}
              />
              {errors.username && (
                <span className="err-msg">{errors.username}</span>
              )}
            </div>
          </div>
          <div className="auth-field">
            <label>Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => f("email", e.target.value)}
              placeholder="you@example.com"
              className={errors.email ? "inp-error" : ""}
            />
            {errors.email && <span className="err-msg">{errors.email}</span>}
          </div>
          <div className="form-grid-2">
            <div className="auth-field">
              <label>Password *</label>
              <div className="pwd-wrap">
                <input
                  type={show.password ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => f("password", e.target.value)}
                  placeholder="Min. 6 characters"
                  className={errors.password ? "inp-error" : ""}
                />
                <EyeBtn
                  show={show.password}
                  toggle={() =>
                    setShow((s) => ({ ...s, password: !s.password }))
                  }
                />
              </div>
              {errors.password && (
                <span className="err-msg">{errors.password}</span>
              )}
            </div>
            <div className="auth-field">
              <label>Confirm password *</label>
              <div className="pwd-wrap">
                <input
                  type={show.confirm ? "text" : "password"}
                  value={form.confirm_password}
                  onChange={(e) => f("confirm_password", e.target.value)}
                  placeholder="Re-enter password"
                  className={errors.confirm_password ? "inp-error" : ""}
                />
                <EyeBtn
                  show={show.confirm}
                  toggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
                />
              </div>
              {errors.confirm_password && (
                <span className="err-msg">{errors.confirm_password}</span>
              )}
            </div>
          </div>
          <button
            type="submit"
            className={`btn btn-primary btn-full${loading ? " btn-loading" : ""}`}
            disabled={loading}
            style={{ marginTop: "8px" }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <div className="auth-divider">
          <span>Already have an account?</span>
        </div>
        <button className="btn btn-outline btn-full" onClick={onGoLogin}>
          Back to sign in
        </button>
      </div>
      <Toast toast={toast} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  ADMIN — DRIVER MANAGEMENT
// ══════════════════════════════════════════════════════════════════
function DriversPage({ onLogout }) {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editDriver, setEditDriver] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: "", type: "success" });

  const showToast = (msg, type = "success") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500);
  };

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/drivers`, {
        headers: authHeaders(),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json();
      setDrivers(Array.isArray(data) ? data : []);
    } catch {
      showToast("Could not load drivers.", "error");
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const filtered = drivers.filter((d) => {
    const s = search.toLowerCase();
    const match =
      !s ||
      d.FULL_NAME?.toLowerCase().includes(s) ||
      d.EMAIL?.toLowerCase().includes(s) ||
      d.USERNAME?.toLowerCase().includes(s);
    const sm =
      !statusFilter || (d.STATUS || "active").toLowerCase() === statusFilter;
    return match && sm;
  });

  const handleUpdateDriver = async (form) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/drivers/${editDriver.ID}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (res.ok) {
        showToast("Driver updated.");
        setEditDriver(null);
        fetchDrivers();
      } else {
        const d = await res.json();
        showToast(d.message || "Update failed", "error");
      }
    } catch {
      showToast("Server error.", "error");
    }
  };

  const handleToggleStatus = async (driver) => {
    const newStatus =
      (driver.STATUS || "active").toLowerCase() === "active"
        ? "inactive"
        : "active";
    try {
      const res = await fetch(
        `${API_URL}/api/admin/drivers/${driver.ID}/status`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ status: newStatus }),
        },
      );
      if (res.ok) {
        showToast(`Driver marked ${newStatus}.`);
        fetchDrivers();
      }
    } catch {
      showToast("Server error.", "error");
    }
  };

  return (
    <div>
      <div className="page-toolbar">
        <div className="search-row">
          <input
            className="search-input"
            type="text"
            placeholder="Search name, email, username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div className="table-card">
        {loading ? (
          <div className="table-empty">Loading drivers…</div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">No drivers found.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Trips</th>
                  <th>Total km</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.ID}>
                    <td>
                      <div className="cell-user">
                        <div
                          className="u-avatar av-driver"
                          style={{ width: 28, height: 28, fontSize: 11 }}
                        >
                          {getInitials(d.FULL_NAME)}
                        </div>
                        <span>{d.FULL_NAME}</span>
                      </div>
                    </td>
                    <td className="text-muted">@{d.USERNAME}</td>
                    <td className="text-muted">{d.EMAIL}</td>
                    <td>{d.TRIP_COUNT ?? 0}</td>
                    <td>
                      <span className="badge badge-green">
                        {Number(d.TOTAL_KM || 0).toLocaleString()} km
                      </span>
                    </td>
                    <td className="text-muted">
                      {d.CREATED_AT
                        ? new Date(d.CREATED_AT).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <span
                        className={`badge ${(d.STATUS || "active").toLowerCase() === "active" ? "badge-green" : "badge-amber"}`}
                      >
                        {d.STATUS || "Active"}
                      </span>
                    </td>
                    <td>
                      <div className="action-row">
                        <button
                          className="icon-btn"
                          onClick={() => setEditDriver(d)}
                          title="Edit"
                        >
                          <Icon path={ICONS.edit} size={13} />
                        </button>
                        <button
                          className="icon-btn icon-btn-warn"
                          onClick={() => handleToggleStatus(d)}
                          title="Toggle status"
                        >
                          <Icon path={ICONS.settings} size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="table-footer">
          {filtered.length} driver{filtered.length !== 1 ? "s" : ""} shown
        </div>
      </div>
      {editDriver && (
        <EditDriverModal
          driver={editDriver}
          onClose={() => setEditDriver(null)}
          onSave={handleUpdateDriver}
        />
      )}
      <Toast toast={toast} />
    </div>
  );
}

function EditDriverModal({ driver, onClose, onSave }) {
  const [form, setForm] = useState({
    full_name: driver.FULL_NAME || "",
    username: driver.USERNAME || "",
    email: driver.EMAIL || "",
    status: driver.STATUS || "active",
  });
  const [loading, setLoading] = useState(false);
  const f = (field, val) => setForm((prev) => ({ ...prev, [field]: val }));

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setLoading(true);
    await onSave(form);
    setLoading(false);
  };

  return (
    <Modal title="Edit driver details" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-grid-2">
          <div className="auth-field">
            <label>Full name</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => f("full_name", e.target.value)}
            />
          </div>
          <div className="auth-field">
            <label>Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => f("username", e.target.value)}
            />
          </div>
          <div className="auth-field" style={{ gridColumn: "1/-1" }}>
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => f("email", e.target.value)}
            />
          </div>
          <div className="auth-field">
            <label>Status</label>
            <select
              value={form.status}
              onChange={(e) => f("status", e.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={`btn btn-primary${loading ? " btn-loading" : ""}`}
            disabled={loading}
          >
            {loading ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
//  TRIP LOGS (shared — admin sees all, driver sees own)
// ══════════════════════════════════════════════════════════════════
function LogsPage({ user, onLogout }) {
  const isAdmin = user?.role === "admin";
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [editLog, setEditLog] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: "", type: "success" });

  const showToast = (msg, type = "success") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500);
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/driver-log`, {
        headers: authHeaders(),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      showToast("Could not load logs.", "error");
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filtered = logs.filter((l) => {
    const s = search.toLowerCase();
    const match =
      !s ||
      l.DRIVER_NAME?.toLowerCase().includes(s) ||
      l.VEHICLE_NUMBER?.toLowerCase().includes(s) ||
      l.PURPOSE?.toLowerCase().includes(s);
    const vm = !vehicleFilter || l.VEHICLE_TYPE === vehicleFilter;
    return match && vm;
  });

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this log?")) return;
    try {
      const res = await fetch(`${API_URL}/api/driver-log/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (res.ok) {
        setLogs((l) => l.filter((x) => x.ID !== id));
        showToast("Log deleted.");
      } else showToast("Failed to delete.", "error");
    } catch {
      showToast("Server error.", "error");
    }
  };

  const exportCSV = () => {
    const headers = [
      "Driver Name",
      "Purpose",
      "Vehicle Type",
      "Vehicle Number",
      "In Time",
      "Out Time",
      "Duration",
      "In KM",
      "Out KM",
      "KM Diff",
    ];
    const rows = filtered.map((l) => [
      l.DRIVER_NAME,
      l.PURPOSE,
      l.VEHICLE_TYPE,
      l.VEHICLE_NUMBER,
      new Date(l.IN_TIME).toLocaleString(),
      new Date(l.OUT_TIME).toLocaleString(),
      l.TIME_DIFFERENCE,
      l.IN_KM,
      l.OUT_KM,
      l.KM_DIFFERENCE,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${v ?? ""}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `driver-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-toolbar">
        <div className="search-row">
          <input
            className="search-input"
            type="text"
            placeholder="Search driver, vehicle, purpose…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="filter-select"
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
          >
            <option value="">All vehicles</option>
            {VEHICLE_TYPES.map((v) => (
              <option key={v.label} value={v.label}>
                {v.icon} {v.label}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost" onClick={exportCSV}>
            <Icon path={ICONS.upload} size={13} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + Log trip
          </button>
        </div>
      </div>
      <div className="table-card">
        {loading ? (
          <div className="table-empty">Loading logs…</div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">No logs found.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Vehicle</th>
                  <th>Plate</th>
                  <th>Purpose</th>
                  <th>In time</th>
                  <th>Duration</th>
                  <th>KM</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.ID}>
                    <td>
                      <div className="cell-user">
                        <div
                          className="u-avatar av-driver"
                          style={{ width: 26, height: 26, fontSize: 10 }}
                        >
                          {getInitials(l.DRIVER_NAME)}
                        </div>
                        <span>{l.DRIVER_NAME}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-purple">
                        {
                          VEHICLE_TYPES.find((v) => v.label === l.VEHICLE_TYPE)
                            ?.icon
                        }{" "}
                        {l.VEHICLE_TYPE}
                      </span>
                    </td>
                    <td>
                      <span className="mono-badge">{l.VEHICLE_NUMBER}</span>
                    </td>
                    <td>{l.PURPOSE}</td>
                    <td className="text-muted">
                      {new Date(l.IN_TIME).toLocaleString()}
                    </td>
                    <td>
                      <span className="badge badge-amber">
                        {l.TIME_DIFFERENCE}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-green">
                        {l.KM_DIFFERENCE} km
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="action-row">
                          <button
                            className="icon-btn"
                            onClick={() => setEditLog(l)}
                            title="Edit"
                          >
                            <Icon path={ICONS.edit} size={13} />
                          </button>
                          <button
                            className="icon-btn icon-btn-danger"
                            onClick={() => handleDelete(l.ID)}
                            title="Delete"
                          >
                            <Icon path={ICONS.trash} size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="table-footer">
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>
      {showAdd && (
        <AddLogModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            fetchLogs();
            showToast("Trip logged!");
          }}
          onLogout={onLogout}
        />
      )}
      {editLog && isAdmin && (
        <EditLogModal
          log={editLog}
          onClose={() => setEditLog(null)}
          onSaved={() => {
            setEditLog(null);
            fetchLogs();
            showToast("Log updated!");
          }}
          onLogout={onLogout}
        />
      )}
      <Toast toast={toast} />
    </div>
  );
}

function AddLogModal({ onClose, onSaved, onLogout }) {
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
  const [loading, setLoading] = useState(false);
  const timeDiff = calcTimeDiff(form.inTime, form.outTime);
  const kmDiff = parseFloat(form.outKm) - parseFloat(form.inKm);
  const f = (field, val) => setForm((prev) => ({ ...prev, [field]: val }));

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/driver-log`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          driver_name: form.driverName.trim(),
          purpose: form.purpose.trim(),
          vehicle_type: form.vehicleType,
          vehicle_number: form.vehicleNumber.trim().toUpperCase(),
          in_time: form.inTime,
          out_time: form.outTime,
          time_difference: timeDiff,
          in_km: parseFloat(form.inKm),
          out_km: parseFloat(form.outKm),
          km_difference: isNaN(kmDiff) ? 0 : parseFloat(kmDiff.toFixed(1)),
        }),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (res.ok) onSaved();
    } catch {
      console.error("Submit failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Log a new trip" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-grid-2">
          <div className="auth-field">
            <label>Driver name *</label>
            <input
              type="text"
              value={form.driverName}
              onChange={(e) => f("driverName", e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="auth-field">
            <label>Purpose *</label>
            <input
              type="text"
              value={form.purpose}
              onChange={(e) => f("purpose", e.target.value)}
              placeholder="Client visit, Delivery…"
            />
          </div>
          <div className="auth-field" style={{ gridColumn: "1/-1" }}>
            <label>Vehicle type</label>
            <div className="vehicle-grid">
              {VEHICLE_TYPES.map((v) => (
                <div
                  key={v.label}
                  className={`v-opt${form.vehicleType === v.label ? " v-sel" : ""}`}
                  onClick={() => f("vehicleType", v.label)}
                >
                  <span className="v-icon">{v.icon}</span>
                  {v.label}
                </div>
              ))}
            </div>
          </div>
          <div className="auth-field" style={{ gridColumn: "1/-1" }}>
            <label>Vehicle plate *</label>
            <input
              type="text"
              value={form.vehicleNumber}
              onChange={(e) => f("vehicleNumber", e.target.value.toUpperCase())}
              placeholder="GJ05AB1234"
            />
          </div>
          <div className="auth-field">
            <label>In time *</label>
            <input
              type="datetime-local"
              value={form.inTime}
              onChange={(e) => f("inTime", e.target.value)}
            />
          </div>
          <div className="auth-field">
            <label>Out time *</label>
            <input
              type="datetime-local"
              value={form.outTime}
              onChange={(e) => f("outTime", e.target.value)}
            />
          </div>
          <div className="auth-field">
            <label>In KM *</label>
            <input
              type="number"
              value={form.inKm}
              onChange={(e) => f("inKm", e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>
          <div className="auth-field">
            <label>Out KM *</label>
            <input
              type="number"
              value={form.outKm}
              onChange={(e) => f("outKm", e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>
          <div className="auth-field">
            <label>Duration (auto)</label>
            <input readOnly value={timeDiff} className="inp-readonly" />
          </div>
          <div className="auth-field">
            <label>KM diff (auto)</label>
            <input
              readOnly
              value={
                !isNaN(kmDiff) && kmDiff >= 0 ? `${kmDiff.toFixed(1)} km` : ""
              }
              className="inp-readonly"
            />
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={`btn btn-primary${loading ? " btn-loading" : ""}`}
            disabled={loading}
          >
            {loading ? "Submitting…" : "Submit log"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditLogModal({ log, onClose, onSaved, onLogout }) {
  const toLocal = (dt) => {
    if (!dt) return "";
    const d = new Date(dt);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };
  const [form, setForm] = useState({
    driverName: log.DRIVER_NAME || "",
    purpose: log.PURPOSE || "",
    vehicleType: log.VEHICLE_TYPE || "",
    vehicleNumber: log.VEHICLE_NUMBER || "",
    inTime: toLocal(log.IN_TIME),
    outTime: toLocal(log.OUT_TIME),
    inKm: log.IN_KM ?? "",
    outKm: log.OUT_KM ?? "",
  });
  const [loading, setLoading] = useState(false);
  const timeDiff = calcTimeDiff(form.inTime, form.outTime);
  const kmDiff = parseFloat(form.outKm) - parseFloat(form.inKm);
  const f = (field, val) => setForm((prev) => ({ ...prev, [field]: val }));

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/driver-log/${log.ID}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          driver_name: form.driverName.trim(),
          purpose: form.purpose.trim(),
          vehicle_type: form.vehicleType,
          vehicle_number: form.vehicleNumber.trim().toUpperCase(),
          in_time: form.inTime,
          out_time: form.outTime,
          time_difference: timeDiff,
          in_km: parseFloat(form.inKm),
          out_km: parseFloat(form.outKm),
          km_difference: isNaN(kmDiff) ? 0 : parseFloat(kmDiff.toFixed(1)),
        }),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (res.ok) onSaved();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Edit trip log" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-grid-2">
          <div className="auth-field">
            <label>Driver name</label>
            <input
              type="text"
              value={form.driverName}
              onChange={(e) => f("driverName", e.target.value)}
            />
          </div>
          <div className="auth-field">
            <label>Purpose</label>
            <input
              type="text"
              value={form.purpose}
              onChange={(e) => f("purpose", e.target.value)}
            />
          </div>
          <div className="auth-field" style={{ gridColumn: "1/-1" }}>
            <label>Vehicle type</label>
            <div className="vehicle-grid">
              {VEHICLE_TYPES.map((v) => (
                <div
                  key={v.label}
                  className={`v-opt${form.vehicleType === v.label ? " v-sel" : ""}`}
                  onClick={() => f("vehicleType", v.label)}
                >
                  <span className="v-icon">{v.icon}</span>
                  {v.label}
                </div>
              ))}
            </div>
          </div>
          <div className="auth-field">
            <label>Vehicle plate</label>
            <input
              type="text"
              value={form.vehicleNumber}
              onChange={(e) => f("vehicleNumber", e.target.value.toUpperCase())}
            />
          </div>
          <div className="auth-field">
            <label>In time</label>
            <input
              type="datetime-local"
              value={form.inTime}
              onChange={(e) => f("inTime", e.target.value)}
            />
          </div>
          <div className="auth-field">
            <label>Out time</label>
            <input
              type="datetime-local"
              value={form.outTime}
              onChange={(e) => f("outTime", e.target.value)}
            />
          </div>
          <div className="auth-field">
            <label>In KM</label>
            <input
              type="number"
              value={form.inKm}
              onChange={(e) => f("inKm", e.target.value)}
              min="0"
            />
          </div>
          <div className="auth-field">
            <label>Out KM</label>
            <input
              type="number"
              value={form.outKm}
              onChange={(e) => f("outKm", e.target.value)}
              min="0"
            />
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={`btn btn-primary${loading ? " btn-loading" : ""}`}
            disabled={loading}
          >
            {loading ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
//  BULK UPLOAD (Admin only)
// ══════════════════════════════════════════════════════════════════

function BulkUploadPage({ onLogout }) {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: "", type: "success" });
  const inputRef = useRef();

  const showToast = (msg, type = "success") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500);
  };

  // ✅ DOWNLOAD TEMPLATE LOGIC
  const downloadTemplate = () => {
    const headers = [
      "driver_name",
      "purpose",
      "vehicle_type",
      "vehicle_number",
      "in_time",
      "out_time",
      "in_km",
      "out_km",
    ];

    const sampleRows = [
      [
        "Ravi Kumar",
        "Office Visit",
        "Car",
        "GJ01AB1234",
        "2026-04-19T09:00",
        "2026-04-19T12:30",
        "1200",
        "1250",
      ],
      [
        "Priya Shah",
        "Client Meeting",
        "Bike",
        "GJ05XY5678",
        "2026-04-19T10:00",
        "2026-04-19T11:30",
        "800",
        "820",
      ],
    ];

    const csvContent = [
      headers.join(","),
      ...sampleRows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "driver_log_template.csv"); // 👈 filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFile = async (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();

    if (!["csv", "xlsx", "xls"].includes(ext)) {
      showToast("Only CSV and Excel files are supported.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/api/driver-log/bulk/preview`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (res.status === 401) {
        onLogout();
        return;
      }

      const data = await res.json();
      setPreview(data);
    } catch {
      showToast("Could not parse file.", "error");
    }
  };

  const handleConfirmUpload = async () => {
    if (!preview?.rows?.length) return;

    setUploading(true);

    try {
      const res = await fetch(`${API_URL}/api/driver-log/bulk`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ rows: preview.rows }),
      });

      if (res.status === 401) {
        onLogout();
        return;
      }

      const data = await res.json();
      showToast(`${data.inserted || 0} records uploaded successfully!`);
      setPreview(null);
    } catch {
      showToast("Upload failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="upload-card">
        {/* ✅ DOWNLOAD TEMPLATE BUTTON */}
        <button
          className="btn btn-secondary"
          style={{ marginBottom: 12 }}
          onClick={downloadTemplate}
        >
          Download Template
        </button>

        {/* Upload Zone */}
        <div
          className="upload-zone"
          onClick={() => inputRef.current.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files[0]);
          }}
        >
          <p>
            Drop your Excel or CSV file here, or{" "}
            <span style={{ color: "var(--accent)" }}>browse</span>
          </p>
          <small>Supports .xlsx, .xls, .csv — max 10 MB</small>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {/* Required Columns */}
        <div className="required-cols">
          <div className="req-cols-title">Required column headers</div>
          <div className="req-cols-list">
            {[
              "driver_name",
              "purpose",
              "vehicle_type",
              "vehicle_number",
              "in_time",
              "out_time",
              "in_km",
              "out_km",
            ].map((c) => (
              <span key={c} className="badge badge-purple">
                {c}
              </span>
            ))}
          </div>

          <div className="req-cols-note">
            <code>vehicle_type</code> must be one of: Car, Truck, Van, Bike,
            Bus, Other. Dates format: <code>YYYY-MM-DDTHH:MM</code>
          </div>
        </div>
      </div>

      {/* Preview Table */}
      {preview && (
        <div className="table-card" style={{ marginTop: 16 }}>
          <div className="table-card-head">
            <span className="card-title">
              Preview — {preview.rows?.length || 0} rows
            </span>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setPreview(null)}
              >
                Clear
              </button>

              <button
                className={`btn btn-primary${uploading ? " btn-loading" : ""}`}
                onClick={handleConfirmUpload}
                disabled={uploading}
              >
                {uploading
                  ? "Uploading…"
                  : `Upload ${preview.rows?.length} rows`}
              </button>
            </div>
          </div>

          {/* Errors */}
          {preview.errors?.length > 0 && (
            <div className="upload-errors">
              <strong>Validation warnings:</strong>
              {preview.errors.slice(0, 5).map((e, i) => (
                <div key={i} className="upload-error-row">
                  Row {e.row}: {e.msg}
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {preview.headers?.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows?.slice(0, 8).map((row, i) => (
                  <tr key={i}>
                    {preview.headers?.map((h) => (
                      <td key={h}>{row[h] ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  PROFILE PAGE
// ══════════════════════════════════════════════════════════════════
function ProfilePage({ user, onUserUpdate, onLogout }) {
  const [tab, setTab] = useState("info");
  const [form, setForm] = useState({
    full_name: user.full_name || "",
    username: user.username || "",
    email: user.email || "",
  });
  const [pwd, setPwd] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [show, setShow] = useState({ cur: false, new: false, con: false });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: "", type: "success" });

  const showToast = (msg, type = "success") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500);
  };

  const handleInfoSubmit = async (ev) => {
    ev.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json();
      if (res.ok) {
        const updated = { ...user, ...data.user };
        localStorage.setItem("user", JSON.stringify(updated));
        if (data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem(
            "tokenExpiry",
            String(Date.now() + 6 * 60 * 60 * 1000),
          );
        }
        onUserUpdate(updated);
        showToast("Profile updated!");
      } else showToast(data.message || "Update failed", "error");
    } catch {
      showToast("Server error.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePwdSubmit = async (ev) => {
    ev.preventDefault();
    if (pwd.new_password !== pwd.confirm_password) {
      showToast("Passwords do not match", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          current_password: pwd.current_password,
          new_password: pwd.new_password,
        }),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json();
      if (res.ok) {
        showToast("Password changed!");
        setPwd({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
      } else showToast(data.message || "Failed", "error");
    } catch {
      showToast("Server error.", "error");
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === "admin";

  return (
    <div style={{ maxWidth: 540 }}>
      <div className="profile-header-card">
        <div
          className={`u-avatar ${isAdmin ? "av-admin" : "av-driver"}`}
          style={{ width: 56, height: 56, fontSize: 22, marginBottom: 10 }}
        >
          {getInitials(user.full_name)}
        </div>
        <div className="profile-name">{user.full_name}</div>
        <div className="profile-role-label">
          {isAdmin ? "Administrator" : "Driver"} · {user.email}
        </div>
      </div>
      <div className="profile-tabs">
        <button
          className={`ptab${tab === "info" ? " ptab-active" : ""}`}
          onClick={() => setTab("info")}
        >
          Profile info
        </button>
        <button
          className={`ptab${tab === "pwd" ? " ptab-active" : ""}`}
          onClick={() => setTab("pwd")}
        >
          Change password
        </button>
      </div>
      {tab === "info" && (
        <div className="table-card">
          <form onSubmit={handleInfoSubmit} noValidate>
            <div className="form-grid-2">
              <div className="auth-field">
                <label>Full name *</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, full_name: e.target.value }))
                  }
                />
              </div>
              <div className="auth-field">
                <label>Username *</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, username: e.target.value }))
                  }
                />
              </div>
              <div className="auth-field" style={{ gridColumn: "1/-1" }}>
                <label>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                type="submit"
                className={`btn btn-primary${loading ? " btn-loading" : ""}`}
                disabled={loading}
              >
                {loading ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
      {tab === "pwd" && (
        <div className="table-card">
          <form onSubmit={handlePwdSubmit} noValidate>
            {[
              [
                "cur",
                "current_password",
                "Current password",
                "Enter current password",
              ],
              ["new", "new_password", "New password", "Min. 6 characters"],
              [
                "con",
                "confirm_password",
                "Confirm new password",
                "Re-enter new password",
              ],
            ].map(([k, field, label, ph]) => (
              <div className="auth-field" key={field}>
                <label>{label}</label>
                <div className="pwd-wrap">
                  <input
                    type={show[k] ? "text" : "password"}
                    value={pwd[field]}
                    placeholder={ph}
                    onChange={(e) =>
                      setPwd((p) => ({ ...p, [field]: e.target.value }))
                    }
                  />
                  <EyeBtn
                    show={show[k]}
                    toggle={() => setShow((s) => ({ ...s, [k]: !s[k] }))}
                  />
                </div>
              </div>
            ))}
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                type="submit"
                className={`btn btn-primary${loading ? " btn-loading" : ""}`}
                disabled={loading}
              >
                {loading ? "Changing…" : "Change password"}
              </button>
            </div>
          </form>
        </div>
      )}
      <Toast toast={toast} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  STATS BAR
// ══════════════════════════════════════════════════════════════════
function StatsBar({ onLogout }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/driver-log/stats`, {
          headers: authHeaders(),
        });
        if (res.status === 401) {
          onLogout();
          return;
        }
        if (res.ok) setStats(await res.json());
      } catch {}
    })();
  }, [onLogout]);
  if (!stats) return null;
  return (
    <div className="stats-row">
      <StatCard
        label="Total trips"
        value={stats.total_logs}
        sub="All time"
        accent
      />
      <StatCard
        label="Today's trips"
        value={stats.logs_today}
        sub={`Top: ${stats.top_driver || "—"}`}
      />
      <StatCard
        label="Total distance"
        value={`${Number(stats.total_km || 0).toLocaleString()} km`}
        sub="All logs"
      />
      <StatCard
        label="Active drivers"
        value={stats.active_drivers ?? "—"}
        sub="Registered"
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  MAIN APP SHELL
// ══════════════════════════════════════════════════════════════════
function AppShell({ user, onLogout, onUserUpdate }) {
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSessionWarn, setShowSessionWarn] = useState(false);
  const sessionRef = useRef();
  const isAdmin = user?.role === "admin";

  const pageLabels = {
    dashboard: "Dashboard",
    drivers: "Driver management",
    logs: isAdmin ? "Trip logs" : "My trips",
    bulk: "Bulk upload",
    profile: "My profile",
    settings: "Settings",
  };

  const handleRefreshSession = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem(
          "tokenExpiry",
          String(Date.now() + 6 * 60 * 60 * 1000),
        );
        setShowSessionWarn(false);
      } else handleLogout();
    } catch {
      handleLogout();
    }
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    window.location.reload();
  }, []);
  useEffect(() => {
    const check = () => {
      if (isTokenExpired()) {
        clearInterval(sessionRef.current);
        handleLogout();
        return;
      }
      const remaining = getTokenExpiry() - Date.now();
      setShowSessionWarn(remaining < 5 * 60 * 1000 && remaining > 0);
    };
    check();
    sessionRef.current = setInterval(check, 60000);
    return () => clearInterval(sessionRef.current);
  }, [handleLogout]);

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return (
          <div>
            <StatsBar onLogout={handleLogout} />
            <LogsPage user={user} onLogout={handleLogout} />
          </div>
        );
      case "drivers":
        return isAdmin ? <DriversPage onLogout={handleLogout} /> : null;
      case "logs":
        return <LogsPage user={user} onLogout={handleLogout} />;
      case "bulk":
        return isAdmin ? <BulkUploadPage onLogout={handleLogout} /> : null;
      case "profile":
        return (
          <ProfilePage
            user={user}
            onUserUpdate={onUserUpdate}
            onLogout={handleLogout}
          />
        );
      case "settings":
        return <SettingsPage />;
      default:
        return null;
    }
  };

  return (
    <div className="app-shell">
      {showSessionWarn && (
        <SessionWarning
          onRefresh={handleRefreshSession}
          onLogout={handleLogout}
        />
      )}
      <Sidebar
        user={user}
        activePage={page}
        onNavigate={setPage}
        collapsed={!sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onLogout={handleLogout}
      />
      <div className="main-area">
        <Topbar
          title={pageLabels[page] || page}
          user={user}
          onLogout={handleLogout}
        />
        <main className="main-content">{renderPage()}</main>
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div style={{ maxWidth: 500 }}>
      <div className="table-card">
        <div className="settings-title">System preferences</div>
        {[
          ["Email notifications", "Receive alerts for new trip logs"],
          ["Session warning", "Warn 5 min before JWT expiry"],
          ["Show KM on dashboard", "Display total km in stats bar"],
        ].map(([label, desc]) => (
          <div className="settings-row" key={label}>
            <div>
              <div className="settings-label">{label}</div>
              <div className="settings-desc">{desc}</div>
            </div>
            <button
              className="toggle-btn-el on"
              onClick={(e) => e.currentTarget.classList.toggle("on")}
            ></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  ROOT
// ══════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("login");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const saved = localStorage.getItem("user");
    if (token && saved && Date.now() < getTokenExpiry()) {
      setUser(JSON.parse(saved));
      setScreen("app");
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("tokenExpiry");
    }
  }, []);

  if (screen === "register")
    return <RegisterScreen onGoLogin={() => setScreen("login")} />;
  if (screen === "app")
    return (
      <AppShell
        user={user}
        onLogout={() => {
          setUser(null);
          setScreen("login");
        }}
        onUserUpdate={(u) => setUser(u)}
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
