// @ts-nocheck
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes"; 
import { setupAuth } from "./auth";
import { serveStatic } from "./static";
import path from "path";

const app = express();

app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 1. ЛОГГЕР
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      console.log(`${new Date().toLocaleTimeString()} [api] ${req.method} ${path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// 2. HELMET
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "img-src": ["'self'", "data:", "https://*.supabase.co", "https:", "https://api.dicebear.com"],
      "connect-src": ["'self'", "https://*.supabase.co", "https://iswear-forum.onrender.com"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

(async () => {
  try {
    // 3. Сначала АУТЕНТИФИКАЦИЯ
    setupAuth(app);

    // 4. РЕГИСТРАЦИЯ РОУТОВ
    const httpServer = await registerRoutes(app);

    if (process.env.NODE_ENV === "production") {
      // Сначала пытаемся отдать статику
      serveStatic(app);
      
      // ИСПРАВЛЕНИЕ ТУТ: Заменили '*' на '(.*)' для совместимости с path-to-regexp v6+
      app.get('(.*)', (req, res, next) => {
        if (req.path.startsWith('/api')) {
          return next(); 
        }
        res.sendFile(path.resolve(__dirname, '..', 'client', 'dist', 'index.html'));
      });
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen({ port, host: "0.0.0.0" }, () => {
      console.log(`[server] Online at port ${port}`);
    });
  } catch (err) {
    console.error("🚨 CRITICAL:", err);
    process.exit(1);
  }
})();
