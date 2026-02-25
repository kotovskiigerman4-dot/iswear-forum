import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { createClient } from '@supabase/supabase-js';

// Настройка клиента Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || "", 
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // --- API ЗАГРУЗКИ ФАЙЛОВ ---
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      if (!process.env.SUPABASE_URL) {
        const b64 = req.file.buffer.toString("base64");
        return res.json({ url: `data:${req.file.mimetype};base64,${b64}` });
      }

      const file = req.file;
      const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${file.originalname.split('.').pop()}`;
      
      const { data, error } = await supabase.storage
        .from('avatars') 
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

  app.get("/api/users", async (_req, res) => {
    try {
      const allUsers = await storage.listUsers();
      
      const roleWeight: Record<string, number> = {
        "ADMIN": 1,
        "MODERATOR": 2,
        "OLDGEN": 3,
        "MEMBER": 4,
        "USER": 5
      };

      const sortedUsers = allUsers.sort((a, b) => {
        const weightA = roleWeight[a.role] || 100;
        const weightB = roleWeight[b.role] || 100;
        
        if (weightA !== weightB) return weightA - weightB;
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });

      const safeUsers = sortedUsers.map(({ passwordHash, email, ...user }) => user);
      res.json(safeUsers);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch neural nodes" });
    }
  });

  app.get(["/api/users/:id", "/api/profile/:id"], async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid user ID" });

      const user = await storage.getUser(id);
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

  // --- АДМИНКА И МОДЕРАЦИЯ ---
  
  // Разрешаем модераторам видеть список пользователей в админке
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const isStaff = req.user.role === "ADMIN" || req.user.role === "MODERATOR";
    if (!isStaff) return res.sendStatus(403);

    try {
      const users = await storage.listUsers();
      res.json(users);
    } catch (e) {
      res.status(500).json({ message: "Failed to load admin users" });
    }
  });

  // Разрешаем модераторам изменять статусы и выдавать роли (кроме высших)
  app.patch("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const isStaff = req.user.role === "ADMIN" || req.user.role === "MODERATOR";
    if (!isStaff) return res.sendStatus(403);

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    try {
      // Защита: Модераторы не могут выдавать роли ADMIN или MODERATOR
      if (req.user.role === "MODERATOR") {
        const newRole = req.body.role;
        if (newRole === "ADMIN" || newRole === "MODERATOR") {
          return res.status(403).json({ 
            message: "ACCESS DENIED: Moderators cannot grant staff privileges." 
          });
        }
      }

      const updated = await storage.updateUser(id, req.body);
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // --- ФОРУМ (КАТЕГОРИИ) ---
  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (e) {
      res.status(500).json({ message: "Failed to load categories" });
    }
  });

  app.get("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid category ID" });
      const category = await storage.getCategory(id);
      if (!category) return res.status(404).json({ message: "Category not found" });
      res.json(category);
    } catch (e) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- ТРЕДЫ И ПОСТЫ ---
  app.get("/api/threads/:id", async (req, res) => {
    try {
      const thread = await storage.getThread(parseInt(req.params.id));
      if (!thread) return res.status(404).json({ message: "Thread not found" });
      res.json(thread);
    } catch (e) {
      res.status(500).json({ message: "Error loading thread" });
    }
  });

  app.post("/api/threads", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const thread = await storage.createThread({
        ...req.body,
        categoryId: parseInt(req.body.categoryId),
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
        threadId: parseInt(req.body.threadId),
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
