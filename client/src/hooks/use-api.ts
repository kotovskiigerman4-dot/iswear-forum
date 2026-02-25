// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

// Вспомогательная функция для обработки ошибок fetch
async function handleResponse(res: Response) {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP_ERROR_${res.status}`);
  }
  return res.json();
}

// ====================
// CATEGORIES
// ====================
export function useCategories() {
  return useQuery({
    queryKey: [api.categories.list.path],
    queryFn: async () => {
      const res = await fetch(api.categories.list.path);
      return handleResponse(res);
    },
  });
}

export function useCategory(id: number) {
  return useQuery({
    queryKey: [api.categories.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.categories.get.path, { id });
      const res = await fetch(url);
      return handleResponse(res);
    },
    enabled: !!id && !isNaN(id),
  });
}

// ====================
// THREADS
// ====================
export function useThread(id: number) {
  return useQuery({
    queryKey: [api.threads.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.threads.get.path, { id });
      const res = await fetch(url);
      return handleResponse(res);
    },
    enabled: !!id && !isNaN(id),
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data) => {
      const res = await fetch(api.threads.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      return handleResponse(res);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.categories.get.path, data.categoryId] });
      toast({ title: "SUCCESS", description: "Thread initialized." });
    },
  });
}

export function useDeleteThread() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id }) => {
      const url = buildUrl(api.threads.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Purge failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.categories.list.path] });
      toast({ title: "DELETED", description: "Thread purged." });
    }
  });
}

// ====================
// POSTS
// ====================
export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await fetch(api.posts.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      return handleResponse(res);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.threads.get.path, data.threadId] });
    },
  });
}

// ====================
// USERS & ADMIN (ИСПРАВЛЕНО)
// ====================

// 1. Список для админ-панели (защищенный)
export function useUsersList() {
  return useQuery({
    queryKey: ["/api/admin/users"], // Исправлен ключ
    queryFn: async () => {
      // Исправлен путь на /api/admin/users
      const res = await fetch("/api/admin/users", { credentials: "include" });
      return handleResponse(res);
    },
  });
}

// 2. Публичный список юзеров для главной страницы (ТВОЙ ЗАПРОС)
export function usePublicUsers() {
  return useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      return handleResponse(res);
    },
  });
}

// 3. Обновление пользователя админом (кнопки одобрения/бана)
export function useAdminUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      // Исправлен путь: на бэкенде мы сделали PATCH /api/admin/users/:id
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      return handleResponse(res);
    },
    onSuccess: () => {
      // Инвалидируем оба ключа, чтобы данные обновились везде
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      toast({ title: "SUCCESS", description: "Database updated." });
    },
  });
}

export function useStats() {
  return useQuery({
    queryKey: [api.stats.get.path],
    queryFn: async () => {
      const res = await fetch(api.stats.get.path);
      return handleResponse(res);
    },
  });
}

// ====================
// PROFILE (FIXED)
// ====================
export function useProfile(id: number) {
  return useQuery({
    queryKey: ["/api/users/profile", id], 
    queryFn: async () => {
      const url = buildUrl("/api/users/:id", { id });
      const res = await fetch(url);
      return handleResponse(res);
    },
    enabled: !!id && !isNaN(id),
    retry: 1,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const url = buildUrl("/api/users/:id", { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      return handleResponse(res);
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/profile", updatedUser.id] });
      toast({ title: "UPDATED", description: "Profile saved." });
    }
  });
}
