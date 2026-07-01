// backend/routes/script.js — upload source (owner only) + secure fetch (Roblox)
const router    = require("express").Router();
const crypto    = require("crypto");
const ownerAuth = require("../middleware/ownerAuth");
const { stmt }  = require("../db");
const { encrypt, decrypt, wrapScript } = require("../crypto");

// ─────────────────────────────────────────────────────────
//  OWNER: upload / update a script
//  POST /api/script/upload
//  body: { name, version, source }   (source = raw Lua text)
// ─────────────────────────────────────────────────────────
router.post("/upload", ownerAuth, (req, res) => {
  const { name, version = "1.0.0", source } = req.body;
  if (!name || !source)
    return res.status(400).json({ error: "name and source required" });

  const { ciphertext, iv } = encrypt(source);
  stmt.upsertScript.run({ name, version, source_enc: ciphertext, iv });
  res.json({ message: `Script '${name}' saved (v${version})` });
});

// OWNER: list scripts
// GET /api/script/list
router.get("/list", ownerAuth, (req, res) => {
  res.json(stmt.listScripts.all());
});

// OWNER: toggle active state
// PATCH /api/script/active
router.patch("/active", ownerAuth, (req, res) => {
  const { id, active } = req.body;
  if (id == null || active == null)
    return res.status(400).json({ error: "id and active required" });
  stmt.setScriptActive.run(active ? 1 : 0, id);
  res.json({ message: "Updated" });
});

// ─────────────────────────────────────────────────────────
//  ROBLOX: validate key + HWID, return wrapped script
//  POST /api/script/fetch
//  body: { key, hwid, script_name? }
// ─────────────────────────────────────────────────────────
router.post("/fetch", (req, res) => {
  const { key, hwid, script_name } = req.body;
  if (!key || !hwid)
    return res.status(400).json({ error: "key and hwid required" });

  // 1. Validate key
  const user = stmt.getUserByKey.get(key);
  if (!user)
    return res.status(403).json({ error: "Invalid key or not whitelisted" });

  // 2. HWID check — bind on first use, reject mismatch after that
  if (!user.hwid) {
    stmt.updateHwid.run(hwid, key);
  } else if (user.hwid !== hwid) {
    stmt.addLog.run(user.id, "HWID_MISMATCH", hwid, req.ip);
    return res.status(403).json({ error: "HWID mismatch — contact support" });
  }

  // 3. Check expiry
  if (user.expires_at && Math.floor(Date.now() / 1000) > user.expires_at)
    return res.status(403).json({ error: "Key expired" });

  // 4. Pull script
  const script = script_name
    ? stmt.getScriptByName.get(script_name)
    : stmt.getActiveScript.get();

  if (!script)
    return res.status(404).json({ error: "No active script found" });

  // 5. Decrypt + wrap
  const source      = decrypt(script.source_enc, script.iv);
  const delivToken  = crypto.randomBytes(16).toString("hex");
  const wrapped     = wrapScript(source, key, delivToken);

  stmt.addLog.run(user.id, "SCRIPT_FETCH", script.name, req.ip);

  res.json({ script: wrapped, version: script.version });
});

// ─────────────────────────────────────────────────────────
//  ROBLOX: validate key only (for the panel auth check)
//  POST /api/script/validate
//  body: { key, hwid }
// ─────────────────────────────────────────────────────────
router.post("/validate", (req, res) => {
  const { key, hwid } = req.body;
  if (!key || !hwid)
    return res.status(400).json({ ok: false, error: "key and hwid required" });

  const user = stmt.getUserByKey.get(key);
  if (!user)
    return res.json({ ok: false, error: "Invalid key" });

  if (user.expires_at && Math.floor(Date.now() / 1000) > user.expires_at)
    return res.json({ ok: false, error: "Key expired" });

  // Bind HWID on first validation if not yet set
  if (!user.hwid) {
    stmt.updateHwid.run(hwid, key);
  } else if (user.hwid !== hwid) {
    return res.json({ ok: false, error: "HWID mismatch" });
  }

  stmt.addLog.run(user.id, "VALIDATE", null, req.ip);
  res.json({ ok: true, username: user.username, role: user.role });
});

module.exports = router;
