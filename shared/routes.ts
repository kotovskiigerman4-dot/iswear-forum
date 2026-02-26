/**
 * КЛИЕНТСКИЕ РОУТЫ И УТИЛИТЫ
 * Этот файл безопасно импортировать во фронтенд.
 */

// 1. Объект api для use-auth.tsx
export const api = {
  login: "/api/login",
  logout: "/api/logout",
  register: "/api/register",
  user: "/api/user",
};

// 2. Функция buildUrl для use-api.ts
// Она просто склеивает базовый путь с параметрами (если они есть)
export function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url.pathname + url.search;
}
