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
  // --- MIDDLEWARE: LAST SEEN ---
  app.use((req, _res, next) => {
    if (req.isAuthenticated() && req.user) {
      storage.updateLastSeen(req.user.id).catch(err => {
        console.error("Failed to update last_seen:", err);
      });
    }
    next();
  });

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
        "ADMIN": 1, "MODERATOR": 2, "OLDGEN": 3, "MEMBER": 4, "USER": 5
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

      try { await storage.incrementViewCount(id); } catch(e) {}

      const user = await storage.getUser(id);
      if (!user) return res.status(404).json({ message: "User not found" });
      
      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (e) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/users/:id/threads", async (req, res) => {
    try {
      const threads = await storage.getUserThreads(parseInt(req.params.id));
      res.json(threads);
    } catch (e) {
      res.status(500).json({ message: "Error" });
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
    if (!req.isAuthenticated() || (req.user.role !== "ADMIN" && req.user.role !== "MODERATOR")) {
      return res.sendStatus(403);
    }
    const users = await storage.listUsers();
    res.json(users);
  });

  app.patch("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "ADMIN" && req.user.role !== "MODERATOR")) {
      return res.sendStatus(403);
    }
    const updated = await storage.updateUser(parseInt(req.params.id), req.body);
    res.json(updated);
  });

  // --- КАТЕГОРИИ ---
  app.get("/api/categories", async (_req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  // --- ТРЕДЫ И ПОСТЫ ---
  app.get("/api/threads/:id", async (req, res) => {
    const thread = await storage.getThread(parseInt(req.params.id));
    if (!thread) return res.status(404).json({ message: "Not found" });
    res.json(thread);
  });

  app.post("/api/threads", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
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
  });

  // УДАЛЕНИЕ ТРЕДА
  app.delete("/api/threads/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const thread = await storage.getThread(id);
    if (!thread) return res.sendStatus(404);

    // Удалять может автор, модератор или админ
    const isAuthor = thread.authorId === req.user.id;
    const isStaff = req.user.role === "ADMIN" || req.user.role === "MODERATOR";
    
    if (!isAuthor && !isStaff) return res.sendStatus(403);

    await storage.deleteThread(id);
    res.json({ message: "Thread deleted" });
  });

  app.post("/api/posts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const post = await storage.createPost({
      ...req.body,
      threadId: parseInt(req.body.threadId),
      authorId: req.user.id
    });
    res.json(post);
  });

  // УДАЛЕНИЕ ПОСТА
  app.delete("/api/posts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const post = await storage.getPost(id); // Убедись, что метод getPost есть в storage
    if (!post) return res.sendStatus(404);

    const isAuthor = post.authorId === req.user.id;
    const isStaff = req.user.role === "ADMIN" || req.user.role === "MODERATOR";

    if (!isAuthor && !isStaff) return res.sendStatus(403);

    await storage.deletePost(id);
    res.json({ message: "Post deleted" });
  });

  app.get("/api/stats", async (_req, res) => {
    const userCount = await storage.getUserCount();
    const threadCount = await storage.getThreadCount();
    res.json({ users: userCount, threads: threadCount });
  });

  const httpServer = createServer(app);
  return httpServer;
}
