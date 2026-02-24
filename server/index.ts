import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { serveStatic } from "./static";
import http from "http";

const app = express();

// Настройки безопасности (исправляют ошибку со шрифтами в консоли)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:", "https://*.supabase.co"],
        "connect-src": ["'self'", "https://*.supabase.co"],
      },
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Логгер
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

(async () => {
  try {
    // 1. Инициализация авторизации (Passport + Sessions)
    setupAuth(app);

    // 2. Инициализация роутов (API и база)
    const httpServer = await registerRoutes(app);

    // 3. Глобальный обработчик ошибок
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("🚨 Server Error:", err);
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });

    // 4. Статика или Vite
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen({ port, host: "0.0.0.0" }, () => {
      log(`serving on port ${port}`);
    });
  } catch (err) {
    console.error("🚨 Server failed to start:", err);
    process.exit(1);
  }
})();
