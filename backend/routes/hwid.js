// backend/routes/hwid.js — HWID reset (owner panel + Roblox self-reset)
const router    = require("express").Router();
const ownerAuth = require("../middleware/ownerAuth");
const { stmt }  = require("../db");

// Owner: reset any user by discord_id
// POST /api/hwid/reset-owner
router.post("/reset-owner", ownerAuth, (req, res) => {
  const { discord_id } = req.body;
  if (!discord_id)
    return res.status(400).json({ error: "discord_id required" });

  const user = stmt.getUserByDiscord.get(discord_id);
  if (!user) return res.status(404).json({ error: "User not found" });

  stmt.resetHwidById.run(discord_id);
  stmt.addLog.run(user.id, "HWID_RESET_OWNER", `owner reset hwid for ${user.username}`, "dashboard");
  res.json({ message: `HWID reset for ${user.username}` });
});

// Roblox: self-reset using own key (counts against a cooldown stored in DB)
// POST /api/hwid/reset-self  body: { key, hwid }
router.post("/reset-self", (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: "key required" });

  const user = stmt.getUserByKey.get(key);
  if (!user) return res.status(403).json({ error: "Invalid key" });

  stmt.resetHwid.run(key);
  stmt.addLog.run(user.id, "HWID_RESET_SELF", null, req.ip);
  res.json({ message: "HWID cleared — next launch will bind a new device" });
});
