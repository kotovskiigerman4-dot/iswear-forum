// @ts-nocheck
import { db, pool } from "./db";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { eq, desc, sql, and } from "drizzle-orm";
import { 
  users, categories, threads, posts, notifications,
  type User, type Category, type Thread, type Post, 
  type CategoryWithThreads, type ThreadWithPosts, type SafeUser,
  type Notification, type InsertNotification 
} from "@shared/schema";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: false,
      tableName: 'session'
    });
  }

  // --- ХЕЛПЕРЫ ---
  private toSafeUser(user: User): SafeUser {
    const { passwordHash, ...safe } = user;
    return {
      ...safe,
      avatarUrl: safe.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${safe.username}`
    };
  }

  // --- УВЕДОМЛЕНИЯ ---
  async createNotification(notif: any) {
    const [notification] = await db.insert(notifications).values(notif).returning();
    return notification;
  }

  async getNotifications(userId: number) {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationsRead(userId: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  // --- ПОЛЬЗОВАТЕЛИ ---
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (user) {
      // Поддержка старого и нового названия колонки пароля
      user.passwordHash = user.passwordHash || user.passwordHashAlt || "";
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: any): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: any): Promise<User> {
    const finalUpdates = { ...updates };
    
    // Дублируем аватарку и баннер в оба варианта колонок
    if (updates.avatarUrl) {
      finalUpdates.avatarUrl = updates.avatarUrl;
      finalUpdates.avatarUrlAlt = updates.avatarUrl;
    }
    if (updates.bannerUrl) {
      finalUpdates.bannerUrl = updates.bannerUrl;
      finalUpdates.bannerUrlAlt = updates.bannerUrl;
    }
    
    const [user] = await db.update(users).set(finalUpdates).where(eq(users.id, id)).returning();
    if (!user) throw new Error(`User ${id} not found`);
    return user;
  }

  async listUsers(): Promise<SafeUser[]> {
    const allUsers = await db.select().from(users);
    return allUsers.map(u => this.toSafeUser(u));
  }

  async searchUsers(query: string): Promise<SafeUser[]> {
    const results = await db.select()
      .from(users)
      .where(sql`${users.username} ILIKE ${'%' + query + '%'}`)
      .limit(20);
    return results.map(u => this.toSafeUser(u));
  }

  async getUserCount(): Promise<number> {
    const [count] = await db.select({ value: sql<number>`count(*)` }).from(users);
    return Number(count.value);
  }

  async getPendingUsersCount(): Promise<number> {
    const [count] = await db.select({ value: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.status, "PENDING"));
    return Number(count.value);
  }

  async updateLastSeen(userId: number): Promise<void> {
    await db.update(users).set({ lastSeen: new Date() }).where(eq(users.id, userId));
  }

  async incrementViewCount(userId: number): Promise<void> {
    await db.update(users).set({ views: sql`${users.views} + 1` }).where(eq(users.id, userId));
  }

  // --- ТРЕДЫ И КАТЕГОРИИ ---
  private async enrichThreads(catThreads: Thread[]): Promise<any[]> {
    return await Promise.all(catThreads.map(async t => {
      const [author] = await db.select().from(users).where(eq(users.id, t.authorId));
      const [postCount] = await db.select({ value: sql<number>`count(*)` })
        .from(posts)
        .where(eq(posts.threadId, t.id));

      return {
        ...t,
        author: author ? this.toSafeUser(author) : null,
        replyCount: Math.max(0, Number(postCount.value) - 1)
      };
    }));
  }

  async getCategories(): Promise<CategoryWithThreads[]> {
    const allCategories = await db.select().from(categories).orderBy(categories.position);
    const result: CategoryWithThreads[] = [];
    
    for (const cat of allCategories) {
      const catThreads = await db.select()
        .from(threads)
        .where(eq(threads.categoryId, cat.id))
        .orderBy(desc(threads.createdAt))
        .limit(5);
      
      const enrichedThreads = await this.enrichThreads(catThreads);
      result.push({ ...cat, threads: enrichedThreads });
    }
    return result;
  }

  async getCategory(id: number): Promise<CategoryWithThreads | undefined> {
    const [cat] = await db.select().from(categories).where(eq(categories.id, id));
    if (!cat) return undefined;

    const catThreads = await db.select()
      .from(threads)
      .where(eq(threads.categoryId, id))
      .orderBy(desc(threads.createdAt));

    const enrichedThreads = await this.enrichThreads(catThreads);
    return { ...cat, threads: enrichedThreads };
  }

  async getThread(id: number): Promise<ThreadWithPosts | undefined> {
    const [thread] = await db.select().
