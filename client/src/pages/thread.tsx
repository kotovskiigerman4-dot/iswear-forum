import { useState, useRef } from "react";
import { useThread, useCreatePost, useDeletePost, useDeleteThread } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Textarea, RoleBadge } from "@/components/ui/cyber-components";
import { Layout } from "@/components/layout";
import { Link, useParams, useLocation } from "wouter";
import { leet } from "@/lib/leet";
import { format } from "date-fns";
import { Trash2, Reply, Paperclip, FileText, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ThreadView() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { data: thread, isLoading } = useThread(Number(id));
  const { user } = useAuth();
  
  const createPost = useCreatePost();
  const deletePost = useDeletePost();
  const deleteThread = useDeleteThread();

  const updatePost = useMutation({
    mutationFn: async ({ postId, content }: { postId: number; content: string }) => {
      await apiRequest("PATCH", `/api/posts/${postId}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/threads/${id}`] });
    },
  });
  
  const [content, setContent] = useState("");
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
        fileUrl: fileUrl || undefined 
      },
      { 
        onSuccess: () => {
          setContent("");
          setFileUrl(null);
        } 
      }
    );
  };

  const canDelete = (authorId: number) => {
    if (!user) return false;
    if (user.role === "ADMIN" || user.role === "MODERATOR") return true;
    return user.id === authorId;
  };

  const handleDeleteThread = async () => {
    if (confirm(leet("PURGE_ENTIRE_THREAD?"))) {
      deleteThread.mutate(Number(id), {
        onSuccess: () => setLocation("/")
      });
    }
  };

  if (isLoading) return <Layout><div className="animate-pulse h-64 bg-card" /></Layout>;
  if (!thread) return <Layout><div className="text-center text-destructive p-8">{leet("DATABANK_CORRUPTED")}</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
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
          
          {(user?.role === "ADMIN" || user?.role === "MODERATOR") && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDeleteThread}
              className="font-display text-[10px]"
            >
              [PURGE_THREAD]
            </Button>
          )}
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          {thread.posts?.map((post, index) => (
            <div key={post.id} className="flex flex-col md:flex-row gap-4">
              {/* Author Sidebar */}
              <Card className="w-full md:w-48 p-4 shrink-0 flex flex-col items-center text-center bg-card/50 border-primary/10">
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

              {/* Post Content Area */}
              <Card className="flex-1 flex flex-col min-h-[150px] relative">
                <div className="p-3 border-b border-border/50 text-xs text-muted-foreground flex justify-between bg-card/30">
                  <span>{format(new Date(post.createdAt), 'PP pp')}</span>
                  <div className="flex gap-4 items-center">
                    
                    {/* Кнопка EDIT (автор или админ) */}
                    {(user?.id === post.authorId || user?.role === "ADMIN") && (
                      <button
                        onClick={() => {
                          const newContent = prompt(leet("EDIT_POST_CONTENT"), post.content);
                          if (newContent && newContent !== post.content) {
                            updatePost.mutate({ postId: post.id, content: newContent });
                          }
                        }}
                        className="text-primary hover:text-white transition-colors text-[10px]"
                      >
                        [{leet("EDIT")}]
                      </button>
                    )}

                    {/* Кнопка DELETE (кроме первого поста) */}
                    {canDelete(post.authorId) && index !== 0 && (
                      <button 
                        onClick={() => {
                          if(confirm(leet("PURGE_DATA_SEGMENT?"))) {
                            deletePost.mutate({ id: post.id, threadId: thread.id });
                          }
                        }}
                        className="text-destructive hover:text-red-400 transition-colors flex items-center gap-1 text-[10px]"
                        disabled={deletePost.isPending}
                      >
                        <Trash2 className="w-3 h-3" /> {leet("DELETE")}
                      </button>
                    )}
                    <span className="opacity-30 text-[10px]">#{post.id}</span>
                  </div>
                </div>
                
                <div className="p-4 text-foreground whitespace-pre-wrap flex-1">
                  {post.content}
                  
                  {/* Attachment Preview */}
                  {post.fileUrl && (
                    <div className="mt-4 p-2 border border-primary/20 bg-primary/5 rounded-sm max-w-fit">
                      {post.fileUrl.endsWith('.png') ? (
                        <a href={post.fileUrl} target="_blank" rel="noreferrer" className="block">
                          <img 
                            src={post.fileUrl} 
                            alt="attachment" 
                            className="max-w-md max-h-96 object-contain border border-primary/30 hover:border-primary transition-all cursor-zoom-in" 
                          />
                        </a>
                      ) : (
                        <a 
                          href={post.fileUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline p-2"
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

        {/* Reply Form Section */}
        {user ? (
          <Card className="p-4 border-primary/30 mt-8 relative overflow-hidden bg-card/40">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary animate-pulse" />
            <h3 className="text-lg text-primary flex items-center gap-2 mb-4 ml-2 font-display">
              <Reply className="w-5 h-5" /> {leet("TRANSM
