import express from "express";
import cors from "cors";
import "dotenv/config";
import { prisma } from "./lib/prisma.js";
import authRoutes from "./routes/auth.js";
import canteenRoutes from "./routes/canteens.js";
import foodRoutes from "./routes/foods.js";
import orderRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || "*")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Blocked by CORS: " + origin));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    name: "CampusBite API",
    version: "1.0.0",
    endpoints: [
      "GET  /api/health",
      "POST /api/auth/login",
      "GET  /api/canteens",
      "GET  /api/foods?canteenId=...",
      "POST /api/orders  (auth)",
      "GET  /api/orders/mine  (auth)",
      "GET  /api/admin/kpis  (admin)",
    ],
  });
});

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "connected", time: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, db: "disconnected", error: e.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/canteens", canteenRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`\nCampusBite API running on http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/api/health\n`);
});