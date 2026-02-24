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

export function useDeletePost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id }) => {
      const url = buildUrl(api.posts.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Erase failed");
    },
    onSuccess: () => {
      toast({ title: "DELETED", description: "Post erased." });
    }
  });
}

// ====================
// USERS & ADMIN
// ====================
export function useUsersList() {
  return useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      return handleResponse(res);
    },
  });
}

export function useAdminUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(`/api/users/${id}/admin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      return handleResponse(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "SUCCESS", description: "User updated." });
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
    // Используем уникальный ключ, чтобы данные не перемешивались
    queryKey: ["/api/users/profile", id], 
    queryFn: async () => {
      const url = buildUrl("/api/users/:id", { id });
      const res = await fetch(url);
      
      // Если юзер не найден (404), handleResponse выбросит Error, 
      // и в компоненте Profile сработает экран ошибки.
      return handleResponse(res);
    },
    enabled: !!id && !isNaN(id),
    retry: 1, // Не мучаем сервер, если юзера нет
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
      // Обновляем кэш конкретного профиля
      queryClient.invalidateQueries({ queryKey: ["/api/users/profile", updatedUser.id] });
      toast({ title: "UPDATED", description: "Profile saved." });
    }
  });
}
