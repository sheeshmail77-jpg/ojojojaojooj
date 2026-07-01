// backend/db.js — SQLite schema + helpers
const Database = require("better-sqlite3");
const path     = require("path");
const bcrypt   = require("bcryptjs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const db = new Database(path.join(__dirname, "../data/auth.db"));

// ── Enable WAL for concurrency ────────────────────────────
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS owners (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT    NOT NULL UNIQUE,
    password_hash TEXT   NOT NULL,
    created_at   INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id   TEXT    UNIQUE,
    username     TEXT    NOT NULL,
    key          TEXT    NOT NULL UNIQUE,
    hwid         TEXT,
    role         TEXT    NOT NULL DEFAULT 'user',
    whitelisted  INTEGER NOT NULL DEFAULT 1,
    created_at   INTEGER DEFAULT (unixepoch()),
    expires_at   INTEGER DEFAULT NULL
  );

  CREATE TABLE IF NOT EXISTS scripts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL UNIQUE,
    version       TEXT    NOT NULL DEFAULT '1.0.0',
    source_enc    TEXT    NOT NULL,
    iv            TEXT    NOT NULL,
    active        INTEGER NOT NULL DEFAULT 1,
    created_at    INTEGER DEFAULT (unixepoch()),
    updated_at    INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER REFERENCES users(id),
    action     TEXT    NOT NULL,
    detail     TEXT,
    ip         TEXT,
    ts         INTEGER DEFAULT (unixepoch())
  );
`);

// ── Seed owner on first run ───────────────────────────────
const seedOwner = db.transaction(() => {
  const exists = db.prepare("SELECT id FROM owners WHERE username = ?")
                   .get(process.env.OWNER_USERNAME);
  if (!exists) {
    const hash = bcrypt.hashSync(process.env.OWNER_PASSWORD, 12);
    db.prepare("INSERT INTO owners (username, password_hash) VALUES (?, ?)")
      .run(process.env.OWNER_USERNAME, hash);
    console.log(`[DB] Owner '${process.env.OWNER_USERNAME}' seeded.`);
  }
});
seedOwner();

// ── Helpers ───────────────────────────────────────────────
const stmt = {
  // owners
  getOwner:         db.prepare("SELECT * FROM owners WHERE username = ?"),

  // users
  getUserByKey:     db.prepare("SELECT * FROM users WHERE key = ? AND whitelisted = 1"),
  getUserByDiscord: db.prepare("SELECT * FROM users WHERE discord_id = ?"),
  listUsers:        db.prepare("SELECT id,discord_id,username,key,hwid,role,whitelisted,created_at,expires_at FROM users ORDER BY id DESC"),
  addUser:          db.prepare("INSERT INTO users (discord_id,username,key,role) VALUES (@discord_id,@username,@key,@role)"),
  updateHwid:       db.prepare("UPDATE users SET hwid = ? WHERE key = ?"),
  resetHwid:        db.prepare("UPDATE users SET hwid = NULL WHERE key = ?"),
  resetHwidById:    db.prepare("UPDATE users SET hwid = NULL WHERE discord_id = ?"),
  setWhitelist:     db.prepare("UPDATE users SET whitelisted = ? WHERE discord_id = ?"),
  deleteUser:       db.prepare("DELETE FROM users WHERE discord_id = ?"),

  // scripts
  getScriptByName:  db.prepare("SELECT * FROM scripts WHERE name = ? AND active = 1"),
  getActiveScript:  db.prepare("SELECT * FROM scripts WHERE active = 1 ORDER BY id DESC LIMIT 1"),
  listScripts:      db.prepare("SELECT id,name,version,active,created_at,updated_at FROM scripts ORDER BY id DESC"),
  upsertScript:     db.prepare(`
    INSERT INTO scripts (name,version,source_enc,iv)
    VALUES (@name,@version,@source_enc,@iv)
    ON CONFLICT(name) DO UPDATE SET
      source_enc = excluded.source_enc,
      iv         = excluded.iv,
      version    = excluded.version,
      updated_at = unixepoch()
  `),
  setScriptActive:  db.prepare("UPDATE scripts SET active = ? WHERE id = ?"),

  // logs
  addLog: db.prepare("INSERT INTO logs (user_id,action,detail,ip) VALUES (?,?,?,?)"),
  getLogs: db.prepare("SELECT l.*,u.username FROM logs l LEFT JOIN users u ON l.user_id=u.id ORDER BY l.ts DESC LIMIT 100"),
};

module.exports = { db, stmt };
