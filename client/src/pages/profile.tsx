// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { useProfile, useUpdateProfile } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Input, Textarea, RoleBadge } from "@/components/ui/cyber-components";
import { Layout } from "@/components/layout";
import { useParams, Link } from "wouter"; // Добавили Link
import { leet } from "@/lib/leet";
import { format } from "date-fns";
import { User as UserIcon, Settings2, Shield, AlertCircle, Upload, Terminal, Eye, MessageSquare, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query"; // Добавили для загрузки тем

export default function Profile() {
  const { id } = useParams();
  const userId = parseInt(id || "0");
  
  const { data: profile, isLoading, error } = useProfile(userId);
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  
  // Запрос на темы пользователя
  const { data: userThreads } = useQuery({
    queryKey: [`/api/users/${userId}/threads`],
    enabled: !!userId
  });

  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [icq, setIcq] = useState("");
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const isOwner = user?.id === userId;

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatarUrl || "");
      setBannerUrl(profile.bannerUrl || "");
      setIcq(profile.icq || "");
    }
  }, [profile]);

  // Функция для рендера статуса Online
  const renderStatus = (lastSeenValue: string | Date | null) => {
    if (!lastSeenValue) return <span className="text-muted-foreground italic">SIGNAL_LOST</span>;
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
          <span className="text-primary font-bold tracking-widest animate-pulse">{leet("ONLINE")}</span>
        </div>
      );
    }
    return <span className="text-muted-foreground">{diffInMinutes < 60 ? `${diffInMinutes}M AGO` : format(lastSeen, 'HH:mm dd.MM')}</span>;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (type === 'avatar') setAvatarUrl(data.url);
      if (type === 'banner') setBannerUrl(data.url);
    } catch (err) {
      setUpdateError("System Error: File rejection.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);
    updateProfile.mutate(
      { id: userId, data: { bio, avatarUrl, bannerUrl, icq } },
      {
        onSuccess: () => setIsEditing(false),
        onError: (err: any) => setUpdateError(err.message || "Sync failed")
      }
    );
  };

  if (isLoading) return <Layout><div className="animate-pulse h-64 bg-card" /></Layout>;
  
  if (error || !profile) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto mt-20 p-8 border border-destructive/50 bg-destructive/5 rounded-none relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-destructive animate-pulse" />
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-2xl font-display text-destructive mb-2">{leet("ACCESS_DENIED_OR_CORRUPTED")}</h2>
          <p className="text-muted-foreground font-mono text-sm mb-6">
            TERMINAL_ID: {id} <br />
            STATUS: {error ? "REMOTE_REJECTION" : "NODE_NOT_FOUND"}
          </p>
          <Button className="mt-6" variant="outline" onClick={() => window.location.reload()}>
            {leet("RETRY_CONNECTION")}
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-0">
        <div className="relative">
          <div className="h-48 md:h-64 w-full bg-secondary border-b border-border relative overflow-hidden">
            {bannerUrl ? (
              <img src={bannerUrl} alt="banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,255,159,0.05)_10px,rgba(0,255,159,0.05)_20px)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            
            {isOwner && (
              <Button 
                size="sm" 
                variant="outline" 
                className="absolute top-4 right-4 bg-background/80 backdrop-blur-md border-primary/50 hover:border-primary transition-all z-20"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Settings2 className="w-4 h-4 mr-2" />
                {leet(isEditing ? "DISCONNECT" : "MOD_PROFILE")}
              </Button>
            )}
          </div>

          <div className="max-w-7xl mx-auto px-8 relative">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-16 md:-mt-20">
              <div className="relative group">
                <div className="w-32 h-32 md:w-40 md:h-40 bg-card border-2 border-primary overflow-hidden z-10 shadow-[0_0_25px_rgba(0,255,159,0.3)] ring-8 ring-background">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary">
                      <UserIcon className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              <div className="pb-2 flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl md:text-5xl text-primary font-display tracking-tighter drop-shadow-[0_0_10px_rgba(0,255,159,0.5)]">
                    {profile.username}
                  </h1>
                  {profile.role === "ADMIN" && <Shield className="w-6 h-6 text-accent animate-pulse" />}
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <RoleBadge role={profile.role} />
                  <div className="text-[10px] font-mono border-l border-primary/20 pl-4 py-1">
                    {renderStatus(profile.lastSeen)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-8 pt-10 pb-20 flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-6">
            {isEditing ? (
              <Card className="p-6 border-primary/30 bg-card/40 backdrop-blur-sm">
                <h3 className="text-primary font-display mb-4 flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> {leet("EDIT_MODE_ACTIVE")}
                </h3>
                {updateError && (
                  <div className="mb-4 p-3 border border-destructive bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {updateError}
                  </div>
                )}
                
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-primary/70 uppercase font-bold tracking-widest">{leet("AVATAR_LINK")}</label>
                      <div className="flex gap-2">
                        <Input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." className="bg-black/20" />
                        <input type="file" ref={avatarInputRef} className="hidden" accept=".png,.jpg,.jpeg" onChange={(e) => handleFileUpload(e, 'avatar')} />
                        <Button type="button" size="icon" variant="outline" onClick={() => avatarInputRef.current?.click()} disabled={isUploading}>
                          <Upload className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-primary/70 uppercase font-bold tracking-widest">{leet("BANNER_LINK")}</label>
                      <div className="flex gap-2">
                        <Input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} placeholder="https://..." className="bg-black/20" />
                        <input type="file" ref={bannerInputRef} className="hidden" accept=".png,.jpg,.jpeg" onChange={(e) => handleFileUpload(e, 'banner')} />
                        <Button type="button" size="icon" variant="outline" onClick={() => bannerInputRef.current?.click()} disabled={isUploading}>
                          <Upload className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-primary/70 uppercase font-bold tracking-widest">NETWORK_ID (ICQ)</label>
                    <Input value={icq} onChange={e => setIcq(e.target.value)} placeholder="UIN..." className="bg-black/20" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-primary/70 uppercase font-bold tracking-widest">{leet("BIO_DATA")}</label>
                    <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} className="bg-black/20 font-mono text-sm" />
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit" className="flex-1 bg-primary/20 hover:bg-primary/40 border-primary" disabled={updateProfile.isPending || isUploading}>
                      {updateProfile.isPending ? leet("UPLOADING...") : leet("SAVE_CHANGES")}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                      {leet("CANCEL")}
                    </Button>
                  </div>
                </form>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card className="p-6 bg-card/20 border-primary/10 relative group overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/50" />
                  <Terminal className="absolute top-4 right-4 w-4 h-4 text-primary/20 group-hover:text-primary/50 transition-colors" />
                  <h3 className="text-primary text-[10px] uppercase mb-4 tracking-[0.3em] font-bold border-b border-primary/20 pb-2">
                    {leet("USER_INTEL")}
                  </h3>
                  <div className="whitespace-pre-wrap text-foreground/90 font-mono text-sm leading-relaxed min-h-[100px]">
                    {profile.bio || <span className="text-muted-foreground/30 italic">{leet("NO_ENCRYPTED_DATA_FOUND")}</span>}
                  </div>
                </Card>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="p-4 border-primary/10 bg-card/10 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{leet("INIT_DATE")}</p>
                    </div>
                    <p className="font-mono text-primary text-lg">
                      {profile.createdAt ? format(new Date(profile.createdAt), 'dd.MM.yyyy') : "??.??"}
                    </p>
                  </Card>
                  <Card className="p-4 border-primary/10 bg-card/10 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <Eye className="w-3 h-3 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{leet("VISUAL_SCAN")}</p>
                    </div>
                    <p className="font-mono text-primary text-lg">{profile.views || 0}</p>
                  </Card>
                  <Card className="p-4 border-primary/10 bg-card/10 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <Terminal className="w-3 h-3 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Network ID</p>
                    </div>
                    <p className="font-mono text-primary text-lg">{profile.icq ? `UIN:${profile.icq}` : "NO_SIGNAL"}</p>
                  </Card>
                </div>

                {/* --- СЕКЦИЯ ТЕМ ПОЛЬЗОВАТЕЛЯ --- */}
                <div className="space-y-4">
                  <h3 className="text-primary font-display uppercase tracking-widest text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> {leet("TRANSMISSIONS_HISTORY")}
                  </h3>
                  <div className="grid gap-2">
                    {userThreads?.length === 0 ? (
                      <p className="text-muted-foreground font-mono text-xs italic p-4 border border-dashed border-primary/10">NO_DATA_LOGGED</p>
                    ) : (
                      userThreads?.map((thread: any) => (
                        <Link key={thread.id} href={`/thread/${thread.id}`}>
                          <div className="p-4 border border-primary/5 bg-primary/5 hover:bg-primary/10 hover:border-primary/20 cursor-pointer transition-all group flex justify-between items-center">
                            <span className="text-sm font-mono group-hover:text-primary transition-colors truncate mr-4">
                              {thread.title}
                            </span>
                            <span className="text-[10px] opacity-40 font-mono shrink-0">
                              {format(new Date(thread.createdAt), 'dd.MM.yy')}
                            </span>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="w-full md:w-64 space-y-4">
            {profile.isBanned && (
              <Card className="p-6 border-destructive bg-destructive/10 text-center shadow-[0_0_20px_rgba(255,0,0,0.2)]">
                <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h3 className="text-destructive font-black text-xl uppercase">{leet("BANNED")}</h3>
                <p className="text-[8px] text-destructive/60 mt-2 font-mono uppercase leading-tight">
                  Credentials nullified by system protocol.
                </p>
              </Card>
            )}
            {profile.role === "ADMIN" && (
              <Card className="p-6 border-accent/50 bg-accent/5 text-center">
                <Shield className="w-12 h-12 text-accent mx-auto mb-4 animate-pulse" />
                <h3 className="text-accent font-black text-xl uppercase">OVERSEER</h3>
                <p className="text-[8px] text-accent/60 mt-2 font-mono uppercase">Master access granted.</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
