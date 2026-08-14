import { prisma } from "../../lib/prisma.js";
import { requireAuth, sanitizeUser, signToken, setCors } from "../../lib/auth.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const auth = requireAuth(req, res);
  if (!auth) return;

  try {
    if (req.method === "GET") {
      const user = await prisma.user.findUnique({ where: { id: auth.id } });
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json({ user: sanitizeUser(user) });
    }

    if (req.method === "PATCH") {
      const { name, dept, year } = req.body;
      const user = await prisma.user.update({
        where: { id: auth.id },
        data: {
          ...(name !== undefined && { name }),
          ...(dept !== undefined && { dept }),
          ...(year !== undefined && { year }),
        },
      });
      return res.json({ user: sanitizeUser(user), token: signToken(user) });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
}