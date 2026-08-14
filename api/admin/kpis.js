import { prisma } from "../../lib/prisma.js";
import { requireAdmin, setCors } from "../../lib/auth.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    const where = admin.role === "super_admin" ? {} : { canteenId: admin.canteenId };
    const orders = await prisma.order.findMany({ where, include: { items: true } });

    const revenue = orders.reduce((s, o) => s + o.total, 0);
    const totalOrders = orders.length;
    const avgOrder = totalOrders ? Math.round(revenue / totalOrders) : 0;
    const liveOrders = orders.filter((o) => o.stage < 5).length;
    const paidPct = totalOrders
      ? Math.round((orders.filter((o) => o.paymentStatus === "paid").length / totalOrders) * 100)
      : 0;

    let perCanteen = [];
    if (admin.role === "super_admin") {
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
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}