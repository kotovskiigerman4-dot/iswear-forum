// src/shared/routes.ts

/**
 * Этот файл содержит ТОЛЬКО константы и типы для фронтенда.
 * Сюда НЕЛЬЗЯ импортировать storage.ts или любые серверные модули (express, multer).
 */

export const api = {
  // Если твой use-auth.tsx использует api.login или что-то подобное, 
  // обычно это просто функции-обертки над fetch.
  // Если объект api был пустым или содержал пути, опиши его здесь:
  login: "/api/login",
  logout: "/api/logout",
  register: "/api/register",
  user: "/api/user",
};

// Если во фронтенде api используется как функция (например api("/api/users")), 
// раскомментируй это:
/*
export const api = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};
*/
