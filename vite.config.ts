import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, Plugin } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function apiMiddlewarePlugin(): Plugin {
  return {
    name: "api-middleware",
    configureServer(server) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.startsWith("/api")) return next();

        try {
          const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
          const pathname = url.pathname;

          // Parse query
          req.query = Object.fromEntries(url.searchParams.entries());

          // Parse body if needed
          if (["POST", "PATCH", "PUT"].includes(req.method || "")) {
            const buffers: Uint8Array[] = [];
            for await (const chunk of req) buffers.push(chunk);
            const raw = Buffer.concat(buffers).toString("utf-8");
            try {
              req.body = raw ? JSON.parse(raw) : {};
            } catch {
              req.body = {};
            }
          } else {
            req.body = {};
          }

          // Polyfill res.json and res.status
          if (!res.status) {
            res.status = function (code: number) {
              res.statusCode = code;
              return res;
            };
          }
          if (!res.json) {
            res.json = function (data: any) {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(data));
              return res;
            };
          }

          // Resolve file route
          let filePath = "";
          if (pathname === "/api/health") filePath = path.join(__dirname, "api/health.js");
          else if (pathname === "/api/auth/login") filePath = path.join(__dirname, "api/auth/login.js");
          else if (pathname === "/api/auth/me") filePath = path.join(__dirname, "api/auth/me.js");
          else if (pathname === "/api/canteens") filePath = path.join(__dirname, "api/canteens.js");
          else if (pathname === "/api/foods") filePath = path.join(__dirname, "api/foods.js");
          else if (pathname.startsWith("/api/foods/")) {
            filePath = path.join(__dirname, "api/foods/[id].js");
            req.query.id = pathname.replace("/api/foods/", "");
          } else if (pathname === "/api/orders") filePath = path.join(__dirname, "api/orders.js");
          else if (pathname === "/api/orders/mine") filePath = path.join(__dirname, "api/orders/mine.js");
          else if (pathname.startsWith("/api/orders/")) {
            filePath = path.join(__dirname, "api/orders/[id].js");
            req.query.id = pathname.replace("/api/orders/", "");
          } else if (pathname === "/api/admin/kpis") filePath = path.join(__dirname, "api/admin/kpis.js");
          else if (pathname === "/api/admin/orders") filePath = path.join(__dirname, "api/admin/orders.js");
          else if (pathname === "/api/admin/students") filePath = path.join(__dirname, "api/admin/students.js");

          if (filePath) {
            const fileUrl = pathToFileURL(filePath).href + `?t=${Date.now()}`;
            const mod = await import(fileUrl);
            await mod.default(req, res);
            return;
          }

          res.status(404).json({ error: "Endpoint not found" });
        } catch (e: any) {
          console.error("Local API Handler Error:", e);
          if (!res.headersSent) res.status(500).json({ error: e.message || "Internal server error" });
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), apiMiddlewarePlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});

