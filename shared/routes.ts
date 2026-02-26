// @ts-nocheck
/**
 * Этот файл - мост между фронтендом и бэкендом.
 * Здесь ТОЛЬКО легкие функции, которые понимает браузер.
 */

// Функция для выполнения запросов (её ищет use-auth.tsx)
export async function api<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || res.statusText);
  }

  return res.json();
}

// Утилита для сборки ссылок (её ищет use-api.ts)
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
