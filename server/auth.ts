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
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) return false;

    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;

    if (hashedBuf.length !== suppliedBuf.length) {
      return false;
    }
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (e) {
    return false;
  }
}

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "fallback_secret_for_dev_only",
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    proxy: true,
    cookie: {
      secure: true, 
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    },
  };

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

  // Пути исправлены под фронтенд: убрано /auth
  app.post("/api/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ message: "Missing credentials" });

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) return res.status(400).json({ message: "Username already taken" });

      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        ...req.body,
        passwordHash,
        role: "MEMBER",
        status: "PENDING"
      });

      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed" });
        res.status(201).json(user);
      });
    } catch (e) {
      console.error("CRITICAL REGISTRATION ERROR:", e);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
  
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
}
