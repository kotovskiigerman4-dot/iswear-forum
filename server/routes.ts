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

  // Middlewares
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    next();
  };

  const requireAdmin = async (req: any, res: any, next: any) => {
    const user = await storage.getUser(req.session.userId);
    // СИЛОВОЙ ДОСТУП: заменяем на твой ник
    if (user && (user.role === "ADMIN" || user.username === 'asdasd')) {
      return next();
    }
    res.status(403).json({ message: "Forbidden: Admin only" });
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
    if (!user || user.isBanned) return res.status(401).json({ message: "Error" });
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(401).json({ message: "Error" });
    req.session.userId = user.id;
    res.json(user);
  });

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = req.body;
      const count = await storage.getUserCount();
      const isFirst = count === 0;
      const passwordHash = await bcrypt.hash(input.password, 10);

      const user = await storage.createUser({
        ...input,
        passwordHash,
        role: isFirst ? "ADMIN" : "MEMBER",
        status: isFirst ? "APPROVED" : "PENDING"
      });
      req.session.userId = user.id;
      res.status(201).json(user);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => res.json({ message: "ok" }));
  });

  // --- CONTENT ---
  app.get(api.categories.list.path, async (req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.get(api.threads.get.path, async (req, res) => {
    const thread = await storage.getThread(Number(req.params.id));
    res.json(thread);
  });

  app.post(api.threads.create.path, requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (user?.status !== "APPROVED" && user?.role !== "ADMIN") {
      return res.status(403).json({ message: "Not approved" });
    }
    const thread = await storage.createThread({ ...req.body, authorId: user!.id });
    await storage.createPost({ content: req.body.content, threadId: thread.id, authorId: user!.id });
    res.status(201).json(thread);
  });

  // --- ADMIN (Самое важное) ---
  app.get(api.users.list.path, requireAdmin, async (req, res) => {
    const users = await storage.listUsers();
    res.json(users);
  });

  app.patch("/api/users/:id/admin", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updateUser(Number(req.params.id), req.body);
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get(api.stats.get.path, async (req, res) => {
    const userCount = await storage.getUserCount();
    const threadCount = await storage.getThreadCount();
    res.json({ userCount, threadCount });
  });

  storage.seedCategories().catch(console.error);
  return httpServer;
}
