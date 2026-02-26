// @ts-nocheck
export const api = {
  auth: {
    me: { path: "/api/user", method: "GET" },
    login: { path: "/api/login", method: "POST" },
    logout: { path: "/api/logout", method: "POST" },
    register: { path: "/api/register", method: "POST" },
  },
  threads: {
    list: { path: "/api/threads", method: "GET" },
    get: { path: "/api/threads/:id", method: "GET" },
    create: { path: "/api/threads", method: "POST" },
    delete: { path: "/api/threads/:id", method: "DELETE" },
  },
  categories: {
    list: { path: "/api/categories", method: "GET" },
    get: { path: "/api/categories/:id", method: "GET" },
  },
  posts: {
    list: { path: "/api/posts", method: "GET" },
    get: { path: "/api/posts/:id", method: "GET" },
    create: { path: "/api/posts", method: "POST" },
    delete: { path: "/api/posts/:id", method: "DELETE" },
  },
  users: {
    list: { path: "/api/users", method: "GET" },
    get: { path: "/api/users/:id", method: "GET" },
  },
  // ЭТОГО НЕ ХВАТАЛО ДЛЯ ТВОЕГО use-api.ts:
  stats: {
    get: { path: "/api/stats", method: "GET" },
  },
  search: {
    list: { path: "/api/search", method: "GET" },
  },
  notifications: {
    list: { path: "/api/notifications", method: "GET" },
  }
};

/**
 * Универсальный сборщик URL для фронтенда
 */
export function buildUrl(apiRoute, params) {
  // Если передана строка (как в useProfile), используем её напрямую
  let url = typeof apiRoute === 'string' ? apiRoute : (apiRoute?.path || "");
  
  if (!url) return "/api/undefined-route";

  if (params) {
    // 1. Заменяем динамические части пути (:id, :username)
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, encodeURIComponent(String(value)));
      }
    });

    // 2. Добавляем остальные параметры как Query String
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      // Добавляем в query только то, что не ушло в путь
      if (!url.includes(encodeURIComponent(String(value))) && key !== 'id' && value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
    
    const queryString = queryParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }
  
  return url;
}

export async function apiRequest(method, url, data) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || res.statusText);
  }
  return res.json();
}
