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

  // --- ПОЛЬЗОВАТЕЛИ И ПРОФИЛИ (ДОБАВЛЕНО) ---
  
  // Получение конкретного профиля
  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const user = await storage.getUser(id);
      if (!user) return res.status(404).json({ message: "U53R_N07_F0UND" });

      // Безопасная отправка данных (без хеша пароля)
      const { passwordHash, ...safeUser } = user;
      
      // Маппинг полей для фронтенда (snake_case -> camelCase)
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

  // Список всех пользователей (для страницы Users)
  app.get("/api/users", async (req, res) => {
    const users = await storage.listUsers();
    // Отдаем только безопасные данные
    const safeUsers = users.map(({ passwordHash, ...u }) => ({
        ...u,
        avatarUrl: u.avatarUrl || u.avatar_url
    }));
    res.json(safeUsers);
  });

  // --- ТРЕДЫ (ДОБАВЛЕНО СОЗДАНИЕ) ---
  app.post("/api/threads", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const thread = await storage.createThread({
        ...req.body,
        authorId: req.user.id
      });
      res.status(201).json(thread);
    } catch (e) {
      res.status(400).json({ message: "Failed to create thread. Check categoryId." });
    }
  });

  // --- АДМИНКА И МОДЕРКА ---
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

  // --- ТРЕДЫ И УДАЛЕНИЕ ---
  app.get("/api/threads/:id", async (req, res) => {
    const thread = await storage.getThread(parseInt(req.params.id));
    if (!thread) return res.status(404).json({ message: "Thread not found" });
    res.json(thread);
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

  // --- СТАТИСТИКА ---
  app.get("/api/stats", async (_req, res) => {
    try {
      const totalUsers = await storage.getUserCount();
      const allUsers = await storage.listUsers();
      const onlineUsers = allUsers.filter(u => u.lastSeen && (Date.now() - new Date(u.lastSeen).getTime() < 300000)).length;
      res.json({ totalUsers, onlineUsers });
    } catch (e) {
      res.json({ totalUsers: 0, onlineUsers: 0 });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
