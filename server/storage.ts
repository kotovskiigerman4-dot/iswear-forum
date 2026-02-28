// @ts-nocheck
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { createClient } from '@supabase/supabase-js';

// Хелперы для проверки ролей
const isStaff = (req: any) => req.isAuthenticated() && (req.user.role === "ADMIN" || req.user.role === "MODERATOR");
const isAdmin = (req: any) => req.isAuthenticated() && req.user.role === "ADMIN";

export async function registerRoutes(app: Express): Promise<Server> {
  // Вызываем сидинг при запуске
  storage.seedCategories().catch(console.error);

  app.use((req, _res, next) => {
    if (req.isAuthenticated() && req.user) {
      storage.updateLastSeen(req.user.id).catch(() => {});
    }
    next();
  });

  // --- ПОЛЬЗОВАТЕЛИ И ПРОФИЛИ ---
  
  app.get("/api/profile/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const user = await storage.getUser(id);
      if (!user) return res.status(404).json({ message: "U53R_N07_F0UND" });

      const { passwordHash, ...safeUser } = user;
      
      res.json({
        ...safeUser,
        avatarUrl: user.avatarUrl || user.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`,
        applicationReason: user.applicationReason || user.application_reason,
        lastSeen: user.lastSeen || user.last_seen
      });
    } catch (e) {
      res.status(500).json({ message: "Error fetching profile" });
    }
  });

  app.get("/api/users/:id/threads", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const threads = await storage.getUserThreads(id);
      res.json(threads);
    } catch (e) {
      res.status(500).json({ message: "Error fetching user threads" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const user = await storage.getUser(id);
      if (!user) return res.status(404).json({ message: "U53R_N07_F0UND" });
      const { passwordHash, ...safeUser } = user;
      res.json({
        ...safeUser,
        avatarUrl: user.avatarUrl || user.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`,
        applicationReason: user.applicationReason || user.application_reason,
        lastSeen: user.lastSeen || user.last_seen
      });
    } catch (e) {
      res.status(500).json({ message: "Error fetching user" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.listUsers();
      const safeUsers = users.map(u => ({
          ...u,
          avatarUrl: u.avatarUrl || u.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`,
          lastSeen: u.lastSeen || u.last_seen
      }));
      res.json(safeUsers);
    } catch (e) {
      res.status(500).json({ message: "Error listing users" });
    }
  });

  // --- ТРЕДЫ (Создание с первым сообщением) ---
  app.post("/api/threads", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { title, categoryId, content, fileUrl } = req.body;
      
      if (!title || !categoryId || !content) {
        return res.status(400).json({ message: "Title, Category and Content are required" });
      }

      // 1. Создаем сам тред
      const thread = await storage.createThread({
        title,
        categoryId: Number(categoryId),
        authorId: req.user.id
      });

      // 2. СРАЗУ создаем первый пост (сообщение) для этого треда
      await storage.createPost({
        content,
        threadId: thread.id,
        authorId: req.user.id,
        fileUrl: fileUrl || null
      });

      res.status(201).json(thread);
    } catch (e) {
      console.error("Thread creation error:", e);
      res.status(400).json({ message: "Failed to create thread" });
    }
  });

  app.get("/api/threads/:id", async (req, res) => {
    try {
      const thread = await storage.getThread(parseInt(req.params.id));
      if (!thread) return res.status(404).json({ message: "Thread not found" });
      res.json(thread);
    } catch (e) {
      res.status(500).json({ message: "Error fetching thread" });
    }
  });

  app.delete("/api/threads/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const thread = await storage.getThread(id);
    if (!thread) return res.sendStatus(404);
    
    if (!isStaff(req) && thread.authorId !== req.user.id) {
      return res.sendStatus(403);
    }
    await storage.deleteThread(id);
    res.sendStatus(204);
  });

  // --- ПОСТЫ (Ответы в темах) ---
  app.post("/api/posts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { content, threadId, fileUrl } = req.body;
      const post = await storage.createPost({
        content,
        threadId: Number(threadId),
        authorId: req.user.id,
        fileUrl: fileUrl || null
      });
      res.status(201).json(post);
    } catch (e) {
      res.status(400).json({ message: "Failed to create post" });
    }
  });

  app.delete("/api/posts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const post = await storage.getPost(id);
    if (!post) return res.sendStatus(404);

    if (!isStaff(req) && post.authorId !== req.user.id) {
      return res.sendStatus(403);
    }

    await storage.deletePost(id);
    res.sendStatus(204);
  });

  // --- КАТЕГОРИИ ---
  app.get("/api/categories", async (_req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.get("/api/categories/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      const all = await storage.getCategories();
      const catByName = all.find(c => c.name.toLowerCase() === req.params.id.toLowerCase());
      if (catByName) return res.json(catByName);
      return res.status(404).json({ message: "C473G0RY_N07_F0UND" });
    }
    const category = await storage.getCategory(id);
    if (!category) return res.status(404).json({ message: "C473G0RY_N07_F0UND" });
    res.json(category);
  });

  // --- АДМИНКА ---
  app.get("/api/admin/users", async (req, res) => {
    if (!isStaff(req)) return res.sendStatus(403);
    const users = await storage.listUsers();
    res.json(users);
  });

  app.patch("/api/admin/users/:id", async (req, res) => {
    if (!isStaff(req)) return res.sendStatus(403);
    const id = parseInt(req.params.id);
    const updateData = { ...req.body };
    if (!isAdmin(req) && updateData.role) {
      delete updateData.role;
    }
    try {
      const updated = await storage.updateUser(id, updateData);
      res.json(updated);
    } catch (e) {
      res.status(500).json({ message: "Update failed" });
    }
  });

  // --- СТАТИСТИКА ---
  app.get("/api/stats", async (_req, res) => {
    try {
      const totalUsers = await storage.getUserCount();
      const allUsers = await storage.listUsers();
      // Онлайн если активность была в последние 5 минут
      const onlineUsers = allUsers.filter(u => u.lastSeen && (Date.now() - new Date(u.lastSeen).getTime() < 300000)).length;
      res.json({ totalUsers, onlineUsers });
    } catch (e) {
      res.json({ totalUsers: 0, onlineUsers: 0 });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
