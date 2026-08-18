import { prisma } from "../lib/prisma.js";
import { requireAuth, setCors } from "../lib/auth.js";

function makeToken(canteenId) {
  const prefix =
    canteenId === "spicy" ? "S"
    : canteenId === "cafeteria" ? "C"
    : canteenId === "nehru" ? "N"
    : canteenId === "juice" ? "J"
    : "X";
  return `${prefix}-${String(Math.floor(10 + Math.random() * 89)).padStart(3, "0")}`;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const auth = requireAuth(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    try {
      const where = auth.role === "admin" || auth.role === "super_admin"
        ? (auth.canteenId ? { canteenId: auth.canteenId } : {})
        : { userId: auth.id };

      const orders = await prisma.order.findMany({
        where,
        include: { items: true, canteen: true },
        orderBy: { placedAt: "desc" },
      });
      return res.json({ orders });
    } catch (e) {
      return res.status(500).json({ error: "Failed to fetch orders" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const where = auth.role === "admin" || auth.role === "super_admin"
        ? (auth.canteenId ? { canteenId: auth.canteenId } : {})
        : { userId: auth.id };

      const userOrders = await prisma.order.findMany({ where, select: { id: true } });
      const orderIds = userOrders.map((o) => o.id);

      if (orderIds.length > 0) {
        await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      }
      return res.json({ ok: true, deletedCount: orderIds.length });
    } catch (e) {
      return res.status(500).json({ error: "Failed to delete orders" });
    }
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { canteenId, items, mode, location, payment } = req.body;
    if (!canteenId || !items?.length || !mode || !payment) {
      return res.status(400).json({ error: "Missing order fields" });
    }

    const canteen = await prisma.canteen.findUnique({ where: { id: canteenId } });
    if (!canteen) return res.status(400).json({ error: "Invalid canteen" });

    const foodIds = items.map((i) => Number(i.foodId));
    const foods = await prisma.food.findMany({ where: { id: { in: foodIds } } });
    if (foods.length !== foodIds.length) return res.status(400).json({ error: "Invalid item in order" });

    const foodMap = new Map(foods.map((f) => [f.id, f]));
    const orderItems = items.map((i) => {
      const f = foodMap.get(Number(i.foodId));
      return {
        foodId: f.id,
        name: f.name,
        emoji: f.emoji,
        price: f.price,
        qty: Math.max(1, Math.min(20, Number(i.qty) || 1)),
      };
    });
    const total = orderItems.reduce((s, i) => s + i.price * i.qty, 0);

    if (payment === "wallet") {
      const user = await prisma.user.findUnique({ where: { id: auth.id } });
      if (user.wallet < total) return res.status(400).json({ error: "Insufficient wallet balance" });
      await prisma.user.update({ where: { id: user.id }, data: { wallet: user.wallet - total } });
    }

    const order = await prisma.order.create({
      data: {
        token: makeToken(canteenId),
        userId: auth.id,
        canteenId,
        total,
        mode,
        block: location?.block ?? null,
        room: location?.room ?? null,
        rowNum: location?.row ?? null,
        desk: location?.desk ?? null,
        payment,
        paymentStatus: payment === "counter-cash" ? "pending" : "paid",
        stage: 0,
        etaMin: canteen.waitMax + (mode === "delivery" ? 3 : 0),
        studentName: auth.name || "Guest",
        items: { create: orderItems },
      },
      include: { items: true, canteen: true },
    });

    res.json({ order });
  } catch (e) {
    console.error("Order error:", e);
    res.status(500).json({ error: "Failed to place order" });
  }
}