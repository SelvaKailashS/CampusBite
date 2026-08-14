import { prisma } from "../../lib/prisma.js";
import { requireAdmin, setCors } from "../../lib/auth.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    const students = await prisma.user.findMany({
      where: { role: "student" },
      select: { id: true, email: true, name: true, dept: true, year: true, wallet: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ students });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}