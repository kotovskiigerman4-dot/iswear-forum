import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import multer from "multer";
import helmet from "helmet";
import { createClient } from '@supabase/supabase-js';

// Настройка клиента Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || "", 
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // Увеличил до 5MB
});

export async function registerRoutes(app: Express): Promise<Server> {
  // 1. Безопасность и CSP (чтобы картинки из облака грузились)
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

  // 2. Инициализация авторизации
  setupAuth(app);

  // --- API ЗАГРУЗКИ ФАЙЛОВ (SUPABASE КИЛЛЕР-ФИЧА) ---
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      // Если ключи Supabase не заданы, откатываемся на base64 (временное решение)
      if (!process.env.SUPABASE_URL) {
        const b64 = req.file.buffer.toString("base64");
        return res.json({ url: `data:${req.file.mimetype};base64,${b64}` });
      }

      const file = req.file;
      const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${file.originalname.split('.').pop()}`;
      
      const { data, error } = await supabase.storage
        .from('avatars') // Убедись, что бакет 'avatars' создан и он Public в Supabase!
        .upload(fileName, file.buffer, { contentType: file.mimetype });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      res.json({ url: publicUrl });
    } catch (e: any) {
      console.error("Upload error:", e);
      res.status(500).json({ message: "Upload failed: " + e.message });
    }
  });

  // --- API ПОЛЬЗОВАТЕЛЕЙ ---
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) return res.status(404).json({ message: "User not found" });
      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (e) {
      res.status(500).json({ message: "Server error" });
    }
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

  // --- АДМИНКА ---
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "ADMIN") return res.sendStatus(403);
    const users = await storage.listUsers();
    res.json(users);
  });

  // --- ФОРУМ ---
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
      await storage.createPost({
        content: req.body.content || "Initial post",
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
    try {
      const userCount = await storage.getUserCount();
      const threadCount = await storage.getThreadCount();
      res.json({ users: userCount, threads: threadCount });
    } catch (e) {
      res.status(500).json({ users: 0, threads: 0 });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
