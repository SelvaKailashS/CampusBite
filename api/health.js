import { prisma } from "../lib/prisma.js";
import { setCors } from "../lib/auth.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ ok: true, db: "connected", time: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, db: "disconnected", error: e.message });
  }
}