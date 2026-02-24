import { useState, useRef } from "react"; // Добавили useRef
import { useThread, useCreatePost, useDeletePost, useDeleteThread } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Textarea, RoleBadge } from "@/components/ui/cyber-components";
import { Layout } from "@/components/layout";
import { Link, useParams, useLocation } from "wouter";
import { leet } from "@/lib/leet";
import { format } from "date-fns";
import { Trash2, Reply, Paperclip, FileText, X } from "lucide-react"; // Новые иконки
import { api } from "@shared/routes";

export default function ThreadView() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { data: thread, isLoading } = useThread(Number(id));
  const { user } = useAuth();
  
  const createPost = useCreatePost();
  const deletePost = useDeletePost();
  const deleteThread = useDeleteThread();
  
  const [content, setContent] = useState("");
  // Состояния для файла
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setFileUrl(data.url);
    } catch (err) {
      alert("Error uploading file: Only .png and .txt allowed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) return;
    
    createPost.mutate(
      { 
        content, 
        threadId: Number(id),
        fileUrl: fileUrl || undefined // Передаем ссылку на файл
      },
      { 
        onSuccess: () => {
          setContent("");
          setFileUrl(null); // Очищаем файл после отправки
        } 
      }
    );
  };

  const canDelete = (authorId: number) => {
    if (!user) return false;
    if (user.role === "ADMIN" || user.role === "MODERATOR") return true;
    return user.id === authorId;
  };

  if (isLoading) return <Layout><div className="animate-pulse h-64 bg-card" /></Layout>;
  if (!thread) return <Layout><div className="text-center text-destructive p-8">{leet("DATABANK_CORRUPTED")}</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header - без изменений */}
        <div className="border-b border-border pb-4 flex justify-between items-start">
          <div>
            <Link href={`/category/${thread.categoryId}`} className="text-xs text-primary hover:underline mb-2 block">
              &lt; {leet("RETURN_TO_DIRECTORY")}
            </Link>
            <h1 className="text-2xl text-primary font-display break-words">{thread.title}</h1>
            <p className="text-xs text-muted-foreground mt-2">
              {format(new Date(thread.createdAt), 'PP pp')}
            </p>
          </div>
          {canDelete(thread.authorId) && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => {
                if(confirm("Purge databank entirely?")) {
                  deleteThread.mutate({ id: thread.id, categoryId: thread.categoryId }, {
                    onSuccess: () => setLocation(`/category/${thread.categoryId}`)
                  });
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" /> {leet("PURGE_THREAD")}
            </Button>
          )}
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {thread.posts?.map((post) => (
            <div key={post.id} className="flex flex-col md:flex-row gap-4">
              <Card className="w-full md:w-48 p-4 shrink-0 flex flex-col items-center text-center bg-card/50">
                <div className="w-16 h-16 bg-secondary border border-border mb-3 flex items-center justify-center overflow-hidden">
                  {post.author.avatarUrl ? (
                    <img src={post.author.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl text-muted-foreground font-display">{post.author.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <Link href={`/user/${post.authorId}`} className="text-primary hover:underline font-bold mb-1 break-all">
                  {post.author.username}
                </Link>
                <RoleBadge role={post.author.role} />
              </Card>

              <Card className="flex-1 flex flex-col min-h-[150px]">
                <div className="p-3 border-b border-border/50 text-xs text-muted-foreground flex justify-between bg-card/30">
                  <span>{format(new Date(post.createdAt), 'PP pp')}</span>
                  {canDelete(post.authorId) && (
                    <button 
                      onClick={() => deletePost.mutate({ id: post.id, threadId: thread.id })}
                      className="text-destructive hover:underline"
                    >
                      {leet("DELETE")}
                    </button>
                  )}
                </div>
                <div className="p-4 text-foreground whitespace-pre-wrap flex-1">
                  {post.content}
                  
                  {/* ОТОБРАЖЕНИЕ ПРИКРЕПЛЕННОГО ФАЙЛА */}
                  {post.fileUrl && (
                    <div className="mt-4 p-2 border border-primary/20 bg-primary/5 rounded">
                      {post.fileUrl.endsWith('.png') ? (
                        <a href={post.fileUrl} target="_blank" rel="noreferrer">
                          <img 
                            src={post.fileUrl} 
                            alt="attachment" 
                            className="max-w-md max-h-96 object-contain border border-primary/30 hover:border-primary transition-colors" 
                          />
                        </a>
                      ) : (
                        <a 
                          href={post.fileUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <FileText className="w-5 h-5" />
                          <span>{leet("VIEW_ATTACHED_DATA")} (.txt)</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* Reply Form */}
        {user ? (
          <Card className="p-4 border-primary/30 mt-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <h3 className="text-lg text-primary flex items-center gap-2 mb-4 ml-2">
              <Reply className="w-5 h-5" /> {leet("TRANSMIT_REPLY")}
            </h3>
            <form onSubmit={handleReply} className="space-y-4 ml-2">
              <Textarea 
                value={content} 
                onChange={e => setContent(e.target.value)} 
                required 
                placeholder="Compose message block..." 
                rows={4} 
              />
              
              {/* ПАНЕЛЬ ФАЙЛА */}
              <div className="flex items-center gap-4">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".png,.txt" 
                  className="hidden" 
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  {isUploading ? leet("UPLOADING...") : leet("ATTACH_FILE")}
                </Button>

                {fileUrl && (
                  <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                    <span>{fileUrl.split('/').pop()}</span>
                    <button type="button" onClick={() => setFileUrl(null)}>
                      <X className="w-3 h-3 hover:text-destructive" />
                    </button>
                  </div>
                )}
              </div>

              <Button type="submit" disabled={createPost.isPending || isUploading}>
                {createPost.isPending ? leet("SENDING...") : leet("SEND_PAYLOAD")}
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="p-6 text-center border-dashed text-muted-foreground mt-8">
            <Link href="/auth" className="text-primary hover:underline">{leet("AUTHENTICATE")}</Link> {leet("TO_TRANSMIT_DATA")}
          </Card>
        )}
      </div>
    </Layout>
  );
}
