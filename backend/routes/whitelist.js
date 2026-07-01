// backend/routes/whitelist.js — CRUD for whitelisted users
const router   = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const ownerAuth = require("../middleware/ownerAuth");
const { stmt }  = require("../db");

// ── All routes below require owner JWT ────────────────────
router.use(ownerAuth);

// GET /api/whitelist  — list all users
router.get("/", (req, res) => {
  res.json(stmt.listUsers.all());
});

// POST /api/whitelist/add
router.post("/add", (req, res) => {
  const { discord_id, username, role = "user" } = req.body;
  if (!discord_id || !username)
    return res.status(400).json({ error: "discord_id and username required" });

  const exists = stmt.getUserByDiscord.get(discord_id);
  if (exists)
    return res.status(409).json({ error: "User already exists", user: exists });

  const key = `AUTH-${uuidv4().replace(/-/g, "").toUpperCase().slice(0, 20)}`;
  stmt.addUser.run({ discord_id, username, key, role });
  const user = stmt.getUserByDiscord.get(discord_id);
  res.json({ message: "User added", user });
});

// PATCH /api/whitelist/toggle  — whitelist on/off
router.patch("/toggle", (req, res) => {
  const { discord_id, whitelisted } = req.body;
  if (!discord_id || whitelisted === undefined)
    return res.status(400).json({ error: "discord_id and whitelisted required" });

  stmt.setWhitelist.run(whitelisted ? 1 : 0, discord_id);
  res.json({ message: `User ${whitelisted ? "whitelisted" : "removed"}` });
});

// DELETE /api/whitelist/delete
router.delete("/delete", (req, res) => {
  const { discord_id } = req.body;
  if (!discord_id)
    return res.status(400).json({ error: "discord_id required" });

  stmt.deleteUser.run(discord_id);
  res.json({ message: "User deleted" });
});

module.exports = router;
