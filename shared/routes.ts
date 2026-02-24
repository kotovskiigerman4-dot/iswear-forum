import { z } from 'zod';
import { 
  insertCategorySchema, 
  insertThreadSchema, 
  insertPostSchema,
  loginSchema,
  registerSchema
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  // --- НОВЫЙ МАРШРУТ ДЛЯ ЗАГРУЗКИ ФАЙЛОВ ---
  upload: {
    method: 'POST' as const,
    path: '/api/upload' as const,
    responses: {
      200: z.object({ url: z.string() }),
      400: z.object({ message: z.string() }),
      401: errorSchemas.unauthorized,
    }
  },
  auth: {
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.any(), // SafeUser
        401: errorSchemas.unauthorized,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: loginSchema,
      responses: {
        200: z.any(), // SafeUser
        401: errorSchemas.unauthorized,
      },
    },
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: registerSchema,
      responses: {
        201: z.any(), // SafeUser
        400: errorSchemas.validation,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ message: z.string() }),
      },
    }
  },
  categories: {
    list: {
      method: 'GET' as const,
      path: '/api/categories' as const,
      responses: {
        200: z.array(z.any()), // CategoryWithThreads[]
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/categories/:id' as const,
      responses: {
        200: z.any(), // CategoryWithThreads
        404: errorSchemas.notFound,
      }
    }
  },
  threads: {
    create: {
      method: 'POST' as const,
      path: '/api/threads' as const,
      input: z.object({
        title: z.string().min(1),
        content: z.string().min(1),
        categoryId: z.number(),
        fileUrl: z.string().optional(), // <--- РАЗРЕШАЕМ ФАЙЛ
      }),
      responses: {
        201: z.any(), // Thread
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/threads/:id' as const,
      responses: {
        200: z.any(), // ThreadWithPosts
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/threads/:id' as const,
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      }
    }
  },
  posts: {
    create: {
      method: 'POST' as const,
      path: '/api/posts' as const,
      input: z.object({
        content: z.string().min(1),
        threadId: z.number(),
        fileUrl: z.string().optional(), // <--- РАЗРЕШАЕМ ФАЙЛ
      }),
      responses: {
        201: z.any(), // Post
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/posts/:id' as const,
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      }
    }
  },
  users: {
    profile: {
      method: 'GET' as const,
      path: '/api/users/:id' as const,
      responses: {
        200: z.any(), // SafeUser
        404: errorSchemas.notFound,
      }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/users/:id' as const,
      input: z.object({
        bio: z.string().optional(),
        avatarUrl: z.string().optional(),
        bannerUrl: z.string().optional(),
        icq: z.string().optional(),
      }),
      responses: {
        200: z.any(), // SafeUser
        401: errorSchemas.unauthorized,
      }
    },
    list: {
      method: 'GET' as const,
      path: '/api/users' as const,
      responses: {
        200: z.array(z.any()), // SafeUser[]
        401: errorSchemas.unauthorized,
      }
    },
    adminUpdate: {
      method: 'PATCH' as const,
      path: '/api/users/:id/admin' as const,
      input: z.object({
        role: z.enum(["ADMIN", "MODERATOR", "OLDGEN", "MEMBER"]).optional(),
        isBanned: z.boolean().optional(),
      }),
      responses: {
        200: z.any(), // SafeUser
        401: errorSchemas.unauthorized,
      }
    }
  },
  stats: {
    get: {
      method: 'GET' as const,
      path: '/api/stats' as const,
      responses: {
        200: z.object({
          userCount: z.number(),
          threadCount: z.number(),
        }),
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
