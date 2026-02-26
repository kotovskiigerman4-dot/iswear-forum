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
    getByName: { path: "/api/users/by-name/:username", method: "GET" },
  },
  profile: {
    get: { path: "/api/profile/:id", method: "GET" },
    changePassword: { path: "/api/user/change-password", method: "POST" },
  }
};

/**
 * Умный сборщик URL. 
 * Если видит :id или :username в пути — заменяет их на реальные значения из params.
 */
export function buildUrl(apiRoute, params) {
  let url = typeof apiRoute === 'string' ? apiRoute : apiRoute.path;
  
  if (params) {
    // Заменяем именованные параметры :id, :username и т.д.
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, encodeURIComponent(String(value)));
      }
    });

    // Добавляем остальные параметры как Query String (например, ?threadId=5)
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (!apiRoute.path?.includes(`:${key}`) && key !== 'id' && value !== undefined) {
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
