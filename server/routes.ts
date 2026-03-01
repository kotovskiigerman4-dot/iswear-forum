// @ts-nocheck
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

const isStaff = (req: any) => req.isAuthenticated() && (req.user.role === "ADMIN" || req.user.role === "MODERATOR");
const isAdmin = (req: any) => req.isAuthenticated() && req.user.role === "ADMIN";

export async function registerRoutes(app: Express): Promise<Server> {
  // Инициализация категорий при запуске
  storage.seedCategories().catch(console.error);

  // Middleware для обновления времени последнего визита
  app.use((req, _res, next) => {
    if (req.isAuthenticated() && req.user) {
      storage.updateLastSeen(req.user.id).catch(() => {});
    }
    next();
  });

  // Вспомогательная функция для поиска упоминаний и создания уведомлений
  async function handleMentions(content: string, threadId: number, postId: number, authorId: number) {
    const mentions = content.match(/@(\w+)/g);
    if (mentions) {
      const uniqueUsernames = [...new Set(mentions.map(m => m.substring(1)))];
      for (const username of uniqueUsernames) {
        const mentionedUser = await storage.getUserByUsername(username);
        if (mentionedUser && mentionedUser.id !== authorId) {
          await storage.createNotification({
            userId: mentionedUser.id,
            fromUserId: authorId,
            threadId: threadId,
            postId: postId,
            type: "mention"
          });
        }
      }
    }
  }

 // --- ПОЛЬЗОВАТЕЛИ И ПРОФИЛИ ---
  app.get("/api/profile/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      
      // 1. Увеличиваем счетчик просмотров при каждом заходе
      await storage.incrementViewCount(id).catch(() => {});

      const user = await storage.getUser(id);
      if (!user) return res.status(404).json({ message: "U53R_N07_F0UND" });
      
      const { passwordHash, ...safeUser } = user;
      res.json({
        ...safeUser,
        avatarUrl: user.avatarUrl || user.avatar_url,
        lastSeen: user.lastSeen || user.last_seen
      });
    } catch (e) {
      res.status(500).json({ message: "Error" });
    }
  });

 // 1. Счетчик просмотров и данные профиля (уже есть, но добавь инкремент)
  // 2. ПОЧИНКА ТРЕДОВ: Добавляем роут для получения тем юзера
  app.get("/api/users/:id/threads", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const threads = await storage.getUserThreads(id);
      res.json(threads);
    } catch (e) {
      res.status(500).json({ message: "Error" });
    }
  });

  // 3. ПОЧИНКА ОШИБКИ JSON: Роут для сохранения аватарок и био
  app.patch("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const targetId = parseInt(req.params.id);
    
    // Проверка: менять может только владелец или админ
    if (req.user.id !== targetId && !isStaff(req)) return res.sendStatus(403);

    try {
      // Распаковываем данные (фронт может слать их внутри .data)
      const updates = req.body.data || req.body;
      const updated = await storage.updateUser(targetId, updates);
      res.json(updated); // Возвращаем JSON, чтобы фронт не ругался
    } catch (e) {
      res.status(500).json({ message: "Update failed" });
    }
  });

  // 3. Обновление профиля (аватарки, био) - исправлено для JSON
  app.patch("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const targetId = parseInt(req.params.id);
    if (req.user.id !== targetId && !isStaff(req)) return res.sendStatus(403);

    try {
      // Поддержка и прямого тела, и вложенного в .data
      const updates = req.body.data || req.body;
      const updated = await storage.updateUser(targetId, updates);
      res.json(updated);
    } catch (e) {
      res.status(500).json({ message: "Update failed" });
    }
  });

  // Обновление собственного профиля (для обычных юзеров)
  app.patch("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const targetId = parseInt(req.params.id);
    if (req.user.id !== targetId && !isStaff(req)) return res.sendStatus(403);

    try {
      // Запрещаем обычным юзерам менять себе роль или статус бана через этот роут
      const { role, status, isBanned, ...safeUpdates } = req.body;
      const updates = isStaff(req) ? req.body : safeUpdates;
      
      const updated = await storage.updateUser(targetId, updates);
      res.json(updated);
    } catch (e) {
      res.status(500).json({ message: "Update failed" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.listUsers();
      res.json(users);
    } catch (e) {
      res.status(500).json({ message: "Error listing users" });
    }
  });

  // --- ТРЕДЫ ---
  app.post("/api/threads", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { title, categoryId, content, fileUrl } = req.body;
      const thread = await storage.createThread({
        title,
        categoryId: Number(categoryId),
        authorId: req.user.id
      });
      const post = await storage.createPost({
        content,
        threadId: thread.id,
        authorId: req.user.id,
        fileUrl: fileUrl || null
      });

      await handleMentions(content, thread.id, post.id, req.user.id);
      res.status(201).json(thread);
    } catch (e) {
      res.status(400).json({ message: "Failed to create thread" });
    }
  });

  app.get("/api/threads/:id", async (req, res) => {
    try {
      const thread = await storage.getThread(parseInt(req.params.id));
      if (!thread) return res.status(404).json({ message: "Thread not found" });
      res.json(thread);
    } catch (e) {
      res.status(500).json({ message: "Error" });
    }
  });

  // --- ПОСТЫ ---
  app.post("/api/posts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const post = await storage.createPost({
        content: req.body.content,
        threadId: Number(req.body.threadId),
        authorId: req.user.id,
        fileUrl: req.body.fileUrl || null
      });

      await handleMentions(req.body.content, post.threadId, post.id, req.user.id);
      res.status(201).json(post);
    } catch (e) {
      res.status(400).json({ message: "Failed" });
    }
  });

  // --- КАТЕГОРИИ ---
  app.get("/api/categories", async (_req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.get("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getCategory(id);
      if (!category) return res.status(404).json({ message: "C473G0RY_N07_F0UND" });
      res.json(category);
    } catch (e) {
      res.status(500).json({ message: "Error" });
    }
  });

  // --- АДМИНКА ---
  app.get("/api/admin/users", async (req, res) => {
    if (!isStaff(req)) return res.sendStatus(403);
    const users = await storage.listUsers();
    res.json(users);
  });

  app.patch("/api/admin/users/:id", async (req, res) => {
    if (!isStaff(req)) return res.sendStatus(403);
    
    try {
      const targetId = parseInt(req.params.id);
      const updates = req.body;
      const currentUser = req.user;

      // Только ADMIN может менять роли. MODERATOR видит ошибку.
      if (updates.role && currentUser.role !== "ADMIN") {
        return res.status(403).json({ message: "0NLY_4DM1N_C4N_CH4NG3_R0L35" });
      }

      const updated = await storage.updateUser(targetId, updates);
      res.json(updated);
    } catch (e) {
      res.status(500).json({ message: "Update failed" });
    }
  });

  // Модерация: Удаление контента
  app.delete("/api/admin/threads/:id", async (req, res) => {
    if (!isStaff(req)) return res.sendStatus(403);
    try {
      await storage.deleteThread(parseInt(req.params.id));
      res.sendStatus(200);
    } catch (e) {
      res.status(500).json({ message: "Delete failed" });
    }
  });

  app.delete("/api/admin/posts/:id", async (req, res) => {
    if (!isStaff(req)) return res.sendStatus(403);
    try {
      await storage.deletePost(parseInt(req.params.id));
      res.sendStatus(200);
    } catch (e) {
      res.status(500).json({ message: "Delete failed" });
    }
  });

  // --- СТАТИСТИКА И ПРОЧЕЕ ---
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

  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const notifs = await storage.getNotifications(req.user.id);
    res.json(notifs);
  });

  app.post("/api/notifications/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.markNotificationsRead(req.user.id);
    res.sendStatus(200);
  });

  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) return res.json({ threads: [], users: [] });
      const [threads, users] = await Promise.all([
        storage.searchThreads(query),
        storage.searchUsers(query)
      ]);
      res.json({ threads, users });
    } catch (e) {
      res.status(500).json({ message: "Search error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
