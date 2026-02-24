import { useState, useEffect, useRef } from "react";
import { useProfile, useUpdateProfile } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Input, Textarea, RoleBadge } from "@/components/ui/cyber-components";
import { Layout } from "@/components/layout";
import { useParams } from "wouter";
import { leet } from "@/lib/leet";
import { format } from "date-fns";
import { User as UserIcon, Settings2, Shield, AlertCircle, Upload, Terminal } from "lucide-react";

export default function Profile() {
  const { id } = useParams();
  const userId = parseInt(id || "0");
  
  // Получаем данные профиля
  const { data: profile, isLoading, error } = useProfile(userId);
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  
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

  // Синхронизация локального состояния с данными из БД
  useEffect(() => {
    if (profile) {
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatarUrl || "");
      setBannerUrl(profile.bannerUrl || "");
      setIcq(profile.icq || "");
    }
  }, [profile]);

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
  
  // ФИКС: Если данных нет или ошибка — показываем расширенную диагностику
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
          <div className="bg-black/50 p-4 rounded border border-white/10">
            <p className="text-[10px] text-primary/50 uppercase mb-2">Diagnostic Log:</p>
            <code className="text-[10px] text-primary break-all">
              {error ? JSON.stringify(error) : "Record missing in Supabase databank."}
            </code>
          </div>
          <Button className="mt-6" variant="outline" onClick={() => window.location.reload()}>
            {leet("RETRY_CONNECTION")}
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Banner */}
        <div className="h-48 w-full bg-secondary border border-border relative overflow-hidden group">
          {bannerUrl ? (
            <img src={bannerUrl} alt="banner" className="w-full h-full object-cover opacity-60" />
          ) : (
            <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,255,159,0.05)_10px,rgba(0,255,159,0.05)_20px)]" />
          )}
          
          <div className="absolute -bottom-12 left-8 flex items-end gap-6">
            <div className="w-24 h-24 bg-card border-2 border-primary overflow-hidden flex items-center justify-center z-10 shadow-[0_0_20px_rgba(0,255,159,0.2)]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
          </div>
          
          {isOwner && (
            <Button 
              size="sm" 
              variant="outline" 
              className="absolute top-4 right-4 bg-background/90 backdrop-blur-md border-primary/50"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Settings2 className="w-4 h-4 mr-2" />
              {leet(isEditing ? "DISCONNECT" : "MOD_PROFILE")}
            </Button>
          )}
        </div>

        <div className="pt-16 px-8 flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl text-primary font-display mb-1">{profile.username}</h1>
                {profile.role === "ADMIN" && <Shield className="w-6 h-6 text-accent animate-pulse" title="System Admin" />}
              </div>
              <RoleBadge role={profile.role} />
            </div>

            {isEditing ? (
              <Card className="p-6 border-primary/30 bg-card/40">
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
                        <input type="file" ref={avatarInputRef} className="hidden" accept=".png" onChange={(e) => handleFileUpload(e, 'avatar')} />
                        <Button type="button" size="icon" variant="outline" onClick={() => avatarInputRef.current?.click()} disabled={isUploading}>
                          <Upload className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-primary/70 uppercase font-bold tracking-widest">{leet("BANNER_LINK")}</label>
                      <div className="flex gap-2">
                        <Input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} placeholder="https://..." className="bg-black/20" />
                        <input type="file" ref={bannerInputRef} className="hidden" accept=".png" onChange={(e) => handleFileUpload(e, 'banner')} />
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

                  <Button type="submit" className="w-full bg-primary/20 hover:bg-primary/40 border-primary" disabled={updateProfile.isPending || isUploading}>
                    {updateProfile.isPending ? leet("UPLOADING...") : leet("SAVE_CHANGES")}
                  </Button>
                </form>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card className="p-6 bg-card/20 border-primary/10 relative group">
                  <Terminal className="absolute top-4 right-4 w-4 h-4 text-primary/20 group-hover:text-primary/50 transition-colors" />
                  <h3 className="text-primary text-[10px] uppercase mb-4 tracking-[0.3em] font-bold border-b border-primary/20 pb-2">{leet("USER_INTEL")}</h3>
                  <div className="whitespace-pre-wrap text-foreground/90 font-mono text-sm leading-relaxed min-h-[100px]">
                    {profile.bio || <span className="text-muted-foreground/30 italic">{leet("NO_ENCRYPTED_DATA_FOUND")}</span>}
                  </div>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 border-primary/10 bg-card/10">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{leet("INIT_DATE")}</p>
                    <p className="font-mono text-primary mt-1 text-lg">
                      {profile.createdAt ? format(new Date(profile.createdAt), 'dd.MM.yyyy') : "??.??"}
                    </p>
                  </Card>
                  <Card className="p-4 border-primary/10 bg-card/10">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Signal Status</p>
                    <p className="font-mono text-primary mt-1 text-lg">{profile.icq ? `UIN:${profile.icq}` : "NO_SIGNAL"}</p>
                  </Card>
                </div>
              </div>
            )}
          </div>
          
          {profile.isBanned && (
            <div className="w-full md:w-64 animate-in fade-in slide-in-from-right-4">
              <Card className="p-6 border-destructive bg-destructive/5 text-center shadow-[0_0_20px_rgba(255,0,0,0.15)]">
                <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
                <h3 className="text-destructive font-black text-2xl uppercase tracking-tighter">{leet("BANNED")}</h3>
                <p className="text-[10px] text-destructive/60 mt-2 font-mono uppercase">User credentials nullified by master control.</p>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
