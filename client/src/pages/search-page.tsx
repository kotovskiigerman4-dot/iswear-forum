import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter/paths";
import { Layout } from "@/components/layout";
import { leet } from "@/lib/leet";
import { Search as SearchIcon, Terminal, Hash } from "lucide-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";

export default function SearchPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const query = searchParams.get("q") || "";

  const { data: results = [], isLoading } = useQuery({
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
      <div className="space-y-6">
        <div className="flex items-center gap-4 border-b border-primary/20 pb-4">
          <SearchIcon className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tighter text-primary">
              {leet("DATABASE_QUERY")}
            </h1>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.3em]">
              {leet("PARAM")}: <span className="text-primary">{query}</span>
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-primary animate-pulse font-mono text-sm">{leet("INDEXING_FILES...")}</div>
        ) : results.length === 0 ? (
          <div className="text-destructive font-mono text-sm p-4 border border-destructive/20 bg-destructive/5">
            {leet("ERROR: NO_MATCHES_FOUND_IN_LOCAL_CACHE")}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] font-mono text-primary/50 mb-4 italic">
              {leet("FOUND")} {results.length} {leet("ENTRIES")}
            </p>
            {results.map((thread: any) => (
              <Link key={thread.id} href={`/thread/${thread.id}`}>
                <Card className="p-4 bg-black/40 border-primary/10 hover:border-primary/40 hover:translate-x-1 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Hash className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
                      <span className="font-mono text-sm text-primary/90 group-hover:text-primary">
                        {thread.title}
                      </span>
                    </div>
                    <Terminal className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/50" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
