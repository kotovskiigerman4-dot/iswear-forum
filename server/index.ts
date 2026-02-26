import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes"; // Теперь импортируем из локальной папки server
import { setupAuth } from "./auth";
import { serveStatic } from "./static";
import { log } from "./utils"; // Предполагаем, что log вынесен, либо оставь функцию ниже

const app = express();

// 1. ДОВЕРИЕ ПРОКСИ (Обязательно для Render, чтобы работали куки/сессии)
app.set("trust proxy", 1);

// 2. БАЗОВЫЕ ПАРСЕРЫ (Должны быть ПЕРЕД setupAuth и роутами)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 3. НАСТРОЙКИ БЕЗОПАСНОСТИ HELMET (Твои CSP правила)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:", "https://*.supabase.co", "https://*.bing.net", "https://*.mm.bing.net", "https:"],
        "connect-src": ["'self'", "https://*.supabase.co"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// Логгер (если он нужен именно внутри этого файла)
export function internalLog(message: string, source = "express") {
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
    // 4. ИНИЦИАЛИЗАЦИЯ АВТОРИЗАЦИИ (Passport, сессии)
    setupAuth(app);

    // 5. РЕГИСТРАЦИЯ РОУТОВ (Твой большой API из server/routes.ts)
    const httpServer = await registerRoutes(app);

    // 6. ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ОШИБОК
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("🚨 Server Error:", err);
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });

    // 7. СТАТИКА ИЛИ VITE (Всегда после API роутов)
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen({ port, host: "0.0.0.0" }, () => {
      internalLog(`serving on port ${port}`);
    });
  } catch (err) {
    console.error("🚨 Server failed to start:", err);
    process.exit(1);
  }
})();
