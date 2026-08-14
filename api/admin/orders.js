import { prisma } from "../../lib/prisma.js";
import { requireAdmin, scopeCanteen, setCors } from "../../lib/auth.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    if (req.method === "GET") {
      const where = admin.role === "super_admin" ? {} : { canteenId: admin.canteenId };
      const orders = await prisma.order.findMany({
        where,
        include: { items: true, user: { select: { name: true, email: true } }, canteen: true },
        orderBy: { placedAt: "desc" },
      });
      return res.json({ orders });
    }

    if (req.method === "PATCH") {
      const { id, action } = req.body;
      const order = await prisma.order.findUnique({ where: { id: Number(id) } });
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (!scopeCanteen(admin, order.canteenId)) {
        return res.status(403).json({ error: "Not your canteen's order" });
      }

      if (action === "advance") {
        const max = order.mode === "pickup" ? 3 : 5;
        const next = Math.min(max, order.stage + 1);
        const updated = await prisma.order.update({
          where: { id: order.id },
          data: { stage: next },
          include: { items: true, canteen: true },
        });
        return res.json({ order: updated });
      }

      return res.status(400).json({ error: "Unknown action" });
    }

    if (req.method === "DELETE") {
      const id = Number(req.query.id);
      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (!scopeCanteen(admin, order.canteenId)) {
        return res.status(403).json({ error: "Not your canteen's order" });
      }
      if (order.payment === "wallet" && order.paymentStatus === "paid") {
        await prisma.user.update({
          where: { id: order.userId },
          data: { wallet: { increment: order.total } },
        });
      }
      await prisma.order.delete({ where: { id } });
      return res.json({ ok: true, refunded: order.payment === "wallet" });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}