// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { useProfile, useUpdateProfile } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Input, Textarea, RoleBadge } from "@/components/ui/cyber-components";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Layout } from "@/components/layout";
import { useParams, Link } from "wouter";
import { leet } from "@/lib/leet";
import { format } from "date-fns";
import { User as UserIcon, Settings2, Shield, AlertCircle, Terminal, MessageSquare, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; 
import { apiRequest } from "@/lib/queryClient";

export default function Profile() {
  const { id } = useParams();
  const userId = parseInt(id || "0");
  const queryClient = useQueryClient();
  
  const { data: profile, isLoading, error } = useProfile(userId);
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  
  const [commentText, setCommentText] = useState("");

  // Запрос на темы пользователя
  const { data: userThreads = [] } = useQuery({
    queryKey: [`/api/users/${userId}/threads`],
    enabled: !!userId
  });

  // Запрос на комментарии
  const { data: comments = [] } = useQuery({
    queryKey: [`/api/profile/${userId}/comments`],
    enabled: !!userId
  });

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

  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [icq, setIcq] = useState("");

  const isOwner = user?.id === userId;

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatarUrl || profile.avatar_url || "");
      setBannerUrl(profile.bannerUrl || profile.banner_url || "");
      setIcq(profile.icq || "");
    }
  }, [profile]);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    // Отправляем данные в обоих форматах (camel и snake), чтобы база точно поняла
    updateProfile.mutate(
      { 
        id: userId, 
        data: { 
          bio, 
          avatarUrl, 
          avatar_url: avatarUrl,
          bannerUrl, 
          banner_url: bannerUrl,
          icq 
        } 
      },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  if (isLoading) return <Layout><div className="animate-pulse h-64 bg-card" /></Layout>;
  if (error || !profile) return <Layout><div className="p-20 text-center text-destructive">{leet("ACCESS_DENIED")}</div></Layout>;

  return (
    <Layout>
      <div className="space-y-0 pb-20">
        {/* Banner Section */}
        <div className="relative h-48 md:h-64 w-full bg-secondary border-b border-border overflow-hidden">
          {bannerUrl ? (
            <img src={bannerUrl} alt="banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,255,159,0.05)_10px,rgba(0,255,159,0.05)_20px)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          {isOwner && (
            <Button size="sm" variant="outline" className="absolute top-4 right-4 bg-background/80" onClick={() => setIsEditing(!isEditing)}>
              <Settings2 className="w-4 h-4 mr-2" /> {leet(isEditing ? "EXIT" : "MOD_PROFILE")}
            </Button>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-8 relative -mt-16 md:-mt-20">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            <div className="w-32 h-32 md:w-40 md:h-40 bg-card border-2 border-primary overflow-hidden shadow-[0_0_25px_rgba(0,255,159,0.3)] ring-8 ring-background">
              {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-secondary font-mono text-muted-foreground">NO_IMG</div>}
            </div>
            <div className="pb-2">
              <h1 className="text-4xl text-primary font-display tracking-tighter drop-shadow-[0_0_10px_rgba(0,255,159,0.5)]">{profile.username}</h1>
              <div className="mt-2 flex items-center gap-4"><RoleBadge role={profile.role} /></div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-8 pt-10 flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-6">
            {isEditing ? (
              <Card className="p-6 border-primary/30 bg-card/40">
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] text-primary uppercase font-bold">Avatar URL</label><Input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} className="bg-black/40" /></div>
                    <div className="space-y-1"><label className="text-[10px] text-primary uppercase font-bold">Banner URL</label><Input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} className="bg-black/40" /></div>
                  </div>
                  <div className="space-y-1"><label className="text-[10px] text-primary uppercase font-bold">ICQ / Network ID</label><Input value={icq} onChange={e => setIcq(e.target.value)} className="bg-black/40" /></div>
                  <div className="space-y-1"><label className="text-[10px] text-primary uppercase font-bold">Bio</label><Textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} className="bg-black/40" /></div>
                  <div className="flex gap-2"><Button type="submit" className="flex-1">{leet("SAVE")}</Button><Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>{leet("CANCEL")}</Button></div>
                </form>
              </Card>
            ) : (
              <Tabs defaultValue="wall" className="w-full">
                <TabsList className="bg-black/40 border border-primary/20 p-0 h-auto rounded-none mb-6">
                  <TabsTrigger value="wall" className="rounded-none border-r border-primary/10 data-[state=active]:bg-primary/10 py-2 px-6 text-[10px] uppercase font-bold">
                    <MessageSquare className="w-3 h-3 mr-2" /> {leet("SIGNAL_WALL")}
                  </TabsTrigger>
                  <TabsTrigger value="threads" className="rounded-none border-r border-primary/10 data-[state=active]:bg-primary/10 py-2 px-6 text-[10px] uppercase font-bold">
                    <FileText className="w-3 h-3 mr-2" /> {leet("CREATED_THREADS")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="wall" className="space-y-6">
                  <Card className="p-6 bg-card/20 border-primary/10 relative overflow-hidden">
                    <h3 className="text-primary text-[10px] uppercase mb-4 tracking-widest font-bold border-b border-primary/20 pb-2">{leet("USER_INTEL")}</h3>
                    <div className="whitespace-pre-wrap text-foreground/90 font-mono text-sm">{profile.bio || leet("NO_DATA")}</div>
                    {profile.icq && <div className="mt-4 text-[10px] text-primary/60 font-mono uppercase">ICQ: {profile.icq}</div>}
                  </Card>

                  <div className="border border-primary/20 bg-black/40 p-6">
                    <h3 className="text-primary font-display mb-4 text-sm uppercase flex items-center gap-2"><Terminal className="w-4 h-4" /> {leet("DATA_FEED")}</h3>
                    {user && (
                      <div className="mb-6 space-y-2">
                        <Textarea placeholder={leet("ENTER_MESSAGE")} className="bg-black/60 border-primary/30 text-xs font-mono" value={commentText} onChange={e => setCommentText(e.target.value)} />
                        <Button variant="outline" size="sm" onClick={handlePostComment} className="w-full" disabled={postCommentMutation.isPending}>{leet("SEND")}</Button>
                      </div>
                    )}
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {comments.map(c => (
                        <div key={c.id} className="border-l-2 border-primary/20 pl-4 py-2 bg-primary/5">
                          <div className="flex items-center gap-2 mb-1">
                            <Link href={`/user/${c.author.id}`}><span className="text-primary font-bold text-[10px] cursor-pointer">{c.author.username}</span></Link>
                            {c.author.role && <RoleBadge role={c.author.role} />}
                            <span className="text-[8px] text-muted-foreground">{format(new Date(c.createdAt), 'HH:mm dd.MM')}</span>
                          </div>
                          <p className="text-xs font-mono text-primary/80">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="threads" className="space-y-4">
                  {userThreads.length === 0 ? (
                    <div className="p-10 text-center border border-dashed border-primary/20 text-muted-foreground text-xs uppercase">{leet("NO_THREADS_FOUND")}</div>
                  ) : (
                    userThreads.map(t => (
                      <Link key={t.id} href={`/thread/${t.id}`}>
                        <Card className="p-4 bg-primary/5 border-primary/10 hover:border-primary/40 cursor-pointer transition-all">
                          <h4 className="text-primary font-bold text-sm truncate">{t.title}</h4>
                          <p className="text-[10px] text-muted-foreground mt-1 uppercase">{format(new Date(t.createdAt), 'dd.MM.yyyy')}</p>
                        </Card>
                      </Link>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
          
          {/* Sidebar Stats */}
          <div className="w-full md:w-64 space-y-4">
            <Card className="p-4 border-primary/10 bg-card/10">
              <p className="text-[10px] text-muted-foreground uppercase">{leet("INIT_DATE")}</p>
              <p className="font-mono text-primary">{profile.createdAt ? format(new Date(profile.createdAt), 'dd.MM.yyyy') : "??.??"}</p>
            </Card>
            <Card className="p-4 border-primary/10 bg-card/10">
              <p className="text-[10px] text-muted-foreground uppercase">{leet("VISUAL_SCAN")}</p>
              <p className="font-mono text-primary">{profile.views || 0}</p>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
