import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import { signToken, sanitizeUser, setCors } from "../../lib/auth.js";

const CANTEEN_PASSCODE = process.env.CANTEEN_ADMIN_PASSCODE || "niet2006";
const SUPER_PASSCODE = process.env.SUPER_ADMIN_PASSCODE || "pkdas";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

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

      return res.json({ token: signToken(user), user: sanitizeUser(user) });
    }

    // STUDENT FLOW
    let user = await prisma.user.findUnique({ where: { email } });

    if (mode === "register") {
      if (user) return res.status(409).json({ error: "Account exists. Sign in instead." });
      const hash = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: { email, passwordHash: hash, role: "student" },
      });
      return res.json({ token: signToken(user), user: sanitizeUser(user) });
    }

    if (!user) return res.status(401).json({ error: "No account found. Create one first." });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Wrong password" });

    res.json({ token: signToken(user), user: sanitizeUser(user) });
  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({ error: "Server error" });
  }
}