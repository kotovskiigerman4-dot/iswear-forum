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

export function useDeleteThread() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, categoryId }: { id: number; categoryId: number }) => {
      const url = buildUrl(api.threads.delete.path, { id });
      const res = await fetch(url, { method: api.threads.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete thread");
    },
    onSuccess: (_, { categoryId }) => {
      queryClient.invalidateQueries({ queryKey: [api.categories.get.path, categoryId] });
      toast({ title: "DELETED", description: "Thread purged from database." });
    }
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

export function useDeletePost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, threadId }: { id: number; threadId: number }) => {
      const url = buildUrl(api.posts.delete.path, { id });
      const res = await fetch(url, { method: api.posts.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete post");
    },
    onSuccess: (_, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: [api.threads.get.path, threadId] });
      toast({ title: "DELETED", description: "Post erased." });
    }
  });
}

// ====================
// USERS & ADMIN
// ====================
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

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateProfileRequest }) => {
      const url = buildUrl(api.users.update.path, { id });
      const res = await fetch(url, {
        method: api.users.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: [api.users.profile.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      toast({ title: "UPDATED", description: "Profile parameters saved." });
    }
  });
}

export function useUsersList() {
  return useQuery<SafeUser[]>({
    queryKey: [api.users.list.path],
    queryFn: async () => {
      const res = await fetch(api.users.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });
}

export function useAdminUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: AdminUpdateUserRequest }) => {
      const url = buildUrl(api.users.adminUpdate.path, { id });
      const res = await fetch(url, {
        method: api.users.adminUpdate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Admin action failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "OVERRIDE ACCEPTED", description: "User credentials modified." });
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
