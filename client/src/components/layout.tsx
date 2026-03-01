import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "./ui/cyber-components";
import { leet } from "@/lib/leet";
import { Terminal, ShieldAlert, LogOut, User as UserIcon, Users, Search, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  // Получаем уведомления через react-query
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    refetchInterval: 10000, // Обновляем каждые 10 секунд
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          
          <Link href="/">
  <a className="flex items-center gap-3 text-primary hover:text-primary/80 transition-colors group cursor-pointer shrink-0">
    {/* ТВОЙ НОВЫЙ ЛОГОТИП */}
    <div className="relative w-8 h-8 flex items-center justify-center border border-primary/20 bg-black/40 rounded-sm group-hover:border-primary/50 transition-all shadow-[0_0_10px_rgba(0,255,159,0.1)]">
      <img 
        src="https://media.discordapp.net/attachments/1293910911240634390/1477790740582105098/favicon.png?ex=69a60b60&is=69a4b9e0&hm=5dd412db36f37b9e2fa7023f90820a09787af31955f897e492d6ee6cbe9103c2&=&format=webp&quality=lossless&width=20&height=20" 
        alt="I-SWEA LOGO" 
        className="w-6 h-6 object-contain group-hover:scale-110 transition-transform duration-300"
      />
    </div>
    
    <span className="font-display font-bold text-xl tracking-widest">
      {leet("I-SWEA")}
    </span>
  </a>
</Link>

            {/* ПОИСКОВАЯ СТРОКА */}
            <form onSubmit={handleSearch} className="relative hidden md:block w-full max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-primary/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={leet("SEARCH_DATABASE...")}
                className="w-full bg-black/40 border border-primary/20 pl-8 pr-3 py-1 text-[10px] font-mono text-primary focus:border-primary/60 outline-none transition-all placeholder:text-primary/30"
              />
            </form>

            <Link href="/users">
              <a className={`flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] px-3 py-1 border transition-all cursor-pointer uppercase shrink-0 ${
                location === "/users" 
                  ? "border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(0,255,159,0.2)]" 
                  : "border-primary/20 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5"
              }`}>
                <Users className="w-3 h-3" />
                {leet("ENTITIES")}
              </a>
            </Link>
          </div>

          {/* Правая часть: Уведомления + Профиль */}
          <nav className="flex items-center gap-2 md:gap-4">
            {user ? (
              <>
                {/* КОЛОКОЛЬЧИК УВЕДОМЛЕНИЙ */}
                <Link href="/notifications">
                  <a className="relative p-2 text-primary/60 hover:text-primary transition-colors cursor-pointer">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 bg-destructive text-[9px] font-bold px-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full shadow-[0_0_5px_red] animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </a>
                </Link>

                <Link href={`/user/${user.id}`}>
                  <Button variant="ghost" className="gap-2 px-2 md:px-4">
                    <UserIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">{user.username}</span>
                  </Button>
                </Link>

                {(user.role === "ADMIN" || user.role === "MODERATOR") && (
                  <Link href="/admin">
                    <Button variant="outline" className="gap-2 border-accent text-accent hover:bg-accent/10 hover:shadow-[0_0_10px_rgba(176,38,255,0.3)] hidden sm:flex">
                      <ShieldAlert className="w-4 h-4" />
                      {leet("SYS_ADMIN")}
                    </Button>
                  </Link>
                )}

                <Button variant="ghost" className="text-destructive hover:text-destructive px-2" onClick={() => logout()}>
                  <LogOut className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{leet("LOGOUT")}</span>
                </Button>
              </>
            ) : (
              <Link href="/auth">
                <Button variant="outline">{leet("AUTHENTICATE")}</Button>
              </Link>
            )}
          </nav>
        </div>
        
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
