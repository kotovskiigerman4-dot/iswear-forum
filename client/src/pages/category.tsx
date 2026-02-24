import { useState } from "react";
import { useCategory, useCreateThread } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Input, Textarea, Badge } from "@/components/ui/cyber-components";
import { Layout } from "@/components/layout";
import { Link, useParams } from "wouter";
import { leet } from "@/lib/leet";
import { AlertCircle, PlusSquare, MessageSquare } from "lucide-react";
import { format } from "date-fns";

export default function CategoryView() {
  const { id } = useParams();
  const { data: category, isLoading } = useCategory(Number(id));
  const { user } = useAuth();
  const createThread = useCreateThread();
  
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    createThread.mutate(
      { title, content, categoryId: Number(id) },
      { onSuccess: () => { setIsCreating(false); setTitle(""); setContent(""); } }
    );
  };

  if (isLoading) return <Layout><div className="animate-pulse h-32 bg-card" /></Layout>;
  if (!category) return <Layout><div className="text-center text-destructive p-8">{leet("CATEGORY_NOT_FOUND")}</div></Layout>;

  const isOpenSource = category.name.toLowerCase() === "open source";

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-end border-b border-border pb-4">
          <div>
            <h1 className="text-3xl text-primary font-display">{leet(category.name)}</h1>
            <p className="text-muted-foreground mt-2">{category.description}</p>
          </div>
          {user && (
            <Button onClick={() => setIsCreating(!isCreating)} className="gap-2">
              <PlusSquare className="w-4 h-4" />
              {leet(isCreating ? "CANCEL_INIT" : "NEW_DATABANK")}
            </Button>
          )}
        </div>

        {isOpenSource && (
          <div className="bg-destructive/10 border border-destructive p-4 flex items-center gap-3 text-destructive animate-pulse">
            <AlertCircle className="w-5 h-5" />
            <span className="font-display font-bold">зачем ты сюда полез</span>
          </div>
        )}

        {isCreating && (
          <Card className="p-6 border-primary shadow-[0_0_15px_rgba(0,255,159,0.1)]">
            <h3 className="text-xl text-primary mb-4">{leet("INITIALIZE_THREAD")}</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase">{leet("TITLE")}</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Subject designation..." />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">{leet("INITIAL_PAYLOAD")}</label>
                <Textarea value={content} onChange={e => setContent(e.target.value)} required placeholder="Enter data block..." rows={5} />
              </div>
              <Button type="submit" disabled={createThread.isPending} className="w-full">
                {createThread.isPending ? leet("TRANSMITTING...") : leet("TRANSMIT")}
              </Button>
            </form>
          </Card>
        )}

        <div className="space-y-3">
          {category.threads?.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-border text-muted-foreground">
              {leet("NO_DATABANKS_FOUND")}
            </div>
          ) : (
            category.threads?.map((thread) => (
              <Link key={thread.id} href={`/thread/${thread.id}`} className="block">
                <Card className="p-4 hover:border-primary/50 transition-colors flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    <MessageSquare className="text-secondary-foreground group-hover:text-primary transition-colors w-5 h-5" />
                    <div>
                      <h4 className="text-lg text-foreground group-hover:text-primary transition-colors">
                        {thread.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Init by <span className="text-accent">{thread.author.username}</span> • {format(new Date(thread.createdAt), 'PP p')}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {thread.replyCount} {leet("REPLIES")}
                  </Badge>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
