import { prisma } from "../../lib/prisma.js";
import { requireAuth, setCors } from "../../lib/auth.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const auth = requireAuth(req, res);
  if (!auth) return;

  try {
    const orders = await prisma.order.findMany({
      where: { userId: auth.id },
      include: { items: true, canteen: true },
      orderBy: { placedAt: "desc" },
    });
    res.json({ orders });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}