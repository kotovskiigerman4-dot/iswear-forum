// @ts-nocheck
import { db, pool } from "./db";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { eq, desc, sql } from "drizzle-orm";
import {
  users, categories, threads, posts,
  type User, type Category, type Thread, type Post,
  type CategoryWithThreads, type ThreadWithPosts, type SafeUser,
} from "@shared/schema";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: typeof users.$inferInsert): Promise<User>;
  updateUser(id: number, updates: Partial<typeof users.$inferInsert>): Promise<User>;
  listUsers(): Promise<SafeUser[]>;
  getUserCount(): Promise<number>;
  getPendingUsersCount(): Promise<number>;
  
  // --- МЕТОДЫ ПРОФИЛЯ ---
  updateLastSeen(userId: number): Promise<void>;
  incrementViewCount(userId: number): Promise<void>;
  getUserThreads(userId: number): Promise<Thread[]>;
  updateUserPassword(id: number, newPasswordHash: string): Promise<void>;

  // --- МЕТОДЫ ФОРУМА ---
  getCategories(): Promise<CategoryWithThreads[]>;
  getCategory(id: number): Promise<CategoryWithThreads | undefined>;
  getThread(id: number): Promise<ThreadWithPosts | undefined>;
  createThread(thread: typeof threads.$inferInsert): Promise<Thread>;
  deleteThread(id: number): Promise<void>;
  getThreadCount(): Promise<number>;
  searchThreads(query: string): Promise<Thread[]>;

  // --- МЕТОДЫ ПОСТОВ ---
  createPost(post: typeof posts.$inferInsert): Promise<Post>;
  getPost(id: number): Promise<Post | undefined>;
  deletePost(id: number): Promise<void>;
  seedCategories(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: false, 
      tableName: 'session'
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const cleanId = Math.floor(Number(id));
    if (isNaN(cleanId)) return undefined;
    try {
      const [user] = await db.select().from(users).where(eq(users.id, cleanId));
      if (!user) return undefined;

      return {
        ...user,
        avatarUrl: user.avatarUrl || user.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`,
        applicationReason: user.applicationReason || user.application_reason
      };
    } catch (e) {
      console.error("Storage: Error getting user", e);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: typeof users.$inferInsert): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<typeof users.$inferInsert>): Promise<User> {
    const cleanId = Math.floor(Number(id));
    const [user] = await db.update(users).set(updates).where(eq(users.id, cleanId)).returning();
    if (!user) throw new Error(`User ${cleanId} not found`);
    return user;
  }

  async listUsers(): Promise<SafeUser[]> {
    const allUsers = await db.select().from(users);
    return allUsers.map(({ passwordHash, ...u }) => ({
      ...u,
      avatarUrl: u.avatarUrl || u.avatar_url,
      applicationReason: u.applicationReason || u.application_reason
    } as SafeUser));
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
    const cleanId = Math.floor(Number(userId));
    await db.update(users)
      .set({ lastSeen: new Date() })
      .where(eq(users.id, cleanId));
  }

  async incrementViewCount(userId: number): Promise<void> {
    const cleanId = Math.floor(Number(userId));
    await db.update(users)
      .set({ views: sql`${users.views} + 1` })
      .where(eq(users.id, cleanId));
  }

  async getUserThreads(userId: number): Promise<Thread[]> {
    const cleanId = Math.floor(Number(userId));
    return await db.select()
      .from(threads)
      .where(eq(threads.authorId, cleanId))
      .orderBy(desc(threads.createdAt));
  }

  async updateUserPassword(id: number, newPasswordHash: string): Promise<void> {
    const cleanId = Math.floor(Number(id));
    await db.update(users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(users.id, cleanId));
  }

  async searchThreads(query: string): Promise<Thread[]> {
    return await db.select()
      .from(threads)
      .where(sql`${threads.title} ILIKE ${'%' + query + '%'}`)
      .orderBy(desc(threads.createdAt))
      .limit(50);
  }

  private async enrichThreads(catThreads: Thread[]): Promise<any[]> {
    return await Promise.all(catThreads.map(async t => {
      const [author] = await db.select().from(users).where(eq(users.id, t.authorId));
      const [postCount] = await db.select({ value: sql<number>`count(*)` }).from(posts).where(eq(posts.threadId, t.id));
      const safeAuthor = author ? (({ passwordHash, ...s }) => ({
          ...s,
          avatarUrl: s.avatarUrl || s.avatar_url
      }))(author) : null;
      return {
        ...t,
        author: safeAuthor,
        replyCount: Math.max(0, Number(postCount.value) - 1)
      };
    }));
  }

  async getCategories(): Promise<CategoryWithThreads[]> {
    const allCategories = await db.select().from(categories).orderBy(categories.position);
    const result: CategoryWithThreads[] = [];
    for (const cat of allCategories) {
      const catThreads = await db.select().from(threads).where(eq(threads.categoryId, cat.id)).orderBy(desc(threads.createdAt)).limit(5);
      const enrichedThreads = await this.enrichThreads(catThreads);
      result.push({ ...cat, threads: enrichedThreads });
    }
    return result;
  }

  async getCategory(id: number): Promise<CategoryWithThreads | undefined> {
    const [cat] = await db.select().from(categories).where(eq(categories.id, id));
    if (!cat) return undefined;
    const catThreads = await db.select().from(threads).where(eq(threads.categoryId, cat.id)).orderBy(desc(threads.createdAt));
    const enrichedThreads = await this.enrichThreads(catThreads);
    return { ...cat, threads: enrichedThreads };
  }

  async getThread(id: number): Promise<ThreadWithPosts | undefined> {
    const [thread] = await db.select().from(threads).where(eq(threads.id, id));
    if (!thread) return undefined;
    const [author] = await db.select().from(users).where(eq(users.id, thread.authorId));
    const [category] = await db.select().from(categories).where(eq(categories.id, thread.categoryId));
    const threadPosts = await db.select().from(posts).where(eq(posts.threadId, id)).orderBy(posts.createdAt);
    const enrichedPosts = await Promise.all(threadPosts.map(async p => {
      const [pAuthor] = await db.select().from(users).where(eq(users.id, p.authorId));
      return { 
        ...p, 
        author: pAuthor ? (({ passwordHash, ...s }) => ({
            ...s,
            avatarUrl: s.avatarUrl || s.avatar_url
        }))(pAuthor) : null 
      };
    }));
    return {
      ...thread,
      author: author ? (({ passwordHash, ...s }) => ({
          ...s,
          avatarUrl: s.avatarUrl || s.avatar_url
      }))(author) : null,
      category,
      posts: enrichedPosts,
      replyCount: Math.max(0, threadPosts.length - 1)
    };
  }

  async createThread(insertThread: typeof threads.$inferInsert): Promise<Thread> {
    const [thread] = await db.insert(threads).values(insertThread).returning();
    return thread;
  }

  async deleteThread(id: number): Promise<void> {
    const cleanId = Math.floor(Number(id));
    await db.delete(posts).where(eq(posts.threadId, cleanId));
    await db.delete(threads).where(eq(threads.id, cleanId));
  }

  async getThreadCount(): Promise<number> {
    const [count] = await db.select({ value: sql<number>`count(*)` }).from(threads);
    return Number(count.value);
  }

  async createPost(insertPost: typeof posts.$inferInsert): Promise<Post> {
    const [post] = await db.insert(posts).values(insertPost).returning();
    return post;
  }

  async getPost(id: number): Promise<Post | undefined> {
    const cleanId = Math.floor(Number(id));
    const [post] = await db.select().from(posts).where(eq(posts.id, cleanId));
    return post || undefined;
  }

  async deletePost(id: number): Promise<void> {
    const cleanId = Math.floor(Number(id));
    await db.delete(posts).where(eq(posts.id, cleanId));
  }

  async seedCategories(): Promise<void> {
    const existing = await db.select().from(categories);
    if (existing.length === 0) {
      await db.insert(categories).values([
        { name: "OSINT", description: "Open Source Intelligence", position: 1 },
        { name: "DEVELOPING", description: "Software development and coding", position: 2 },
        { name: "Bases", description: "Data bases and collections", position: 3 },
        { name: "Cryptography", description: "Encryption and security", position: 4 },
        { name: "Sales & Warranty", description: "Marketplace and guarantees", position: 5 },
        { name: "Open Source", description: "Open source projects", position: 6 }
      ]);
    }
  }
}

export const storage = new DatabaseStorage();
