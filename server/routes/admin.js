import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireAdmin, scopeCanteen } from "../lib/auth.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/orders", async (req, res) => {
  const where = req.user.role === "super_admin"
    ? {}
    : { canteenId: req.user.canteenId };
  const orders = await prisma.order.findMany({
    where,
    include: { items: true, user: { select: { name: true, email: true } }, canteen: true },
    orderBy: { placedAt: "desc" },
  });
  res.json({ orders });
});

router.get("/kpis", async (req, res) => {
  const where = req.user.role === "super_admin" ? {} : { canteenId: req.user.canteenId };
  const orders = await prisma.order.findMany({ where, include: { items: true } });

  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.length;
  const avgOrder = totalOrders ? Math.round(revenue / totalOrders) : 0;
  const liveOrders = orders.filter((o) => o.stage < 5).length;
  const paidPct = totalOrders
    ? Math.round((orders.filter((o) => o.paymentStatus === "paid").length / totalOrders) * 100)
    : 0;

  let perCanteen = [];
  if (req.user.role === "super_admin") {
    const canteens = await prisma.canteen.findMany();
    perCanteen = canteens.map((c) => {
      const list = orders.filter((o) => o.canteenId === c.id);
      return {
        canteenId: c.id,
        name: c.name,
        logoUrl: c.logoUrl,
        count: list.length,
        revenue: list.reduce((s, o) => s + o.total, 0),
      };
    });
  }

  const tally = {};
  orders.forEach((o) =>
    o.items.forEach((i) => {
      if (!tally[i.foodId]) tally[i.foodId] = { name: i.name, emoji: i.emoji, qty: 0, revenue: 0 };
      tally[i.foodId].qty += i.qty;
      tally[i.foodId].revenue += i.price * i.qty;
    })
  );
  const topDishes = Object.values(tally).sort((a, b) => b.qty - a.qty).slice(0, 5);

  res.json({ revenue, totalOrders, avgOrder, liveOrders, paidPct, perCanteen, topDishes });
});

router.patch("/orders/:id/advance", async (req, res) => {
  const id = Number(req.params.id);
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (!scopeCanteen(req, order.canteenId)) {
    return res.status(403).json({ error: "Not your canteen's order" });
  }
  const max = order.mode === "pickup" ? 3 : 5;
  const next = Math.min(max, order.stage + 1);
  const updated = await prisma.order.update({
    where: { id },
    data: { stage: next },
    include: { items: true, canteen: true },
  });
  res.json({ order: updated });
});

router.delete("/orders/:id", async (req, res) => {
  const id = Number(req.params.id);
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (!scopeCanteen(req, order.canteenId)) {
    return res.status(403).json({ error: "Not your canteen's order" });
  }
  if (order.payment === "wallet" && order.paymentStatus === "paid") {
    await prisma.user.update({
      where: { id: order.userId },
      data: { wallet: { increment: order.total } },
    });
  }
  await prisma.order.delete({ where: { id } });
  res.json({ ok: true, refunded: order.payment === "wallet" });
});

router.get("/students", async (_req, res) => {
  const students = await prisma.user.findMany({
    where: { role: "student" },
    select: { id: true, email: true, name: true, dept: true, year: true, wallet: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ students });
});

export default router;