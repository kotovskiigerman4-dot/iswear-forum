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
    get: (id) => ({ path: `/api/threads/${id}`, method: "GET" }),
    create: { path: "/api/threads", method: "POST" },
    delete: (id) => ({ path: `/api/threads/${id}`, method: "DELETE" }),
  },
  categories: {
    list: { path: "/api/categories", method: "GET" },
    get: (id) => ({ path: `/api/categories/${id}`, method: "GET" }),
  },
  posts: {
    list: (threadId) => ({ path: `/api/posts?threadId=${threadId}`, method: "GET" }),
    get: (id) => ({ path: `/api/posts/${id}`, method: "GET" }),
    create: { path: "/api/posts", method: "POST" },
    delete: (id) => ({ path: `/api/posts/${id}`, method: "DELETE" }),
  },
  // ЭТО ТО, ЧТО ПОЧИНИТ АДМИНКУ И ПРОФИЛИ:
  users: {
    list: { path: "/api/users", method: "GET" },
    get: (id) => ({ path: `/api/users/${id}`, method: "GET" }),
    getByName: (username) => ({ path: `/api/users/by-name/${username}`, method: "GET" }),
    updateRole: (id) => ({ path: `/api/users/${id}/role`, method: "PATCH" }),
    updateStatus: (id) => ({ path: `/api/users/${id}/status`, method: "PATCH" }),
  },
  profile: {
    get: (id) => ({ path: `/api/profile/${id}`, method: "GET" }),
    update: { path: "/api/user/update", method: "PATCH" },
    changePassword: { path: "/api/user/change-password", method: "POST" },
  }
};

export function buildUrl(path, params) {
  if (!params) return typeof path === 'function' ? path().path : (path.path || path);
  
  let finalPath = path;
  if (typeof path === 'function') {
    const res = path(params.id || params.username || params);
    finalPath = res.path || res;
  } else if (path.path) {
    finalPath = path.path;
  }
  
  // Очистка пути от параметров, которые мы вставили внутрь (как :id)
  return finalPath;
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
