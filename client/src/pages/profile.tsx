// @ts-nocheck
import { useState, useEffect } from "react";
import { useProfile } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Input, Textarea, RoleBadge } from "@/components/ui/cyber-components";
import { Layout } from "@/components/layout";
import { useParams, Link } from "wouter";
import { leet } from "@/lib/leet";
import { format } from "date-fns";
import { Settings2, Terminal, MessageSquare, FileText, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; 
import { apiRequest } from "@/lib/queryClient";

export default function Profile() {
  const { id } = useParams();
  const userId = parseInt(id || "0");
  const queryClient = useQueryClient();
  
  const { data: profile, isLoading, error } = useProfile(userId);
  const { user: currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState("wall"); 
  const [commentText, setCommentText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [icq, setIcq] = useState("");

  const { data: userThreads = [] } = useQuery({
    queryKey: [`/api/users/${userId}/threads`],
    enabled: !!userId
  });

  const { data: comments = [] } = useQuery({
    queryKey: [`/api/profile/${userId}/comments`],
    enabled: !!userId
  });

  const isOwner = currentUser?.id === userId;

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatarUrl || profile.avatar_url || "");
      setBannerUrl(profile.bannerUrl || profile.banner_url || "");
      setIcq(profile.icq || "");
    }
  }, [profile]);

  // --- ФУНКЦИИ ОБНОВЛЕНИЯ ---
  const updateProfile = useMutation({
    mutationFn: async (data: any) => {
      // Отправляем данные на правильный эндпоинт /api/users/:id
      const res = await apiRequest("PATCH", `/api/users/${userId}`, { data });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${userId}`] });
      setIsEditing(false);
    }
  });

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({ 
      bio, 
      avatarUrl, 
      avatar_url: avatarUrl,
      bannerUrl, 
      banner_url: bannerUrl,
      icq 
    });
  };

  const postCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/profile/${userId}/comments`, { content });
      return res.json();
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${userId}/comments`] });
    }
  });

  // --- РЕНДЕР СТАТУСА ОНЛАЙН ---
  const renderStatus = (lastSeenValue: string | Date | null) => {
    if (!lastSeenValue) return <span className="text-muted-foreground italic tracking-widest text-[10px]">SIGNAL_LOST</span>;
    const lastSeen = new Date(lastSeenValue);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / 1000 / 60);

    if (diffInMinutes < 5) {
      return (
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-primary font-bold tracking-widest text-[10px] animate-pulse">{leet("ONLINE")}</span>
        </div>
      );
    }
    return <span className="text-muted-foreground text-[10px]">{diffInMinutes < 60 ? `${diffInMinutes}M AGO` : format(lastSeen, 'HH:mm dd.MM')}</span>;
  };

  if (isLoading) return <Layout><div className="animate-pulse h-64 bg-card" /></Layout>;
  if (error || !profile) return (
    <Layout>
      <div className="max-w-2xl mx-auto mt-20 p-8 border border-destructive/50 bg-destructive/5 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-display text-destructive">{leet("USER_NOT_FOUND")}</h2>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="pb-20">
        <div className="relative h-48 md:h-64 w-full bg-secondary border-b border-border overflow-hidden">
          {(bannerUrl || profile?.banner_url) ? (
            <img src={bannerUrl || profile?.banner_url} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,255,159,0.05)_10px,rgba(0,255,159,0.05)_20px)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
          {isOwner && (
            <Button size="sm" variant="outline" className="absolute top-4 right-4 bg-background/80 z-20" onClick={() => setIsEditing(!isEditing)}>
              <Settings2 className="w-4 h-4 mr-2" /> {leet(isEditing ? "EXIT" : "MOD_PROFILE")}
            </Button>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-8 relative -mt-16 md:-mt-20">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            <div className="w-32 h-32 md:w-40 md:h-40 bg-card border-2 border-primary overflow-hidden shadow-[0_0_25px_rgba(0,255,159,0.3)] ring-8 ring-background">
              {(avatarUrl || profile?.avatar_url) ? (
                <img src={avatarUrl || profile?.avatar_url} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary font-mono text-muted-foreground uppercase">No_Img</div>
              )}
            </div>
            <div className="pb-2 flex-1">
              <h1 className="text-4xl md:text-5xl text-primary font-display tracking-tighter">{profile?.username}</h1>
              <div className="mt-2 flex items-center gap-4">
                <RoleBadge role={profile?.role} />
                <div className="border-l border-primary/20 pl-4 py-1">
                  {renderStatus(profile?.lastSeen)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-8 pt-10 flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-6">
            {isEditing ? (
              <Card className="p-6 border-primary/30 bg-card/40">
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="Avatar URL" className="bg-black/40 border-primary/20" />
                    <Input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} placeholder="Banner URL" className="bg-black/40 border-primary/20" />
                  </div>
                  <Input value={icq} onChange={e => setIcq(e.target.value)} placeholder="ICQ / UIN" className="bg-black/40 border-primary/20" />
                  <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} className="bg-black/40 font-mono border-primary/20" />
                  <div className="flex gap-3">
                    <Button type="submit" className="flex-1" disabled={updateProfile.isPending}>
                      {updateProfile.isPending ? "SYNCING..." : leet("SAVE_CHANGES")}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>{leet("CANCEL")}</Button>
                  </div>
                </form>
              </Card>
            ) : (
              <div>
                <div className="flex bg-black/40 border border-primary/20 mb-6">
                  <button onClick={() => setActiveTab("wall")} className={`px-6 py-3 text-[10px] uppercase font-bold tracking-widest ${activeTab === 'wall' ? 'bg-primary/20 text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
                    {leet("SIGNAL_WALL")}
                  </button>
                  <button onClick={() => setActiveTab("threads")} className={`px-6 py-3 text-[10px] uppercase font-bold tracking-widest ${activeTab === 'threads' ? 'bg-primary/20 text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
                    {leet("TRANSMISSIONS")}
                  </button>
                </div>

                {activeTab === "wall" ? (
                  <div className="space-y-6">
                    <Card className="p-6 bg-card/20 border-primary/10">
                      <h3 className="text-primary text-[10px] uppercase mb-4 tracking-widest font-bold border-b border-primary/20 pb-2">{leet("USER_INTEL")}</h3>
                      <div className="whitespace-pre-wrap text-foreground/90 font-mono text-sm">{profile?.bio || leet("NO_DATA")}</div>
                      {profile?.icq && <div className="mt-4 text-[10px] font-mono text-primary/50 uppercase">Network_ID: {profile.icq}</div>}
                    </Card>

                    <div className="border border-primary/20 bg-black/40 p-6">
                      <h3 className="text-primary font-display mb-4 text-sm uppercase flex items-center gap-2"><Terminal className="w-4 h-4" /> {leet("FEED")}</h3>
                      {currentUser && (
                        <div className="mb-6 space-y-2">
                          <Textarea placeholder={leet("ENTER_MESSAGE")} className="bg-black/60 border-primary/30 text-xs font-mono" value={commentText} onChange={e => setCommentText(e.target.value)} />
                          <Button variant="outline" size="sm" onClick={() => postCommentMutation.mutate(commentText)} className="w-full" disabled={postCommentMutation.isPending}>{leet("SEND")}</Button>
                        </div>
                      )}
                      <div className="space-y-4">
                        {comments.map(c => (
                          <div key={c.id} className="border-l-2 border-primary/20 pl-4 py-2 bg-primary/5">
                            <div className="flex items-center gap-2 mb-1">
                              <Link href={`/user/${c.author?.id}`}><span className="text-primary font-bold text-[10px] cursor-pointer">{c.author?.username}</span></Link>
                              {c.author?.role && <RoleBadge role={c.author.role} />}
                              <span className="text-[8px] text-muted-foreground ml-auto">{c.createdAt ? format(new Date(c.createdAt), 'HH:mm dd.MM') : '--:--'}</span>
                            </div>
                            <p className="text-xs font-mono text-primary/80">{c.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userThreads.map(t => (
                      <Link key={t.id} href={`/thread/${t.id}`}>
                        <Card className="p-4 bg-primary/5 border-primary/10 hover:border-primary/40 cursor-pointer transition-all">
                          <h4 className="text-primary font-bold text-sm truncate">{t.title}</h4>
                          <p className="text-[8px] text-muted-foreground mt-1 uppercase font-mono">{t.createdAt ? format(new Date(t.createdAt), 'dd.MM.yyyy') : '??.??.????'}</p>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="w-full md:w-64 space-y-4">
            <Card className="p-4 border-primary/10 bg-card/10 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">{leet("VISUAL_SCAN")}</p>
              <p className="font-mono text-primary text-xl">{profile?.views || 0}</p>
            </Card>
            <Card className="p-4 border-primary/10 bg-card/10 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">{leet("INIT_DATE")}</p>
              <p className="font-mono text-primary text-sm">{profile?.createdAt ? format(new Date(profile.createdAt), 'dd.MM.yyyy') : "??.??"}</p>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
