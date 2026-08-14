import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireAdmin, scopeCanteen } from "../lib/auth.js";

const router = Router();

router.get("/", async (_req, res) => {
  const canteens = await prisma.canteen.findMany({ orderBy: { id: "asc" } });
  res.json({ canteens });
});

router.get("/:id", async (req, res) => {
  const canteen = await prisma.canteen.findUnique({ where: { id: req.params.id } });
  if (!canteen) return res.status(404).json({ error: "Canteen not found" });
  res.json({ canteen });
});

router.patch("/:id/status", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["open", "busy", "closed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  if (!scopeCanteen(req, id)) {
    return res.status(403).json({ error: "You can only manage your own canteen" });
  }
  const canteen = await prisma.canteen.update({
    where: { id },
    data: { status },
  });
  res.json({ canteen });
});

export default router;