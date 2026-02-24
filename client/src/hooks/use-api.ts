import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { 
  CategoryWithThreads, ThreadWithPosts, CreateThreadRequest, 
  CreatePostRequest, SafeUser, UpdateProfileRequest, AdminUpdateUserRequest 
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// ====================
// CATEGORIES
// ====================
export function useCategories() {
  return useQuery<CategoryWithThreads[]>({
    queryKey: [api.categories.list.path],
    queryFn: async () => {
      const res = await fetch(api.categories.list.path);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });
}

export function useCategory(id: number) {
  return useQuery<CategoryWithThreads>({
    queryKey: [api.categories.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.categories.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) throw new Error("Category not found");
      if (!res.ok) throw new Error("Failed to fetch category");
      return res.json();
    },
    enabled: !!id,
  });
}

// ====================
// THREADS
// ====================
export function useThread(id: number) {
  return useQuery<ThreadWithPosts>({
    queryKey: [api.threads.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.threads.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) throw new Error("Thread not found");
      if (!res.ok) throw new Error("Failed to fetch thread");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: CreateThreadRequest) => {
      const res = await fetch(api.threads.create.path, {
        method: api.threads.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create thread");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.categories.get.path, data.categoryId] });
      toast({ title: "SUCCESS", description: "Thread initialized." });
    },
    onError: (err: Error) => toast({ title: "ERROR", description: err.message, variant: "destructive" }),
  });
}

// ====================
// POSTS
// ====================
export function useCreatePost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: CreatePostRequest) => {
      const res = await fetch(api.posts.create.path, {
        method: api.posts.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit post");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.threads.get.path, data.threadId] });
    },
    onError: (err: Error) => toast({ title: "ERROR", description: err.message, variant: "destructive" }),
  });
}

// ====================
// USERS & ADMIN (ОСНОВНОЙ БЛОК)
// ====================
export function useUsersList() {
  return useQuery<SafeUser[]>({
    queryKey: [api.users.list.path],
    queryFn: async () => {
      // Логируем попытку запроса
      console.log("DEBUG: Requesting users list from", api.users.list.path);
      
      const res = await fetch(api.users.list.path, { credentials: "include" });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Unknown error" }));
        console.error("DEBUG: Users fetch failed", res.status, errData);
        throw new Error(errData.message || "Failed to fetch users");
      }
      
      const data = await res.json();
      // Логируем результат
      console.log("DEBUG: Users received from server:", data);
      return data;
    },
    // Рефетчим данные при каждом входе в админку
    refetchOnMount: "always",
  });
}

export function useAdminUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: AdminUpdateUserRequest }) => {
      // Путь должен вести на /api/users/:id/admin
      const url = buildUrl("/api/users/:id/admin", { id });
      
      console.log("DEBUG: Admin updating user", id, "with data:", data);

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Action failed" }));
        throw new Error(err.message || "Admin action failed");
      }
      return res.json();
    },
    onSuccess: () => {
      // Сбрасываем кэш, чтобы список обновился мгновенно
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      toast({ title: "SUCCESS", description: "User status updated." });
    },
    onError: (err: Error) => {
      toast({ title: "ACTION FAILED", description: err.message, variant: "destructive" });
    }
  });
}

export function useStats() {
  return useQuery<{ userCount: number; threadCount: number }>({
    queryKey: [api.stats.get.path],
    queryFn: async () => {
      const res = await fetch(api.stats.get.path);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });
}

export function useProfile(id: number) {
  return useQuery<SafeUser>({
    queryKey: [api.users.profile.path, id],
    queryFn: async () => {
      const url = buildUrl(api.users.profile.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    enabled: !!id,
  });
}
