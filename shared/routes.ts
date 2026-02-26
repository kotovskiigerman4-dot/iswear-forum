// @ts-nocheck
/**
 * ПОЛНЫЙ SHARED ROUTES
 * Решает ошибку "reading 'list'" и "reading 'me'"
 */

export const api = {
  auth: {
    me: { path: "/api/user", method: "GET" },
    login: { path: "/api/login", method: "POST" },
    logout: { path: "/api/logout", method: "POST" },
    register: { path: "/api/register", method: "POST" },
  },
  // Добавляем заглушки для всех остальных вызовов, чтобы фронт не падал
  threads: {
    list: { path: "/api/threads", method: "GET" },
    get: (id: number) => ({ path: `/api/threads/${id}`, method: "GET" }),
    create: { path: "/api/threads", method: "POST" },
  },
  categories: {
    list: { path: "/api/categories", method: "GET" },
  },
  posts: {
    list: (threadId: number) => ({ path: `/api/posts?threadId=${threadId}`, method: "GET" }),
    create: { path: "/api/posts", method: "POST" },
  },
  users: {
    list: { path: "/api/users", method: "GET" },
  }
};

// Функция для запросов, если она используется в use-api.ts
export async function apiRequest(method: string, url: string, data?: any) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || res.statusText);
  }
  return res.json();
}
