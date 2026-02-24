import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import multer from "multer";
import helmet from "helmet";

// Настройка Multer: храним файл в оперативной памяти для конвертации
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 } // Лимит 3МБ
});

export async function registerRoutes(app: Express): Promise<Server> {
  // 1. Настройка безопасности (CSP разрешает data: для картинок в БД)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:", "http:", "*.supabase.co"],
          connectSrc: ["'self'", "https:", "wss:", "ws:", "*.supabase.co"],
        },
      },
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );

  setupAuth(app);

  // --- API ЗАГРУЗКИ ФАЙЛОВ ---
  // Превращает картинку в Base64. Это решает проблему удаления файлов при деплое.
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const b64 = req.file.buffer.toString("base64");
      const dataUrl = `data:${req.file.mimetype};base64,${b64}`;
      res.json({ url: dataUrl });
    } catch (e) {
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // --- API ПОЛЬЗОВАТЕЛЕЙ ---
  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(parseInt(req.params.id));
    if (!user) return res.status(404).json({ message: "User not found" });
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  });

  app.patch("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    if (req.user.id !== id && req.user.role !== "ADMIN") return res.sendStatus(403);
    
    try {
      const updated = await storage.updateUser(id, req.body);
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // --- АДМИНКА (Принятие заявок и управление) ---
  app.patch("/api/users/:id/admin", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "ADMIN") return res.sendStatus(403);
    const id = parseInt(req.params.id);
    try {
      // Если обновляем через админку, можно передавать статус APPROVED/REJECTED
      const updated = await storage.updateUser(id, req.body);
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "ADMIN") return res.sendStatus(403);
    const users = await storage.listUsers();
    res.json(users);
  });

  // --- ФОРУМ: КАТЕГОРИИ, ТРЕДЫ, ПОСТЫ ---
  app.get("/api/categories", async (_req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  app.get("/api/threads/:id", async (req, res) => {
    const thread = await storage.getThread(parseInt(req.params.id));
    if (!thread) return res.status(404).json({ message: "Thread not found" });
    res.json(thread);
  });

  app.post("/api/threads", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const thread = await storage.createThread({
        ...req.body,
        authorId: req.user.id
      });
      // Создаем первый пост автоматически (содержание треда)
      await storage.createPost({
        content: req.body.content,
        threadId: thread.id,
        authorId: req.user.id,
        fileUrl: req.body.fileUrl || null
      });
      res.json(thread);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/posts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const post = await storage.createPost({
        ...req.body,
        authorId: req.user.id
      });
      res.json(post);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/stats", async (_req, res) => {
    const userCount = await storage.getUserCount();
    const threadCount = await storage.getThreadCount();
    res.json({ userCount, threadCount });
  });

  const httpServer = createServer(app);
  return httpServer;
}
