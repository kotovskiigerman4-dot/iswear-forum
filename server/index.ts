// @ts-nocheck
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes"; 
import { setupAuth } from "./auth";
import { serveStatic } from "./static";
import path from "path";

const app = express();

// 1. ДОВЕРИЕ ПРОКСИ (Критично для Render, чтобы сессии не слетали)
app.set("trust proxy", 1);

// 2. БАЗОВЫЕ ПАРСЕРЫ
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 3. ЛОГГЕР ЗАПРОСОВ (Поможет увидеть, куда бьет фронтенд)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      internalLog(`${req.method} ${path} ${res.statusCode} in ${duration}ms`, "api");
    }
  });
  next();
});

// 4. HELMET (CSP Настройки)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:", "https://*.supabase.co", "https://*.bing.net", "https://*.mm.bing.net", "https:", "https://api.dicebear.com"],
        "connect-src": ["'self'", "https://*.supabase.co", "https://iswear-forum.onrender.com"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

export function internalLog(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

(async () => {
  try {
    internalLog("Initializing system...");

    // 5. АВТОРИЗАЦИЯ
    // ВАЖНО: Убедись, что в auth.ts у PostgresStore стоит createTableIfMissing: false
    setupAuth(app);
    internalLog("Auth initialized", "auth");

    // 6. РЕГИСТРАЦИЯ API РОУТОВ
    const httpServer = await registerRoutes(app);
    internalLog("API Routes registered", "routes");

    // 7. ОБРАБОТЧИК ОШИБОК API (Чтобы вместо 404/HTML возвращал JSON)
    app.use("/api", (req, res) => {
      res.status(404).json({ message: `API route ${req.path} not found` });
    });

    // 8. ГЛОБАЛЬНЫЙ ERROR HANDLER
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("🚨 Server Error:", err);
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });

    // 9. СТАТИКА (Только для продакшена)
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen({ port, host: "0.0.0.0" }, () => {
      internalLog(`Server online at port ${port}`);
    });
  } catch (err) {
    console.error("🚨 CRITICAL: Server failed to start:", err);
    process.exit(1);
  }
})();
