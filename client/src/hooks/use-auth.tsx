import React, { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { SafeUser, LoginRequest, RegisterRequest } from "@shared/schema";

interface AuthContextType {
  user: SafeUser | null;
  isLoading: boolean;
  login: (data: LoginRequest) => void;
  register: (data: RegisterRequest) => void;
  logout: () => void;
  isLoggingIn: boolean;
  isRegistering: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, isLoading } = useQuery<SafeUser | null>({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Login failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.auth.me.path], data);
      toast({ title: "ACCESS GRANTED", description: "Welcome back." });
    },
    onError: (err: Error) => {
      toast({ title: "ACCESS DENIED", description: err.message, variant: "destructive" });
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const res = await fetch(api.auth.register.path, {
        method: api.auth.register.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Registration failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.auth.me.path], data);
      toast({ title: "REGISTRATION COMPLETE", description: "Identity forged." });
    },
    onError: (err: Error) => {
      toast({ title: "REGISTRATION FAILED", description: err.message, variant: "destructive" });
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch(api.auth.logout.path, { method: api.auth.logout.method, credentials: "include" });
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      toast({ title: "LOGGED OUT", description: "Connection severed." });
    }
  });

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        login: loginMutation.mutate,
        register: registerMutation.mutate,
        logout: logoutMutation.mutate,
        isLoggingIn: loginMutation.isPending,
        isRegistering: registerMutation.isPending,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
