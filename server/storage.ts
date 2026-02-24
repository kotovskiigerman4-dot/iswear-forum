import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import {
  users, categories, threads, posts,
  type User, type InsertUser, type Category, type Thread, type Post,
  type CategoryWithThreads, type ThreadWithPosts, type SafeUser,
  type CreateThreadRequest, type CreatePostRequest, type UpdateProfileRequest
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: typeof users.$inferInsert): Promise<User>;
  updateUser(id: number, updates: Partial<typeof users.$inferInsert>): Promise<User>;
  listUsers(): Promise<SafeUser[]>;
  getUserCount(): Promise<number>;

  // Categories
  getCategories(): Promise<CategoryWithThreads[]>;
  getCategory(id: number): Promise<Category | undefined>;

  // Threads
  getThread(id: number): Promise<ThreadWithPosts | undefined>;
  createThread(thread: typeof threads.$inferInsert): Promise<Thread>;
  deleteThread(id: number): Promise<void>;
  getThreadCount(): Promise<number>;

  // Posts
  createPost(post: typeof posts.$inferInsert): Promise<Post>;
  deletePost(id: number): Promise<void>;
  
  // Seed
  seedCategories(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
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
    return user;
  }

  async listUsers(): Promise<SafeUser[]> {
    const allUsers = await db.select().from(users);
    return allUsers.map(u => {
      const { passwordHash, ...safe } = u;
      return safe;
    });
  }

  async getUserCount(): Promise<number> {
    const all = await db.select({ id: users.id }).from(users);
    return all.length;
  }

  async getCategories(): Promise<CategoryWithThreads[]> {
    const allCategories = await db.select().from(categories).orderBy(categories.position);
    
    // We will just fetch top threads for each category manually for simplicity
    const result: CategoryWithThreads[] = [];
    for (const cat of allCategories) {
      const catThreads = await db.select().from(threads).where(eq(threads.categoryId, cat.id)).orderBy(desc(threads.createdAt)).limit(5);
      
      const enrichedThreads = await Promise.all(catThreads.map(async t => {
        const [author] = await db.select().from(users).where(eq(users.id, t.authorId));
        const threadPosts = await db.select({ id: posts.id }).from(posts).where(eq(posts.threadId, t.id));
        const { passwordHash, ...safeAuthor } = author;
        return {
          ...t,
          author: safeAuthor,
          replyCount: Math.max(0, threadPosts.length - 1)
        };
      }));
      
      result.push({
        ...cat,
        threads: enrichedThreads
      });
    }
    return result;
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [cat] = await db.select().from(categories).where(eq(categories.id, id));
    return cat;
  }

  async getThread(id: number): Promise<ThreadWithPosts | undefined> {
    const [thread] = await db.select().from(threads).where(eq(threads.id, id));
    if (!thread) return undefined;

    const [author] = await db.select().from(users).where(eq(users.id, thread.authorId));
    const [category] = await db.select().from(categories).where(eq(categories.id, thread.categoryId));
    
    const threadPosts = await db.select().from(posts).where(eq(posts.threadId, id)).orderBy(posts.createdAt);
    const threadPostsCount = await db.select({ id: posts.id }).from(posts).where(eq(posts.threadId, id));

    const enrichedPosts = await Promise.all(threadPosts.map(async p => {
      const [pAuthor] = await db.select().from(users).where(eq(users.id, p.authorId));
      const { passwordHash, ...safeAuthor } = pAuthor;
      return {
        ...p,
        author: safeAuthor
      };
    }));

    const { passwordHash, ...safeAuthor } = author;

    return {
      ...thread,
      author: safeAuthor,
      category,
      replyCount: Math.max(0, threadPostsCount.length - 1),
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
    const all = await db.select({ id: threads.id }).from(threads);
    return all.length;
  }

  async createPost(insertPost: typeof posts.$inferInsert): Promise<Post> {
    const [post] = await db.insert(posts).values(insertPost).returning();
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
        { name: "Open Source", description: "Open source projects", position: 6, pinnedMessage: "зачем ты сюда полез" }
      ]);
    }
  }
}

export const storage = new DatabaseStorage();
