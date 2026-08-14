import { prisma } from "../lib/prisma.js";
import { requireAdmin, scopeCanteen, setCors } from "../lib/auth.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      const { canteenId } = req.query;
      const foods = await prisma.food.findMany({
        where: {
          available: true,
          ...(canteenId && { canteenId: String(canteenId) }),
        },
        orderBy: { id: "asc" },
      });
      return res.json({ foods });
    }

    if (req.method === "POST") {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      const b = req.body;
      if (!b.canteenId || !b.name || !b.price) {
        return res.status(400).json({ error: "canteenId, name, price required" });
      }
      if (!scopeCanteen(admin, b.canteenId)) {
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
      return res.json({ food });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}