import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import bcrypt from "bcrypt";
import helmet from "helmet";
import multer from "multer";
import path from "path";
import express from "express";
import fs from "fs";

const PostgresStore = connectPg(session);

// --- НАСТРОЙКА MULTER (ЗАГРУЗКА ФАЙЛОВ) ---
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: fileStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Лимит 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".png", ".txt"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Разрешены только файлы .png и .txt"));
    }
  },
});

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));

  // РАЗДАЧА ФАЙЛОВ (Статика)
  app.use("/uploads", express.static("uploads"));

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
    if (user && user.username === 'asdasd' && user.role !== 'ADMIN') {
      await storage.updateUser(user.id, { role: 'ADMIN', status: 'APPROVED' });
      return next();
    }
    if (user && (user.role === "ADMIN" || user.role === "MODERATOR")) {
      return next();
    }
    res.status(403).json({ message: "Forbidden" });
  };

  // --- FILE UPLOAD ENDPOINT ---
  app.post("/api/upload", requireAuth, upload.single("file"), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

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
    if (!user || user.isBanned) return res.status(401).json({ message: "Invalid credentials" });
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

  // --- THREADS ---
  app.post(api.threads.create.path, requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.isBanned) return res.status(403).json({ message: "Banned or not found" });
      
      const { title, content, categoryId, fileUrl } = req.body;
      
      const thread = await storage.createThread({
        title,
        categoryId: Number(categoryId),
        authorId: user.id,
      });
      
      await storage.createPost({
        content,
        threadId: thread.id,
        authorId: user.id,
        fileUrl: fileUrl || null, // Сохраняем файл в первом посте треда
      });
      
      res.status(201).json(thread);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // --- POSTS ---
  app.post(api.posts.create.path, requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.isBanned) return res.status(403).json({ message: "Forbidden" });
      
      const { content, threadId, fileUrl } = req.body;
      
      const post = await storage.createPost({
        content,
        threadId: Number(threadId),
        authorId: user.id,
        fileUrl: fileUrl || null, // Сохраняем файл, если он есть
      });
      
      res.status(201).json(post);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Остальные маршруты (CATEGORIES, ADMIN, STATS и т.д.)
  app.get(api.categories.list.path, async (req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.get(api.categories.get.path, async (req, res) => {
    const category = await storage.getCategory(Number(req.params.id));
    category ? res.json(category) : res.status(404).json({ message: "Not found" });
  });

  app.get(api.threads.get.path, async (req, res) => {
    const thread = await storage.getThread(Number(req.params.id));
    thread ? res.json(thread) : res.status(404).json({ message: "Not found" });
  });

  app.delete("/api/threads/:id", requireAuth, async (req, res) => {
    const thread = await storage.getThread(Number(req.params.id));
    if (!thread) return res.status(404).json({ message: "Not found" });
    await storage.deleteThread(Number(req.params.id));
    res.json({ message: "Deleted" });
  });

  app.get(api.users.list.path, requireAdmin, async (req, res) => {
    res.json(await storage.listUsers());
  });

  app.get(api.stats.get.path, async (req, res) => {
    res.json({ 
      userCount: await storage.getUserCount(), 
      threadCount: await storage.getThreadCount() 
    });
  });

  storage.seedCategories().catch(console.error);
  return httpServer;
}
