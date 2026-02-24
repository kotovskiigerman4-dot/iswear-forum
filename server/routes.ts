import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import bcrypt from "bcrypt";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const PostgresStore = connectPg(session);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Исправление ошибки с прокси на Render
  app.set('trust proxy', 1);

  // Security middlewares
  app.use(helmet({ contentSecurityPolicy: false }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/", limiter);

  // Session configuration
  app.use(
    session({
      store: new PostgresStore({
        pool,
        createTableIfMissing: true,
      }),
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

  // Helper to check auth
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // ИСПРАВЛЕННЫЙ requireAdmin с логированием и "силовым" доступом
  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(req.session.userId);
    
    // ВНИМАНИЕ: Замени 'ADMIN_NICK' на свой реальный ник, если 401 ошибка не исчезнет
    const isMasterAdmin = user?.username === 'ADMIN_NICK'; 

    if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR" && !isMasterAdmin)) {
      console.log(`Access Denied for: ${user?.username}, Role: ${user?.role}`);
      return res.status(401).json({ message: "Admin access required" });
    }
    next();
  };

  // Auth routes
  app.get(api.auth.me.path, async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not logged in" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { username, password } = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.isBanned) {
        return res.status(401).json({ message: "Invalid credentials or banned" });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (e) {
      res.status(401).json({ message: "Invalid login format" });
    }
  });

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(input.username);
      if (existingUser) return res.status(400).json({ message: "Username taken" });
      const existingEmail = await storage.getUserByEmail(input.email);
      if (existingEmail) return res.status(400).json({ message: "Email taken" });

      const count = await storage.getUserCount();
      
      // ИСПРАВЛЕНИЕ: Первый юзер сразу ADMIN и APPROVED
      const isFirst = count === 0;
      const role = isFirst ? "ADMIN" : "MEMBER";
      const status = isFirst ? "APPROVED" : "PENDING";
      
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(input.password, salt);

      const user = await storage.createUser({
        username: input.username,
        email: input.email,
        passwordHash,
        icq: input.icq,
        applicationReason: input.applicationReason,
        role,
        status, // Теперь статус передается корректно
      });

      req.session.userId = user.id;
      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (e: any) {
      console.error("Registration error:", e);
      res.status(400).json({ message: e.message || "Invalid registration" });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  // Categories (закрыты requireAuth)
  app.get(api.categories.list.path, requireAuth, async (req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  // Threads
  app.post(api.threads.create.path, requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (user?.status !== "APPROVED") {
        return res.status(403).json({ message: "Account not approved" });
      }

      const input = api.threads.create.input.parse(req.body);
      const thread = await storage.createThread({
        title: input.title,
        categoryId: input.categoryId,
        authorId: req.session.userId!,
      });

      await storage.createPost({
        content: input.content,
        threadId: thread.id,
        authorId: req.session.userId!,
      });

      res.status(201).json(thread);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get(api.threads.get.path, requireAuth, async (req, res) => {
    const thread = await storage.getThread(Number(req.params.id));
    if (!thread) return res.status(404).json({ message: "Thread not found" });
    res.json(thread);
  });

  // Admin Update (ГЛАВНОЕ ИСПРАВЛЕНИЕ ДЛЯ КНОПОК)
  app.patch(api.users.adminUpdate.path, requireAdmin, async (req, res) => {
    try {
      const targetId = Number(req.params.id);
      const input = api.users.adminUpdate.input.parse(req.body);
      
      const updated = await storage.updateUser(targetId, input);
      const { passwordHash, ...safeUser } = updated;
      res.json(safeUser);
    } catch (e: any) {
      console.error("Admin update error:", e);
      res.status(400).json({ message: e.message });
    }
  });

  // Users List (для админки)
  app.get(api.users.list.path, requireAdmin, async (req, res) => {
    const users = await storage.listUsers();
    res.json(users);
  });

  // Stats
  app.get(api.stats.get.path, requireAuth, async (req, res) => {
    const userCount = await storage.getUserCount();
    const threadCount = await storage.getThreadCount();
    res.json({ userCount, threadCount });
  });

  storage.seedCategories().catch(console.error);

  return httpServer;
}
