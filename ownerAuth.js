// backend/middleware/ownerAuth.js — JWT guard for owner-only routes
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

module.exports = function ownerAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.owner = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
