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
  // Вызываем сидинг при запуске (чтобы категории появились сами)
  storage.seedCategories().catch(console.error);

  app.use((req, _res, next) => {
    if (req.isAuthenticated() && req.user) {
      storage.updateLastSeen(req.user.id).catch(() => {});
    }
    next();
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

    // Защита: только АДМИН может менять роли
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

  // --- КАТЕГОРИИ (ФИКС ОШИБКИ 200 / N07_F0UND) ---
  app.get("/api/categories", async (_req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.get("/api/categories/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    // Если id не число - пробуем найти по имени в общем списке
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

    // Модеры, Админы или Автор
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
      // Онлайн если заходил последние 5 минут
      const onlineUsers = allUsers.filter(u => u.lastSeen && (Date.now() - new Date(u.lastSeen).getTime() < 300000)).length;
      res.json({ totalUsers, onlineUsers });
    } catch (e) {
      res.json({ totalUsers: 0, onlineUsers: 0 });
    }
  });

  // ... (остальные твои роуты для поиска и загрузки файлов)

  const httpServer = createServer(app);
  return httpServer;
}
