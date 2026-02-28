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
  updateLastSeen(userId: number): Promise<void>;
  incrementViewCount(userId: number): Promise<void>;
  getUserThreads(userId: number): Promise<Thread[]>;
  updateUserPassword(id: number, newPasswordHash: string): Promise<void>;
  getCategories(): Promise<CategoryWithThreads[]>;
  getCategory(id: number): Promise<CategoryWithThreads | undefined>;
  getThread(id: number): Promise<ThreadWithPosts | undefined>;
  createThread(thread: typeof threads.$inferInsert): Promise<Thread>;
  deleteThread(id: number): Promise<void>;
  getThreadCount(): Promise<number>;
  searchThreads(query: string): Promise<Thread[]>;
  createPost(post: typeof posts.$inferInsert): Promise<Post>;
  getPost(id: number): Promise<Post | undefined>;
  deletePost(id: number): Promise<void>;
  seedCategories(): Promise<void>;
  updatePost(id: number, updates: Partial<typeof posts.$inferInsert>): Promise<Post>;
  createNotification(notif: InsertNotification): Promise<Notification>;
getNotifications(userId: number): Promise<Notification[]>;
markNotificationsRead(userId: number): Promise<void>;
  searchUsers(query: string): Promise<SafeUser[]>;
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

 async createNotification(notif: any) {
  const [notification] = await db.insert(notifications).values(notif).returning();
  return notification;
}

  async searchUsers(query: string): Promise<SafeUser[]> {
  const results = await db.select()
    .from(users)
    .where(sql`${users.username} ILIKE ${'%' + query + '%'}`)
    .limit(20);
  return results.map(u => this.toSafeUser(u));
}

  async markNotificationsRead(userId: number): Promise<void> {
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

async getNotifications(userId: number) {
  return await db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
}

  // --- ХЕЛПЕРЫ ---
  private toSafeUser(user: User): SafeUser {
    const { passwordHash, ...safe } = user;
    return {
      ...safe,
      avatarUrl: safe.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${safe.username}`
    };
  }

  // --- ПОЛЬЗОВАТЕЛИ ---
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: typeof users.$inferInsert): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<typeof users.$inferInsert>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!user) throw new Error(`User ${id} not found`);
    return user;
  }

  async listUsers(): Promise<SafeUser[]> {
    const allUsers = await db.select().from(users);
    return allUsers.map(u => this.toSafeUser(u));
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

  async updateUserPassword(id: number, newPasswordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, id));
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

  async getUserThreads(userId: number): Promise<Thread[]> {
    return await db.select()
      .from(threads)
      .where(eq(threads.authorId, userId))
      .orderBy(desc(threads.createdAt));
  }

  async getThread(id: number): Promise<ThreadWithPosts | undefined> {
    const [thread] = await db.select().from(threads).where(eq(threads.id, id));
    if (!thread) return undefined;

    const [author] = await db.select().from(users).where(eq(users.id, thread.authorId));
    const [category] = await db.select().from(categories).where(eq(categories.id, thread.categoryId));
    
    const threadPosts = await db.select()
      .from(posts)
      .where(eq(posts.threadId, id))
      .orderBy(posts.createdAt);

    const enrichedPosts = await Promise.all(threadPosts.map(async p => {
      const [pAuthor] = await db.select().from(users).where(eq(users.id, p.authorId));
      return {
        ...p,
        author: pAuthor ? this.toSafeUser(pAuthor) : null
      };
    }));

    return {
      ...thread,
      author: author ? this.toSafeUser(author) : null,
      category,
      posts: enrichedPosts,
      replyCount: Math.max(0, threadPosts.length - 1)
    };
  }

  async createThread(insertThread: typeof threads.$inferInsert): Promise<Thread> {
    const [thread] = await db.insert(threads).values(insertThread).returning();
    return thread;
  }

  async updatePost(id: number, updates: Partial<typeof posts.$inferInsert>): Promise<Post> {
  const [post] = await db.update(posts)
    .set(updates)
    .where(eq(posts.id, id))
    .returning();
  if (!post) throw new Error("Post not found");
  return post;
}

  async deleteThread(id: number): Promise<void> {
    await db.delete(posts).where(eq(posts.threadId, id));
    await db.delete(threads).where(eq(threads.id, id));
  }

  async getThreadCount(): Promise<number> {
    const [count] = await db.select({ value: sql<number>`count(*)` }).from(threads);
    return Number(count.value);
  }

  async searchThreads(query: string): Promise<Thread[]> {
    return await db.select()
      .from(threads)
      .where(sql`${threads.title} ILIKE ${'%' + query + '%'}`)
      .orderBy(desc(threads.createdAt))
      .limit(50);
  }

  // --- ПОСТЫ ---
  async createPost(insertPost: typeof posts.$inferInsert): Promise<Post> {
    const [post] = await db.insert(posts).values(insertPost).returning();
    return post;
  }

  async getPost(id: number): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async deletePost(id: number): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
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
