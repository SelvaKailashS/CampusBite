import { prisma } from "../../lib/prisma.js";
import { requireAuth, setCors } from "../../lib/auth.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const auth = requireAuth(req, res);
  if (!auth) return;

  const id = Number(req.query.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, canteen: true },
    });
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (auth.role === "student" && order.userId !== auth.id) {
      return res.status(403).json({ error: "Not your order" });
    }
    if (auth.role === "admin" && auth.canteenId && order.canteenId !== auth.canteenId) {
      return res.status(403).json({ error: "Order not in your canteen" });
    }

    res.json({ order });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}