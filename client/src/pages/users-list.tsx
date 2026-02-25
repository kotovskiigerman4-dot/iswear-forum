import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, RoleBadge } from "@/components/ui/cyber-components";
import { leet } from "@/lib/leet";
import { Link } from "wouter";
import { User as UserIcon, Monitor } from "lucide-react";

export default function UsersList() {
  // Используем прямой fetch, если нет готового хука
  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Network failure");
      return res.json();
    }
  });

  if (isLoading) return <Layout><div className="p-10 animate-pulse text-primary font-mono">{leet("SCANNING_NODES...")}</div></Layout>;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8 pt-6">
        <div className="border-l-4 border-primary pl-4">
          <h1 className="text-4xl font-display text-primary uppercase tracking-tighter">
            {leet("NETWORK_ENTITIES")}
          </h1>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em]">Hierarchy classification active</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users?.map((user: any) => (
            <Link key={user.id} href={`/profile/${user.id}`}>
              <Card className={`p-4 transition-all cursor-pointer group relative overflow-hidden border-primary/10 hover:border-primary/40 ${user.role === 'ADMIN' ? 'bg-primary/5' : 'bg-card/30'}`}>
                
                {/* Эффект сканирования для админов */}
                {user.role === "ADMIN" && (
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-primary/50 animate-scan" />
                )}
                
                <div className="flex items-center gap-4 relative z-10">
                  {/* Аватар с обводкой */}
                  <div className={`w-14 h-14 border-2 overflow-hidden flex-shrink-0 ${user.role === 'ADMIN' ? 'border-accent shadow-[0_0_10px_rgba(255,0,0,0.2)]' : 'border-primary/30'}`}>
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary">
                        <UserIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-xl text-foreground group-hover:text-primary transition-colors">
                        {user.username}
                      </h3>
                      {user.role === "ADMIN" && <Monitor className="w-3 h-3 text-accent animate-pulse" />}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <RoleBadge role={user.role} />
                      <span className="text-[9px] text-muted-foreground font-mono uppercase">ID: {user.id.toString().padStart(4, '0')}</span>
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
