import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { createClient } from '@supabase/supabase-js';
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const hashAsync = promisify(scrypt);

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

  // --- API ПОИСКА ---
  app.get("/api/search", async (req, res) => {
    const query = req.query.q as string;
    if (!query || query.length < 2) return res.json([]);
    try {
      const results = await storage.searchThreads(query);
      res.json(results);
    } catch (e) {
      res.status(500).json({ message: "Search failed" });
    }
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

  // --- API ПОЛЬЗОВАТЕЛЕЙ И АДМИН ПАНЕЛЬ ---

  // Список пользователей для админки (полные данные)
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "ADMIN" && req.user.role !== "MODERATOR")) {
      return res.sendStatus(403);
    }
    try {
      const users = await storage.listUsers();
      res.json(users.map(({ passwordHash, ...u }) => u));
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch admin user list" });
    }
  });

  // Обновление пользователя (роль, статус) через админку
  app.patch("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "ADMIN") {
      return res.sendStatus(403);
    }
    try {
      const id = parseInt(req.params.id);
      const updatedUser = await storage.updateUser(id, req.body);
      res.json(updatedUser);
    } catch (e) {
      res.status(500).json({ message: "Update failed" });
    }
  });

  // Публичный список пользователей
  app.get("/api/users", async (req, res) => {
    try {
      const allUsers = await storage.listUsers();
      const isStaff = req.isAuthenticated() && (req.user.role === "ADMIN" || req.user.role === "MODERATOR");
      
      const visibleUsers = isStaff 
        ? allUsers 
        : allUsers.filter(u => u.status === "APPROVED" || u.role === "ADMIN");

      const roleWeight: Record<string, number> = {
        "ADMIN": 1, "MODERATOR": 2, "OLDGEN": 3, "MEMBER": 4, "USER": 5
      };

      const sortedUsers = visibleUsers.sort((a, b) => {
        const weightA = roleWeight[a.role] || 100;
        const weightB = roleWeight[b.role] || 100;
        if (weightA !== weightB) return weightA - weightB;
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });

      const safeUsers = sortedUsers.map(({ passwordHash, email, ...user }) => user);
      res.json(safeUsers);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/by-name/:username", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { passwordHash, email, ...safeUser } = user;
      res.json(safeUser);
    } catch (e) {
      res.status(500).json({ message: "Error fetching user" });
    }
  });

  app.post("/api/user/change-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { oldPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: "Too short" });

    try {
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "Not found" });

      const [hashed, salt] = user.passwordHash.split(":");
      const hashedOld = (await hashAsync(oldPassword, salt, 64)) as Buffer;
      
      if (!timingSafeEqual(Buffer.from(hashed, "hex"), hashedOld)) {
        return res.status(400).json({ message: "Invalid old password" });
      }

      const newSalt = randomBytes(16).toString("hex");
      const hashedNew = (await hashAsync(newPassword, newSalt, 64)) as Buffer;
      await storage.updateUserPassword(user.id, `${hashedNew.toString("hex")}:${newSalt}`);
      res.json({ message: "Success" });
    } catch (e) {
      res.status(500).json({ message: "Failed" });
    }
  });

  app.get(["/api/users/:id", "/api/profile/:id"], async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.incrementViewCount(id);
      const user = await storage.getUser(id);
      if (!user) return res.status(404).json({ message: "Not found" });
      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (e) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // --- ФОРУМ (УДАЛЕНИЕ) ---
  app.delete("/api/threads/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const thread = await storage.getThread(id);
    if (!thread) return res.sendStatus(404);
    
    const canDelete = req.user.role === "ADMIN" || req.user.role === "MODERATOR" || thread.authorId === req.user.id;
    if (!canDelete) return res.sendStatus(403);

    await storage.deleteThread(id);
    res.sendStatus(204);
  });

  app.delete("/api/posts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const post = await storage.getPost(id); 
    if (!post) return res.sendStatus(404);

    const canDelete = req.user.role === "ADMIN" || req.user.role === "MODERATOR" || post.authorId === req.user.id;
    if (!canDelete) return res.sendStatus(403);

    await storage.deletePost(id);
    res.sendStatus(204);
  });

  // --- ТРЕДЫ, ПОСТЫ, КАТЕГОРИИ ---
  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Исправлено: Получение категории по ID (для страниц категорий)
  app.get("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid category ID" });

      const category = await storage.getCategory(id);
      if (!category) return res.status(404).json({ message: "C473G0RY_N07_F0UND" });

      const threads = await storage.getThreadsByCategory(id);
      res.json({ ...category, threads: threads || [] });
    } catch (e) {
      res.status(500).json({ message: "Error fetching category" });
    }
  });

  app.get("/api/threads/:id", async (req, res) => {
    try {
      const thread = await storage.getThread(parseInt(req.params.id));
      if (!thread) return res.status(404).json({ message: "Not found" });
      res.json(thread);
    } catch (e) {
      res.status(500).json({ message: "Error" });
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

  // --- API СТАТИСТИКИ ---
  app.get("/api/stats", async (_req, res) => {
    try {
      const users = await storage.listUsers();
      // Считаем онлайн: заходили последние 5 минут
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const onlineCount = users.filter(u => u.lastSeen && new Date(u.lastSeen) > fiveMinutesAgo).length;
      
      res.json({
        totalUsers: users.length,
        onlineUsers: onlineCount
      });
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
