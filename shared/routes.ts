// @ts-nocheck
/**
 * SHARED ROUTES & API UTILS
 * Этот файл — единственный мост между фронтом и бэкендом.
 * Здесь НЕТ серверного кода, поэтому билд на Render пройдет.
 */

// 1. Универсальный загрузчик (используется внутри объекта api и отдельно)
export async function apiRequest(method: string, url: string, data?: any) {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || res.statusText);
  }
  return res.json();
}

/**
 * 2. ОБЪЕКТ API
 * Твой фронтенд (use-auth.tsx) делает: import { api } from "@shared/routes"
 * и потом вызывает api.me(), api.login() и т.д.
 */
export const api = Object.assign(
  // Это делает саму переменную 'api' функцией (на случай, если где-то вызывают api("/url"))
  async (url: string, options?: RequestInit) => {
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  {
    // А это добавляет свойства-методы (на случай, если вызывают api.me())
    me: () => apiRequest("GET", "/api/user"),
    login: (data: any) => apiRequest("POST", "/api/login", data),
    logout: () => apiRequest("POST", "/api/logout"),
    register: (data: any) => apiRequest("POST", "/api/register", data),
  }
);

/**
 * 3. УТИЛИТА СБОРКИ URL
 * Нужна для use-api.ts и поиска
 */
export function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const url = new URL(path, base);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url.pathname + url.search;
}
