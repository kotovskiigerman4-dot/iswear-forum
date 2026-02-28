import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { leet } from "@/lib/leet";
import { Search as SearchIcon, Terminal, Hash, User as UserIcon } from "lucide-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";

export default function SearchPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const query = searchParams.get("q") || "";

  const { data: results = { threads: [], users: [] }, isLoading } = useQuery({
    queryKey: ["/api/search", query],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: query.length > 0,
  });

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center gap-4 border-b border-primary/20 pb-4">
          <SearchIcon className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tighter text-primary">
              {leet("DATABASE_QUERY")}
            </h1>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.3em]">
              {leet("TARGET")}: <span className="text-primary">{query}</span>
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-primary animate-pulse font-mono text-sm">{leet("SCANNING_NETWORK...")}</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* БЛОК ЮЗЕРОВ */}
            <div className="space-y-4">
              <h2 className="text-xs font-mono text-primary/40 uppercase tracking-[0.4em] flex items-center gap-2">
                <UserIcon className="w-3 h-3" /> {leet("ENTITIES_FOUND")}
              </h2>
              {results.users.length === 0 ? (
                <p className="text-[10px] font-mono text-muted-foreground italic">{leet("NO_MATCHING_USERS")}</p>
              ) : (
                results.users.map((user: any) => (
                  <Link key={user.id} href={`/user/${user.id}`}>
                    <Card className="p-3 bg-black/40 border-primary/10 hover:border-primary/40 transition-all cursor-pointer flex items-center gap-3">
                      <div className="w-8 h-8 rounded border border-primary/20 overflow-hidden bg-primary/5">
                        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover opacity-80" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-mono text-primary font-bold tracking-widest">{user.username}</div>
                        <div className="text-[9px] text-muted-foreground uppercase">{user.role}</div>
                      </div>
                    </Card>
                  </Link>
                ))
              )}
            </div>

            {/* БЛОК ТРЕДОВ */}
            <div className="space-y-4">
              <h2 className="text-xs font-mono text-primary/40 uppercase tracking-[0.4em] flex items-center gap-2">
                <Hash className="w-3 h-3" /> {leet("THREADS_INDEXED")}
              </h2>
              {results.threads.length === 0 ? (
                <p className="text-[10px] font-mono text-muted-foreground italic">{leet("NO_MATCHING_THREADS")}</p>
              ) : (
                results.threads.map((thread: any) => (
                  <Link key={thread.id} href={`/thread/${thread.id}`}>
                    <Card className="p-4 bg-black/40 border-primary/10 hover:border-primary/40 transition-all cursor-pointer group">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono text-primary/90 group-hover:text-primary transition-colors">
                          {thread.title}
                        </span>
                        <Terminal className="w-4 h-4 text-primary/20 group-hover:text-primary/50" />
                      </div>
                    </Card>
                  </Link>
                ))
              )}
            </div>

          </div>
        )}
      </div>
    </Layout>
  );
}
