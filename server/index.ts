import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth"; // ДОБАВИТЬ ЭТО
import { serveStatic } from "./static";
import { log } from "./vite"; // Или оставь свою функцию log, если она в этом файле

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Твой логгер (можно оставить тут или вынести)
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

(async () => {
  try {
    // 1. Сначала настраиваем авторизацию и сессии
    setupAuth(app); 

    // 2. Затем регистрируем API роуты
    const httpServer = await registerRoutes(app);

    // Мидлвар обработки ошибок
    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("🚨 Server Error:", err);
      if (!res.headersSent) res.status(status).json({ message });
    });

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
