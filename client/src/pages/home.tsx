import { useCategories, useStats } from "@/hooks/use-api";
import { Card, Badge } from "@/components/ui/cyber-components";
import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { leet } from "@/lib/leet";
import { FolderGit2, MessagesSquare, Users, Activity } from "lucide-react";
import { format } from "date-fns";

export default function Home() {
  const { data: categories, isLoading } = useCategories();
  const { data: stats } = useStats();

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <FolderGit2 className="text-primary w-6 h-6" />
            <h1 className="text-2xl text-primary">{leet("DIRECTORY_INDEX")}</h1>
          </div>

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => <Card key={i} className="h-24 bg-card/50" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {categories?.map((cat) => (
                <Link key={cat.id} href={`/category/${cat.id}`} className="block">
                  <Card className="p-4 hover:border-primary transition-colors flex items-center justify-between group">
                    <div>
                      <h3 className="text-lg font-display text-primary group-hover:text-primary/80 transition-colors">
                        {leet(cat.name)}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {cat.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end text-sm">
                      <Badge variant="outline" className="mb-2">
                        {cat.threads?.length || 0} {leet("THREADS")}
                      </Badge>
                      {cat.threads && cat.threads.length > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          Last: {format(new Date(cat.threads[cat.threads.length - 1].createdAt), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Activity className="text-accent w-6 h-6" />
            <h2 className="text-xl text-accent">{leet("SYS_STATS")}</h2>
          </div>
          
          <Card className="p-4 space-y-4 border-accent/30">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" /> {leet("OPERATORS")}
              </span>
              <span className="font-bold text-foreground">{stats?.userCount || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-muted-foreground">
                <MessagesSquare className="w-4 h-4" /> {leet("DATABANKS")}
              </span>
              <span className="font-bold text-foreground">{stats?.threadCount || 0}</span>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
