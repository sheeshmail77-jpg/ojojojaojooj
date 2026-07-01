// backend/routes/auth.js — owner login → JWT
const router  = require("express").Router();
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const { stmt } = require("../db");
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

// POST /api/owner/login
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Missing credentials" });

  const owner = stmt.getOwner.get(username);
  if (!owner)
    return res.status(401).json({ error: "Invalid credentials" });

  const match = bcrypt.compareSync(password, owner.password_hash);
  if (!match)
    return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { id: owner.id, username: owner.username, role: "owner" },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({ token, username: owner.username });
});

module.exports = router;
