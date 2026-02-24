import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import {
  users, categories, threads, posts,
  type User, type Category, type Thread, type Post,
  type CategoryWithThreads, type ThreadWithPosts, type SafeUser,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: typeof users.$inferInsert): Promise<User>;
  updateUser(id: number, updates: Partial<typeof users.$inferInsert>): Promise<User>;
  listUsers(): Promise<SafeUser[]>;
  getUserCount(): Promise<number>;
  getCategories(): Promise<CategoryWithThreads[]>;
  getCategory(id: number): Promise<CategoryWithThreads | undefined>;
  getThread(id: number): Promise<ThreadWithPosts | undefined>;
  createThread(thread: typeof threads.$inferInsert): Promise<Thread>;
  deleteThread(id: number): Promise<void>;
  getThreadCount(): Promise<number>;
  createPost(post: typeof posts.$inferInsert): Promise<Post>;
  deletePost(id: number): Promise<void>;
  seedCategories(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // --- USER METHODS ---
  async getUser(id: number): Promise<User | undefined> {
    const cleanId = Math.floor(Number(id));
    if (isNaN(cleanId)) return undefined;
    try {
      const [user] = await db.select().from(users).where(eq(users.id, cleanId));
      return user || undefined;
    } catch (e) {
      console.error(`[STORAGE] Error fetching user ${cleanId}:`, e);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user || undefined;
    } catch (e) {
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user || undefined;
    } catch (e) {
      return undefined;
    }
  }

  async createUser(insertUser: typeof users.$inferInsert): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<typeof users.$inferInsert>): Promise<User> {
    const cleanId = Math.floor(Number(id));
    try {
      const [user] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, cleanId))
        .returning();
      if (!user) throw new Error(`User ${cleanId} not found`);
      return user;
    } catch (e) {
      console.error(`[STORAGE] Update error for user ${cleanId}:`, e);
      throw e;
    }
  }

  async listUsers(): Promise<SafeUser[]> {
    const allUsers = await db.select().from(users);
    return allUsers.map(u => {
      const { passwordHash, ...safeUser } = u;
      return safeUser as SafeUser;
    });
  }

  async getUserCount(): Promise<number> {
    const [count] = await db.select({ value: sql<number>`count(*)` }).from(users);
    return Number(count.value);
  }

  // --- THREADS & CATEGORIES HELPERS ---
  private async enrichThreads(catThreads: Thread[]): Promise<any[]> {
    return await Promise.all(catThreads.map(async t => {
      const [author] = await db.select().from(users).where(eq(users.id, t.authorId));
      const [postCount] = await db.select({ value: sql<number>`count(*)` }).from(posts).where(eq(posts.threadId, t.id));
      
      const safeAuthor = author 
        ? (({ passwordHash, ...s }) => s)(author) 
        : { username: "Ghost", id: 0, role: "MEMBER", status: "APPROVED" };

      return {
        ...t,
        author: safeAuthor as SafeUser,
        replyCount: Math.max(0, Number(postCount.value) - 1)
      };
    }));
  }

  // --- CATEGORY METHODS ---
  async getCategories(): Promise<CategoryWithThreads[]> {
    const allCategories = await db.select().from(categories).orderBy(categories.position);
    const result: CategoryWithThreads[] = [];

    for (const cat of allCategories) {
      const catThreads = await db.select().from(threads)
        .where(eq(threads.categoryId, cat.id))
        .orderBy(desc(threads.createdAt))
        .limit(5);

      const enrichedThreads = await this.enrichThreads(catThreads);
      result.push({ ...cat, threads: enrichedThreads });
    }
    return result;
  }

  async getCategory(id: number): Promise<CategoryWithThreads | undefined> {
    const cleanId = Math.floor(Number(id));
    const [cat] = await db.select().from(categories).where(eq(categories.id, cleanId));
    if (!cat) return undefined;

    const catThreads = await db.select().from(threads)
      .where(eq(threads.categoryId, cat.id))
      .orderBy(desc(threads.createdAt));

    const enrichedThreads = await this.enrichThreads(catThreads);
    return { ...cat, threads: enrichedThreads };
  }

  // --- THREAD METHODS ---
  async getThread(id: number): Promise<ThreadWithPosts | undefined> {
    const cleanId = Math.floor(Number(id));
    const [thread] = await db.select().from(threads).where(eq(threads.id, cleanId));
    if (!thread) return undefined;

    const [author] = await db.select().from(users).where(eq(users.id, thread.authorId));
    const [category] = await db.select().from(categories).where(eq(categories.id, thread.categoryId));
    const threadPosts = await db.select().from(posts).where(eq(posts.threadId, cleanId)).orderBy(posts.createdAt);

    const enrichedPosts = await Promise.all(threadPosts.map(async p => {
      const [pAuthor] = await db.select().from(users).where(eq(users.id, p.authorId));
      const safeAuthor = pAuthor 
        ? (({ passwordHash, ...s }) => s)(pAuthor) 
        : { username: "Ghost", id: 0, role: "MEMBER", status: "APPROVED" };
      
      return { ...p, author: safeAuthor as SafeUser };
    }));

    const safeAuthor = author 
      ? (({ passwordHash, ...s }) => s)(author) 
      : { username: "Ghost", id: 0, role: "MEMBER", status: "APPROVED" };

    return {
      ...thread,
      author: safeAuthor as SafeUser,
      category,
      replyCount: Math.max(0, threadPosts.length - 1),
      posts: enrichedPosts
    };
  }

  async createThread(insertThread: typeof threads.$inferInsert): Promise<Thread> {
    const [thread] = await db.insert(threads).values(insertThread).returning();
    return thread;
  }

  async deleteThread(id: number): Promise<void> {
    await db.delete(threads).where(eq(threads.id, id));
  }

  async getThreadCount(): Promise<number> {
    const [count] = await db.select({ value: sql<number>`count(*)` }).from(threads);
    return Number(count.value);
  }

  // --- POST METHODS ---
  async createPost(insertPost: typeof posts.$inferInsert): Promise<Post> {
    const [post] = await db.insert(posts).values(insertPost).returning();
    return post;
  }

  async deletePost(id: number): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
  }

  // --- SEEDING ---
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
