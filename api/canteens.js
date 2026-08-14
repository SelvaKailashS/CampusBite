import { prisma } from "../lib/prisma.js";
import { requireAdmin, scopeCanteen, setCors } from "../lib/auth.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      const canteens = await prisma.canteen.findMany({ orderBy: { id: "asc" } });
      return res.json({ canteens });
    }

    if (req.method === "PATCH") {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      const { id, status } = req.body;
      if (!id || !["open", "busy", "closed"].includes(status)) {
        return res.status(400).json({ error: "id and valid status required" });
      }
      if (!scopeCanteen(admin, id)) {
        return res.status(403).json({ error: "You can only manage your own canteen" });
      }
      const canteen = await prisma.canteen.update({ where: { id }, data: { status } });
      return res.json({ canteen });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}