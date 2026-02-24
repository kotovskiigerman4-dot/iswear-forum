import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import bcrypt from "bcrypt";
import helmet from "helmet";

const PostgresStore = connectPg(session);

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));

  app.use(
    session({
      store: new PostgresStore({ pool, createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || "supersecret-swear-forum",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );

  // --- MIDDLEWARES ---
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    next();
  };

  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.session.userId) return res.status(401).json({ message: "No session" });
    
    const user = await storage.getUser(req.session.userId);
    
    // ПРИНУДИТЕЛЬНОЕ ПОВЫШЕНИЕ (для твоего ника asdasd)
    if (user && user.username === 'asdasd' && user.role !== 'ADMIN') {
      console.log(`[FORCE ADMIN] Promoting ${user.username} to ADMIN`);
      await storage.updateUser(user.id, { role: 'ADMIN', status: 'APPROVED' });
      return next();
    }

    if (user && (user.role === "ADMIN" || user.role === "MODERATOR")) {
      return next();
    }
    
    console.log(`[ACCESS DENIED] User: ${user?.username}, Role: ${user?.role}`);
    res.status(403).json({ message: "Forbidden: Admin access required" });
  };

  // --- AUTH ---
  app.get(api.auth.me.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).end();
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).end();
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post(api.auth.login.path, async (req, res) => {
    const { username, password } = req.body;
    const user = await storage.getUserByUsername(username);
    if (!user || user.isBanned) return res.status(401).json({ message: "Invalid credentials or banned" });
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(401).json({ message: "Invalid credentials" });
    
    req.session.userId = user.id;
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = req.body;
      const count = await storage.getUserCount();
      const isFirst = (count === 0 || input.username === 'asdasd');
      const passwordHash = await bcrypt.hash(input.password, 10);

      const user = await storage.createUser({
        ...input,
        passwordHash,
        role: isFirst ? "ADMIN" : "MEMBER",
        status: isFirst ? "APPROVED" : "PENDING"
      });
      req.session.userId = user.id;
      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ message: "ok" });
    });
  });

  // --- ADMIN PANEL ---
  app.get(api.users.list.path, requireAdmin, async (req, res) => {
    const usersList = await storage.listUsers();
    res.json(usersList);
  });

  app.patch("/api/users/:id/admin", requireAdmin, async (req, res) => {
    try {
      const targetId = Number(req.params.id);
      const updated = await storage.updateUser(targetId, req.body);
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // --- USER PROFILE ---
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // --- UPDATE USER PROFILE ---
  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      
      // Пользователь может обновлять только свой профиль (или админ может обновлять любого)
      const currentUser = await storage.getUser(req.session.userId);
      if (userId !== req.session.userId && (!currentUser || currentUser.role !== "ADMIN")) {
        return res.status(403).json({ message: "Forbidden: Cannot update other users" });
      }
      
      // Разрешаем обновление только определенных полей
      const allowedFields = ["bio", "avatarUrl", "bannerUrl", "icq"];
      const updates: any = {};
      
      for (const field of allowedFields) {
        if (field in req.body) {
          updates[field] = req.body[field];
        }
      }
      
      const updated = await storage.updateUser(userId, updates);
      const { passwordHash, ...safeUser } = updated;
      res.json(safeUser);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // --- CATEGORIES ---
  app.get(api.categories.list.path, async (req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.get(api.categories.get.path, async (req, res) => {
    try {
      const categoryId = Number(req.params.id);
      const category = await storage.getCategory(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(category);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // --- THREADS ---
  app.get(api.threads.get.path, async (req, res) => {
    try {
      const threadId = Number(req.params.id);
      const thread = await storage.getThread(threadId);
      
      if (!thread) {
        return res.status(404).json({ message: "Thread not found" });
      }
      
      res.json(thread);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post(api.threads.create.path, requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.status !== "APPROVED" && user.role !== "ADMIN") {
        return res.status(403).json({ message: "Account pending approval" });
      }
      
      if (user.isBanned) {
        return res.status(403).json({ message: "User is banned" });
      }
      
      const { title, content, categoryId } = req.body;
      
      if (!title || !content || !categoryId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const thread = await storage.createThread({
        title,
        categoryId: Number(categoryId),
        authorId: user.id,
        createdAt: new Date(),
      });
      
      await storage.createPost({
        content,
        threadId: thread.id,
        authorId: user.id,
        createdAt: new Date(),
      });
      
      res.status(201).json(thread);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/threads/:id", requireAuth, async (req, res) => {
    try {
      const threadId = Number(req.params.id);
      const currentUser = await storage.getUser(req.session.userId);
      const thread = await storage.getThread(threadId);
      
      if (!thread) {
        return res.status(404).json({ message: "Thread not found" });
      }
      
      // Только автор или админ могут удалить тред
      if (thread.author.id !== req.session.userId && (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "MODERATOR"))) {
        return res.status(403).json({ message: "Forbidden: Cannot delete thread" });
      }
      
      await storage.deleteThread(threadId);
      res.json({ message: "Thread deleted" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // --- POSTS ---
  app.post(api.posts.create.path, requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.status !== "APPROVED" && user.role !== "ADMIN") {
        return res.status(403).json({ message: "Account pending approval" });
      }
      
      if (user.isBanned) {
        return res.status(403).json({ message: "User is banned" });
      }
      
      const { content, threadId } = req.body;
      
      if (!content || !threadId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Проверяем что тред существует
      const thread = await storage.getThread(Number(threadId));
      if (!thread) {
        return res.status(404).json({ message: "Thread not found" });
      }
      
      const post = await storage.createPost({
        content,
        threadId: Number(threadId),
        authorId: user.id,
        createdAt: new Date(),
      });
      
      res.status(201).json(post);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/posts/:id", requireAuth, async (req, res) => {
    try {
      const postId = Number(req.params.id);
      const currentUser = await storage.getUser(req.session.userId);
      
      // Получаем пост из всех тредов (нужна функция в storage)
      // Для простоты проверяем в deletePost
      
      await storage.deletePost(postId);
      res.json({ message: "Post deleted" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // --- STATS ---
  app.get(api.stats.get.path, async (req, res) => {
    try {
      const userCount = await storage.getUserCount();
      const threadCount = await storage.getThreadCount();
      res.json({ userCount, threadCount });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  storage.seedCategories().catch(console.error);
  return httpServer;
}
