import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireAdmin, scopeCanteen } from "../lib/auth.js";

const router = Router();

router.get("/", async (req, res) => {
  const { canteenId } = req.query;
  const foods = await prisma.food.findMany({
    where: {
      available: true,
      ...(canteenId && { canteenId: String(canteenId) }),
    },
    orderBy: { id: "asc" },
  });
  res.json({ foods });
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const b = req.body;
  if (!b.canteenId || !b.name || !b.price) {
    return res.status(400).json({ error: "canteenId, name, price required" });
  }
  if (!scopeCanteen(req, b.canteenId)) {
    return res.status(403).json({ error: "You can only add items to your own canteen" });
  }
  const slug = `${b.canteenId.slice(0, 2)}-${Math.random().toString(36).slice(2, 7)}`;
  const food = await prisma.food.create({
    data: {
      slug,
      canteenId: b.canteenId,
      name: b.name,
      price: b.price,
      emoji: b.emoji || "🍽",
      imageUrl: b.imageUrl || "",
      category: b.category || "snacks",
      diet: b.diet || "veg",
      popular: !!b.popular,
      protein: b.protein ?? null,
      calories: b.calories ?? null,
      description: b.description || "",
      healthTags: b.healthTags || [],
      bg: b.bg || "bg-stone-50",
    },
  });
  res.json({ food });
});

router.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.food.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Food not found" });
  if (!scopeCanteen(req, existing.canteenId)) {
    return res.status(403).json({ error: "You can only edit items in your own canteen" });
  }
  const b = req.body;
  const food = await prisma.food.update({
    where: { id },
    data: {
      ...(b.name !== undefined && { name: b.name }),
      ...(b.price !== undefined && { price: b.price }),
      ...(b.emoji !== undefined && { emoji: b.emoji }),
      ...(b.description !== undefined && { description: b.description }),
      ...(b.category !== undefined && { category: b.category }),
      ...(b.diet !== undefined && { diet: b.diet }),
      ...(b.popular !== undefined && { popular: b.popular }),
      ...(b.available !== undefined && { available: b.available }),
    },
  });
  res.json({ food });
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.food.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Food not found" });
  if (!scopeCanteen(req, existing.canteenId)) {
    return res.status(403).json({ error: "You can only delete items in your own canteen" });
  }
  await prisma.food.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;