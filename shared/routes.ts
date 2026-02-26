// @ts-nocheck

// 1. Объект API со всеми возможными методами
export const api = {
  auth: {
    me: { path: "/api/user", method: "GET" },
    login: { path: "/api/login", method: "POST" },
    logout: { path: "/api/logout", method: "POST" },
    register: { path: "/api/register", method: "POST" },
  },
  threads: {
    list: { path: "/api/threads", method: "GET" },
    get: (id) => ({ path: `/api/threads/${id}`, method: "GET" }), // Тот самый 'get', который падал
    create: { path: "/api/threads", method: "POST" },
  },
  categories: {
    list: { path: "/api/categories", method: "GET" },
    get: (id) => ({ path: `/api/categories/${id}`, method: "GET" }),
  },
  posts: {
    list: (threadId) => ({ path: `/api/posts?threadId=${threadId}`, method: "GET" }),
    get: (id) => ({ path: `/api/posts/${id}`, method: "GET" }),
    create: { path: "/api/posts", method: "POST" },
  },
  users: {
    list: { path: "/api/users", method: "GET" },
    get: (id) => ({ path: `/api/users/${id}`, method: "GET" }),
  }
};

// 2. Функция сборки URL (необходима для использования в хуках)
export function buildUrl(path, params) {
  if (!params) return path;
  // Если path — это функция (например, api.threads.get), вызываем её
  const base = typeof path === 'function' ? path(params.id || params).path : path;
  
  const url = new URL(base, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && key !== 'id') {
      url.searchParams.append(key, value.toString());
    }
  });
  return url.pathname + url.search;
}

// 3. Базовая функция для запросов
export async function apiRequest(method, url, data) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    let errorMessage;
    try {
      errorMessage = JSON.parse(errorText).message;
    } catch (e) {
      errorMessage = errorText;
    }
    throw new Error(errorMessage || res.statusText);
  }
  return res.json();
}
