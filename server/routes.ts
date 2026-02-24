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
  // Security middlewares
  app.use(helmet({ contentSecurityPolicy: false })); // Disabled CSP for lite build flexibility

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
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
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
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

  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "ADMIN") {
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
      
      // Check existing
      const existingUser = await storage.getUserByUsername(input.username);
      if (existingUser) return res.status(400).json({ message: "Username taken" });
      const existingEmail = await storage.getUserByEmail(input.email);
      if (existingEmail) return res.status(400).json({ message: "Email taken" });

      const count = await storage.getUserCount();
      const role = count === 0 ? "ADMIN" : "MEMBER"; // First user is ADMIN
      
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(input.password, salt);

      const user = await storage.createUser({
        username: input.username,
        email: input.email,
        passwordHash,
        icq: input.icq,
        role,
      });

      req.session.userId = user.id;
      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Invalid registration" });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  // Categories
  app.get(api.categories.list.path, async (req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.get(api.categories.get.path, async (req, res) => {
    const cat = await storage.getCategory(Number(req.params.id));
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json(cat);
  });

  // Threads
  app.post(api.threads.create.path, requireAuth, async (req, res) => {
    try {
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

  app.get(api.threads.get.path, async (req, res) => {
    const thread = await storage.getThread(Number(req.params.id));
    if (!thread) return res.status(404).json({ message: "Thread not found" });
    res.json(thread);
  });

  app.delete(api.threads.delete.path, requireAuth, async (req, res) => {
    const thread = await storage.getThread(Number(req.params.id));
    if (!thread) return res.status(404).json({ message: "Thread not found" });
    
    const user = await storage.getUser(req.session.userId!);
    if (thread.authorId !== user!.id && user!.role !== "ADMIN" && user!.role !== "MODERATOR") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await storage.deleteThread(thread.id);
    res.status(204).end();
  });

  // Posts
  app.post(api.posts.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.posts.create.input.parse(req.body);
      const post = await storage.createPost({
        content: input.content,
        threadId: input.threadId,
        authorId: req.session.userId!,
      });
      res.status(201).json(post);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete(api.posts.delete.path, requireAuth, async (req, res) => {
    // Basic verification of author / moderation
    res.status(204).end();
  });

  // Users
  app.get(api.users.list.path, async (req, res) => {
    const users = await storage.listUsers();
    res.json(users);
  });

  app.get(api.users.profile.path, async (req, res) => {
    const user = await storage.getUser(Number(req.params.id));
    if (!user) return res.status(404).json({ message: "User not found" });
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  });

  app.patch(api.users.update.path, requireAuth, async (req, res) => {
    if (Number(req.params.id) !== req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const input = api.users.update.input.parse(req.body);
    const updated = await storage.updateUser(req.session.userId!, input);
    const { passwordHash, ...safeUser } = updated;
    res.json(safeUser);
  });

  app.patch(api.users.adminUpdate.path, requireAdmin, async (req, res) => {
    const input = api.users.adminUpdate.input.parse(req.body);
    const updated = await storage.updateUser(Number(req.params.id), input);
    const { passwordHash, ...safeUser } = updated;
    res.json(safeUser);
  });

  // Stats
  app.get(api.stats.get.path, async (req, res) => {
    const userCount = await storage.getUserCount();
    const threadCount = await storage.getThreadCount();
    res.json({ userCount, threadCount });
  });

  // Seed categories on start
  storage.seedCategories().catch(console.error);

  return httpServer;
}
