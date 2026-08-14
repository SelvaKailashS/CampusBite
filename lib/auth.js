import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      canteenId: user.canteenId,
      name: user.name,
    },
    SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

export function requireAuth(req, res) {
  const user = verifyToken(req);
  if (!user) {
    res.status(401).json({ error: "Missing or invalid auth token" });
    return null;
  }
  return user;
}

export function requireAdmin(req, res) {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (user.role !== "admin" && user.role !== "super_admin") {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return user;
}

export function scopeCanteen(user, canteenId) {
  if (user.role === "super_admin") return true;
  if (user.canteenId && user.canteenId === canteenId) return true;
  return false;
}

export function sanitizeUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    dept: u.dept,
    year: u.year,
    role: u.role,
    canteenId: u.canteenId,
    wallet: u.wallet,
  };
}

export function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}