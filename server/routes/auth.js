import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma.js";
import { signToken, requireAuth } from "../lib/auth.js";

const router = Router();

const CANTEEN_PASSCODE = process.env.CANTEEN_ADMIN_PASSCODE || "niet2006";
const SUPER_PASSCODE = process.env.SUPER_ADMIN_PASSCODE || "pkdas";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Try again in 15 minutes." },
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password, role = "student", canteenId, mode = "login" } = req.body;

    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Invalid email" });
    if (password.length < 4) return res.status(400).json({ error: "Password too short" });

    // ADMIN FLOW
    if (role === "admin") {
      const isSuper = !canteenId;
      const expected = isSuper ? SUPER_PASSCODE : CANTEEN_PASSCODE;
      if (password !== expected) {
        return res.status(401).json({
          error: isSuper
            ? "Incorrect Super Admin passcode."
            : "Incorrect canteen admin passcode.",
        });
      }

      if (canteenId) {
        const canteen = await prisma.canteen.findUnique({ where: { id: canteenId } });
        if (!canteen) return res.status(400).json({ error: "Invalid canteen" });
      }

      const finalRole = isSuper ? "super_admin" : "admin";
      const user = await prisma.user.upsert({
        where: { email },
        update: { role: finalRole, canteenId: canteenId || null },
        create: {
          email,
          passwordHash: "",
          role: finalRole,
          canteenId: canteenId || null,
        },
      });

      return res.json({ token: signToken(user), user: sanitize(user) });
    }

    // STUDENT FLOW
    let user = await prisma.user.findUnique({ where: { email } });

    if (mode === "register") {
      if (user) return res.status(409).json({ error: "An account with this email already exists. Sign in instead." });
      const hash = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: { email, passwordHash: hash, role: "student" },
      });
      return res.json({ token: signToken(user), user: sanitize(user) });
    }

    if (!user) return res.status(401).json({ error: "No account found. Create one first." });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Wrong password" });

    res.json({ token: signToken(user), user: sanitize(user) });
  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/profile", requireAuth, async (req, res) => {
  try {
    const { name, dept, year } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(dept !== undefined && { dept }),
        ...(year !== undefined && { year }),
      },
    });
    res.json({ user: sanitize(user), token: signToken(user) });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: sanitize(user) });
});

function sanitize(u) {
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

export default router;