import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

function makeToken(canteenId) {
  const prefix =
    canteenId === "spicy" ? "S"
    : canteenId === "cafeteria" ? "C"
    : canteenId === "nehru" ? "N"
    : canteenId === "juice" ? "J"
    : "X";
  return `${prefix}-${String(Math.floor(10 + Math.random() * 89)).padStart(3, "0")}`;
}

router.get("/mine", requireAuth, async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: { items: true, canteen: true },
    orderBy: { placedAt: "desc" },
  });
  res.json({ orders });
});

router.post("/", requireAuth, async (req, res) => {
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
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (user.wallet < total) return res.status(400).json({ error: "Insufficient wallet balance" });
      await prisma.user.update({ where: { id: user.id }, data: { wallet: user.wallet - total } });
    }

    const order = await prisma.order.create({
      data: {
        token: makeToken(canteenId),
        userId: req.user.id,
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
        studentName: req.user.name || "Guest",
        items: { create: orderItems },
      },
      include: { items: true, canteen: true },
    });

    res.json({ order });
  } catch (e) {
    console.error("Order error:", e);
    res.status(500).json({ error: "Failed to place order" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: Number(req.params.id) },
    include: { items: true, canteen: true },
  });
  if (!order) return res.status(404).json({ error: "Order not found" });

  if (req.user.role === "student" && order.userId !== req.user.id) {
    return res.status(403).json({ error: "Not your order" });
  }
  if (req.user.role === "admin" && req.user.canteenId && order.canteenId !== req.user.canteenId) {
    return res.status(403).json({ error: "Order not in your canteen" });
  }

  res.json({ order });
});

export default router;