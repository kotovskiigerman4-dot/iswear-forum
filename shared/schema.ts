import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  icq: text("icq"),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["ADMIN", "MODERATOR", "OLDGEN", "MEMBER"] }).default("MEMBER").notNull(),
  status: text("status", { enum: ["PENDING", "APPROVED", "REJECTED"] }).default("PENDING").notNull(),
  // Изменено: добавлено .notNull(), чтобы база данных требовала это поле при вставке
  applicationReason: text("application_reason").notNull(), 
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  bio: text("bio"),
  isBanned: boolean("is_banned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  pinnedMessage: text("pinned_message"),
});

export const threads = pgTable("threads", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  isLocked: boolean("is_locked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

// === RELATIONS ===

export const usersRelations = relations(users, ({ many }) => ({
  threads: many(threads),
  posts: many(posts),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  threads: many(threads),
}));

export const threadsRelations = relations(threads, ({ one, many }) => ({
  category: one(categories, {
    fields: [threads.categoryId],
    references: [categories.id],
  }),
  author: one(users, {
    fields: [threads.authorId],
    references: [users.id],
  }),
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  thread: one(threads, {
    fields: [posts.threadId],
    references: [threads.id],
  }),
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));

// === BASE SCHEMAS ===

// Убираем технические поля из схемы вставки
export const insertUserSchema = createInsertSchema(users)
  .omit({ 
    id: true, 
    createdAt: true, 
    passwordHash: true,
    role: true,
    status: true,
    isBanned: true 
  });

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertThreadSchema = createInsertSchema(threads).omit({ id: true, createdAt: true });
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true, updatedAt: true });

// === EXPLICIT API CONTRACT TYPES ===

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Thread = typeof threads.$inferSelect;
export type Post = typeof posts.$inferSelect;

export type SafeUser = Omit<User, "passwordHash">;

export type CategoryWithThreads = Category & { threads: ThreadWithAuthor[] };
export type ThreadWithAuthor = Thread & { author: SafeUser, replyCount: number };
export type ThreadWithPosts = ThreadWithAuthor & { posts: PostWithAuthor[], category: Category };
export type PostWithAuthor = Post & { author: SafeUser };

// Requests
export const loginSchema = z.object({
  username: z.string().min(1, "Identifier is required"),
  password: z.string().min(1, "Passphrase is required"),
});

// Основная схема для регистрации — убедись, что Auth.tsx ш
