// @ts-nocheck
/**
 * SHARED ROUTES
 * Восстанавливаем структуру api.auth.me.path, которую ждет use-auth.tsx
 */

export const api = {
  auth: {
    me: { path: "/api/user", method: "GET" },
    login: { path: "/api/login", method: "POST" },
    logout: { path: "/api/logout", method: "POST" },
    register: { path: "/api/register", method: "POST" },
  },
  // Если где-то во фронте используются другие пути, добавь их сюда по аналогии
};

// Функция для запросов (на случай, если используется в других местах)
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

// Утилита сборки URL
export function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const url = new URL(path, base);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.append(key, String(value));
    });
  }
  return url.pathname + url.search;
}
