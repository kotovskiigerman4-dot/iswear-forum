import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { 
  CategoryWithThreads, ThreadWithPosts, CreateThreadRequest, 
  CreatePostRequest, SafeUser, UpdateProfileRequest 
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
        method: "POST",
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
// USERS & ADMIN
// ====================
export function useUsersList() {
  return useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });
}

export function useAdminUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/users/${id}/admin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Admin action failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "SUCCESS", description: "User updated." });
    },
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
    queryKey: ["/api/users/profile", id],
    queryFn: async () => {
      const url = buildUrl("/api/users/:id", { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    enabled: !!id,
  });
}
