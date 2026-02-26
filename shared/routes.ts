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
    get: { path: "/api/users/:id", method: "GET" }, // Исправлено для профилей
    update: { path: "/api/user", method: "PATCH" }, // Для редактирования своего профиля
  },
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
export function buildUrl(apiRoute: any, params?: Record<string, any>) {
  // 1. Получаем базовый путь
  let url = typeof apiRoute === 'string' ? apiRoute : (apiRoute?.path || "");
  
  if (!url) return "/api/undefined-route";

  if (params) {
    const usedKeys = new Set();

    // 2. Заменяем динамические части пути (:id, :username)
    Object.entries(params).forEach(([key, value]) => {
      const placeholder = `:${key}`;
      if (url.includes(placeholder)) {
        url = url.replace(placeholder, encodeURIComponent(String(value)));
        usedKeys.add(key); // Помечаем, что этот ключ уже вшит в URL
      }
    });

    // 3. Добавляем остальные параметры как Query String
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      // Добавляем в query только то, что НЕ было использовано в пути
      if (!usedKeys.has(key) && value !== undefined && value !== null) {
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

export async function apiRequest(method: string, url: string, data?: any) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });

  // Если сервер вернул HTML вместо JSON (твоя проблема с 404/Index HTML)
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("text/html")) {
    console.error("CRITICAL: Server returned HTML instead of JSON at " + url);
    throw new Error("API_ROUTE_NOT_FOUND_ON_SERVER");
  }

  if (!res.ok) {
    const errorText = await res.text();
    let errorDetail;
    try {
      errorDetail = JSON.parse(errorText).message;
    } catch {
      errorDetail = errorText;
    }
    throw new Error(errorDetail || res.statusText);
  }
  
  return res.json();
}
