// backend/server.js — Express entry point
const express    = require("express");
const cors       = require("cors");
const path       = require("path");
const rateLimit  = require("express-rate-limit");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// Ensure data dir exists
const fs = require("fs");
const dataDir = path.join(__dirname, "../data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Init DB (runs schema + seed)
require("./db");

const app = express();

// ── Middleware ────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: "2mb" }));   // scripts can be large
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend")));

// ── Rate limiting ─────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, slow down." },
});

// Stricter limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,  // 10 minutes
  max: 10,
  message: { error: "Too many login attempts." },
});

app.use("/api/", apiLimiter);
app.use("/api/owner/login", authLimiter);

// ── Routes ────────────────────────────────────────────────
app.use("/api/owner",     require("./routes/auth"));
app.use("/api/whitelist", require("./routes/whitelist"));
app.use("/api/hwid",      require("./routes/hwid"));
app.use("/api/script",    require("./routes/script"));

// Logs endpoint (owner only)
const ownerAuth = require("./middleware/ownerAuth");
const { stmt }  = require("./db");
app.get("/api/logs", ownerAuth, (req, res) => {
  res.json(stmt.getLogs.all());
});

// Dashboard stats
app.get("/api/owner/stats", ownerAuth, (req, res) => {
  const { db } = require("./db");
  const users   = db.prepare("SELECT COUNT(*) AS c FROM users WHERE whitelisted=1").get().c;
  const scripts = db.prepare("SELECT COUNT(*) AS c FROM scripts WHERE active=1").get().c;
  const logs    = db.prepare("SELECT COUNT(*) AS c FROM logs WHERE ts > unixepoch()-86400").get().c;
  res.json({ whitelisted_users: users, active_scripts: scripts, actions_24h: logs });
});

// ── SPA fallback ──────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 4040;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🔐  AuthSystem running → http://0.0.0.0:${PORT}`);
  console.log(`    Dashboard → http://0.0.0.0:${PORT}/dashboard.html`);
});
