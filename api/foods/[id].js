import { prisma } from "../../lib/prisma.js";
import { requireAdmin, scopeCanteen, setCors } from "../../lib/auth.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const id = Number(req.query.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  try {
    const existing = await prisma.food.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Food not found" });

    if (req.method === "PATCH") {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      if (!scopeCanteen(admin, existing.canteenId)) {
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
      return res.json({ food });
    }

    if (req.method === "DELETE") {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      if (!scopeCanteen(admin, existing.canteenId)) {
        return res.status(403).json({ error: "You can only delete items in your own canteen" });
      }
      await prisma.food.delete({ where: { id } });
      return res.json({ ok: true });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}