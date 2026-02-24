import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Настройка сессий с учетом специфики Render (прокси + HTTPS)
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "cyberpunk_neon_secret_2026",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    proxy: true, // ВАЖНО: Render использует прокси
    cookie: {
      secure: app.get("env") === "production", // Будет true на Render
      sameSite: app.get("env") === "production" ? "lax" : undefined,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1); // Доверяем первому прокси (Render)
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.passwordHash))) {
          return done(null, false);
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // --- API РОУТЫ ---

  app.post("/api/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).send("Missing credentials");

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) return res.status(400).send("Username already taken");

      const passwordHash = await hashPassword(password);
      // Убеждаемся, что передаем дефолтные поля (роль, статус), если они не пришли
      const user = await storage.createUser({
        ...req.body,
        passwordHash,
        role: req.body.role || "MEMBER",
        status: req.body.status || "PENDING"
      });

      req.login(user, (err) => {
        if (err) return res.status(500).send("Login failed after registration");
        res.status(201).json(user);
      });
    } catch (e) {
      console.error("Registration error:", e);
      res.status(500).send("Registration error");
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).send("Invalid username or password");
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).send("Logout failed");
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
