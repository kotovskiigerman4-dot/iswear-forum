// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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
    queryKey: ["/api/categories"], // Используем строку для простоты
    queryFn: async () => {
      const res = await fetch("/api/categories");
      return handleResponse(res);
    },
  });
}

export function useCategory(id: number | string) {
  const cleanId = Number(id);
  return useQuery({
    queryKey: ["/api/categories", cleanId],
    queryFn: async () => {
      const res = await fetch(`/api/categories/${cleanId}`);
      return handleResponse(res);
    },
    enabled: !isNaN(cleanId),
  });
}

// ====================
// THREADS
// ====================
export function useThread(id: number | string) {
  const cleanId = Number(id);
  return useQuery({
    queryKey: ["/api/threads", cleanId],
    queryFn: async () => {
      const res = await fetch(`/api/threads/${cleanId}`);
      return handleResponse(res);
    },
    enabled: !isNaN(cleanId),
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data) => {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      return handleResponse(res);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "SUCCESS", description: "Thread initialized." });
    },
  });

}
export function useDeletePost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, threadId }: { id: number; threadId: number }) => {
      const res = await fetch(`/api/posts/${id}`, { 
        method: "DELETE", 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete post");
      return { id, threadId };
    },
    onSuccess: (data) => {
      // Обновляем кэш треда, чтобы пост исчез мгновенно
      queryClient.invalidateQueries({ queryKey: ["/api/threads", Number(data.threadId)] });
      toast({ title: "DELETED", description: "Post removed." });
    },
  });
}

// ====================
// POSTS (ПОЧИНЕНО: Принудительное число)
// ====================
export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      // Гарантируем, что threadId — число перед отправкой
      const payload = {
        ...data,
        threadId: Number(data.threadId)
      };
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      return handleResponse(res);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/threads", Number(data.threadId)] });
    },
  });
}

// ====================
// USERS & PROFILE (ПОЧИНЕНО)
// ====================
export function usePublicUsers() {
  return useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      return handleResponse(res);
    },
  });
}

export function useProfile(id: number | string) {
  const cleanId = Number(id);
  return useQuery({
    queryKey: ["/api/profile", cleanId],
    queryFn: async () => {
      // Стучимся в эндпоинт, который мы прописали на бэке
      const res = await fetch(`/api/profile/${cleanId}`);
      return handleResponse(res);
    },
    enabled: !isNaN(cleanId),
    retry: 1,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/profile/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      return handleResponse(res);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile", Number(data.id)] });
      toast({ title: "UPDATED", description: "Profile info synchronized." });
    },
  });
}

export function useStats() {
  return useQuery({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      return handleResponse(res);
    },
  });
}

// Вспомогательный хук для удаления (чтобы модеры могли чистить)
export function useDeleteThread() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  return useMutation({
    mutationFn: async ({ id }) => {
      const res = await fetch(`/api/threads/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setLocation("/");
    }
  });
}

// ====================
// ДОБАВЬ ЭТО В use-api.ts
// ====================

// Тот самый хук, на котором упал билд (для страницы админа)
export function useUsersList() {
  return useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      return handleResponse(res);
    },
  });
}

// На случай, если страница админа или списка юзеров захочет забанить/удалить
export function useAdminDeleteUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "TERMINATED", description: "User removed from system." });
    },
  });
}

// Для обновления ролей или статусов из админки
export function useAdminUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      return handleResponse(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "ADMIN_ACTION", description: "User updated successfully." });
    },
  });
}
