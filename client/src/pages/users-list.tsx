// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, RoleBadge } from "@/components/ui/cyber-components";
import { leet } from "@/lib/leet";
import { Link } from "wouter";
import { User as UserIcon, Monitor, ShieldCheck, Cpu } from "lucide-react";

// Веса ролей для иерархии
const ROLE_PRIORITY: Record<string, number> = {
  ADMIN: 1,
  MODERATOR: 2,
  USER: 3,
};

export default function UsersList() {
  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Network failure");
      return res.json();
    }
  });

  // Логика сортировки по иерархии
  const sortedUsers = users ? [...users].sort((a, b) => {
    const priorityA = ROLE_PRIORITY[a.role] || 99;
    const priorityB = ROLE_PRIORITY[b.role] || 99;
    
    // Сначала сортируем по роли
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    // Если роли одинаковые — сортируем по ID или алфавиту
    return a.id - b.id;
  }) : [];

  if (isLoading) return <Layout><div className="p-10 animate-pulse text-primary font-mono">{leet("SCANNING_NODES...")}</div></Layout>;

  // Группировка для визуального разделения (опционально)
  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8 pt-6">
        <div className="border-l-4 border-primary pl-4">
          <h1 className="text-4xl font-display text-primary uppercase tracking-tighter">
            {leet("NETWORK_ENTITIES")}
          </h1>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em]">
            Hierarchy classification: {sortedUsers.length} units detected
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedUsers.map((user: any) => (
            <Link key={user.id} href={`/profile/${user.id}`}>
              <Card className={`p-4 transition-all cursor-pointer group relative overflow-hidden border-primary/10 hover:border-primary/40 
                ${user.role === 'ADMIN' ? 'bg-primary/10 border-primary/30' : 
                  user.role === 'MODERATOR' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-card/30'}`}>
                
                {/* Спецэффекты для верхушки иерархии */}
                {user.role === "ADMIN" && (
                  <>
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-primary animate-scan opacity-50" />
                    <div className="absolute -right-4 -top-4 opacity-5">
                      <ShieldCheck className="w-24 h-24 text-primary" />
                    </div>
                  </>
                )}
                
                <div className="flex items-center gap-4 relative z-10">
                  <div className={`w-14 h-14 border-2 overflow-hidden flex-shrink-0 
                    ${user.role === 'ADMIN' ? 'border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]' : 
                      user.role === 'MODERATOR' ? 'border-blue-400' : 'border-primary/30'}`}>
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary">
                        <UserIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-display text-xl transition-colors 
                        ${user.role === 'ADMIN' ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
                        {user.username}
                      </h3>
                      {user.role === "ADMIN" && <Monitor className="w-3 h-3 text-primary animate-pulse" />}
                      {user.role === "MODERATOR" && <Cpu className="w-3 h-3 text-blue-400" />}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <RoleBadge role={user.role} />
                      <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest">
                        Node_ID: {user.id.toString().padStart(4, '0')}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
