import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "./ui/cyber-components";
import { leet } from "@/lib/leet";
import { Terminal, ShieldAlert, LogOut, User as UserIcon } from "lucide-react";
import { motion } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-primary hover:text-primary/80 transition-colors group">
            <Terminal className="w-6 h-6 group-hover:animate-pulse" />
            <span className="font-display font-bold text-xl tracking-widest">{leet("I-SWEA")}</span>
          </Link>

          <nav className="flex items-center gap-4">
            {user ? (
              <>
                <Link href={`/user/${user.id}`}>
                  <Button variant="ghost" className="gap-2">
                    <UserIcon className="w-4 h-4" />
                    {user.username}
                  </Button>
                </Link>
                {(user.role === "ADMIN" || user.role === "MODERATOR") && (
                  <Link href="/admin">
                    <Button variant="outline" className="gap-2 border-accent text-accent hover:bg-accent/10 hover:shadow-[0_0_10px_rgba(176,38,255,0.3)]">
                      <ShieldAlert className="w-4 h-4" />
                      {leet("SYS_ADMIN")}
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => logout()}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {leet("LOGOUT")}
                </Button>
              </>
            ) : (
              <Link href="/auth">
                <Button variant="outline">{leet("AUTHENTICATE")}</Button>
              </Link>
            )}
          </nav>
        </div>
        {/* Glowing bottom border effect */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      <footer className="border-t border-border mt-auto py-6 text-center text-sm text-muted-foreground">
        <p>{leet(`I-SWEA NETWORK // SYSTEM SECURE // ${new Date().getFullYear()}`)}</p>
      </footer>
    </div>
  );
}
