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

// @ts-nocheck
// ... (остальной импорт)

// 2. HELMET (Обновленный вариант)
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true, // Загружаем стандартные безопасные настройки
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Разрешаем eval и инлайн скрипты
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
      "img-src": ["'self'", "data:", "https://*.supabase.co", "https:", "https://api.dicebear.com"],
      "connect-src": ["'self'", "https://*.supabase.co", "https://iswear-forum.onrender.com", "wss://iswear-forum.onrender.com"],
      "upgrade-insecure-requests": null, // Отключаем принудительный апгрейд на HTTPS, если Render сам об этом заботится
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
      // Сначала пытаемся отдать статику (js, css, картинки)
      serveStatic(app);
      
      /**
       * ИСПРАВЛЕНИЕ: Используем синтаксис '*any'. 
       * Это именованный wild-card параметр, который корректно работает 
       * в новых версиях path-to-regexp.
       */
      app.get('*any', (req, res, next) => {
        // Если запрос начинается с /api, но не был обработан в registerRoutes,
        // пробрасываем его дальше (он упадет в 404 по API)
        if (req.path.startsWith('/api')) {
          return next(); 
        }
        // Для всех остальных путей (например, /profile/1) отдаем index.html
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
    console.error("🚨 CRITICAL ERROR DURING BOOTSTRAP:", err);
    process.exit(1);
  }
})();
