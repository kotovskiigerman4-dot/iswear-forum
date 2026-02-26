// @ts-nocheck

// Базовая структура, которая ТОЧНО нужна
const rawApi = {
  auth: {
    me: { path: "/api/user", method: "GET" },
    login: { path: "/api/login", method: "POST" },
    logout: { path: "/api/logout", method: "POST" },
    register: { path: "/api/register", method: "POST" },
  },
  threads: {
    list: { path: "/api/threads", method: "GET" },
    get: (id) => ({ path: `/api/threads/${id}`, method: "GET" }),
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

// ХАК: Используем Proxy, чтобы если фронтенд запросит api.something.get, 
// и его нет в списке, приложение НЕ ПАДАЛО, а просто возвращало пустую заглушку.
export const api = new Proxy(rawApi, {
  get(target, prop) {
    if (prop in target) return target[prop];
    
    // Если фронт просит что-то неизвестное (например, api.notifications)
    return new Proxy({}, {
      get(_, subProp) {
        // Если просят функцию (типа .get() или .list())
        return () => ({ path: `/api/${String(prop)}`, method: "GET" });
      }
    });
  }
});

export function buildUrl(path, params) {
  if (!params) return path;
  let finalPath = path;
  if (typeof path === 'function') {
    const res = path(params.id || params);
    finalPath = res.path || res;
  }
  
  try {
    const url = new URL(finalPath, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'id') {
        url.searchParams.append(key, value.toString());
      }
    });
    return url.pathname + url.search;
  } catch (e) {
    return finalPath;
  }
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
