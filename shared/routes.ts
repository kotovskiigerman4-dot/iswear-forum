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
  },
  categories: {
    list: { path: "/api/categories", method: "GET" },
  },
  posts: {
    list: (threadId) => ({ path: `/api/posts?threadId=${threadId}`, method: "GET" }),
    create: { path: "/api/posts", method: "POST" },
  },
  users: {
    list: { path: "/api/users", method: "GET" },
  }
};

// ЭТОЙ ФУНКЦИИ НЕ ХВАТАЛО:
export function buildUrl(path, params) {
  if (!params) return path;
  const url = new URL(path, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value.toString());
    }
  });
  return url.pathname + url.search;
}

export async function apiRequest(method, url, data) {
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
