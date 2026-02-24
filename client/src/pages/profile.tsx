import { useState, useEffect, useRef } from "react";
import { useProfile, useUpdateProfile } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Input, Textarea, RoleBadge } from "@/components/ui/cyber-components";
import { Layout } from "@/components/layout";
import { useParams } from "wouter";
import { leet } from "@/lib/leet";
import { format } from "date-fns";
import { User as UserIcon, Settings2, Shield, AlertCircle, Upload } from "lucide-react";

export default function Profile() {
  const { id } = useParams();
  const userId = parseInt(id || "0"); // Защита от некорректных ID в URL
  
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

  // Рефы для скрытых инпутов загрузки
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

  // Функция загрузки файла (Avatar/Banner)
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
      setUpdateError("Failed to upload image. Only .png allowed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);
    
    updateProfile.mutate(
      { 
        id: userId, 
        data: { bio, avatarUrl, bannerUrl, icq } 
      },
      {
        onSuccess: () => setIsEditing(false),
        onError: (err: any) => setUpdateError(err.message || "Update failed")
      }
    );
  };

  if (isLoading) return <Layout><div className="animate-pulse h-64 bg-card" /></Layout>;
  
  // Если ошибка загрузки - выводим её красиво
  if (error || !profile) {
    return (
      <Layout>
        <div className="text-center p-12 border border-dashed border-destructive/50 rounded-lg">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-display text-destructive">{leet("ERROR_LOADING_PROFILE")}</h2>
          <p className="text-muted-foreground mt-2">Target ID: {id} | System response: {error ? "Access Denied" : "Not Found"}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Banner Section */}
        <div className="h-48 w-full bg-secondary border border-border relative overflow-hidden group">
          {bannerUrl ? (
            <img src={bannerUrl} alt="banner" className="w-full h-full object-cover opacity-60" />
          ) : (
            <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,255,159,0.05)_10px,rgba(0,255,159,0.05)_20px)]" />
          )}
          
          <div className="absolute -bottom-12 left-8 flex items-end gap-6">
            <div className="w-24 h-24 bg-card border-2 border-primary overflow-hidden flex items-center justify-center z-10 shadow-[0_0_15px_rgba(0,255,159,0.3)]">
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
              className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm border-primary/50 hover:border-primary"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Settings2 className="w-4 h-4 mr-2" />
              {leet(isEditing ? "CANCEL" : "CONFIGURE")}
            </Button>
          )}
        </div>

        <div className="pt-16 px-8 flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-6">
            <div>
              <h1 className="text-4xl text-primary font-display mb-2 flex items-center gap-3">
                {profile.username}
                {profile.role === "ADMIN" && <Shield className="w-6 h-6 text-accent animate-pulse" />}
              </h1>
              <RoleBadge role={profile.role} />
            </div>

            {isEditing ? (
              <Card className="p-6 border-primary/30 bg-card/50 backdrop-blur-sm">
                {updateError && (
                  <div className="mb-4 p-3 border border-destructive bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {updateError}
                  </div>
                )}
                
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-primary uppercase tracking-tighter">{leet("AVATAR_IMAGE")}</label>
                      <div className="flex gap-2">
                        <Input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="URL..." />
                        <input type="file" ref={avatarInputRef} className="hidden" accept=".png" onChange={(e) => handleFileUpload(e, 'avatar')} />
                        <Button type="button" size="icon" variant="outline" onClick={() => avatarInputRef.current?.click()} disabled={isUploading}>
                          <Upload className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-primary uppercase tracking-tighter">{leet("BANNER_IMAGE")}</label>
                      <div className="flex gap-2">
                        <Input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} placeholder="URL..." />
                        <input type="file" ref={bannerInputRef} className="hidden" accept=".png" onChange={(e) => handleFileUpload(e, 'banner')} />
                        <Button type="button" size="icon" variant="outline" onClick={() => bannerInputRef.current?.click()} disabled={isUploading}>
                          <Upload className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-primary uppercase tracking-tighter">ICQ UIN</label>
                    <Input value={icq} onChange={e => setIcq(e.target.value)} placeholder="Network ID..." />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-primary uppercase tracking-tighter">{leet("ENCRYPTED_BIO")}</label>
                    <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} className="font-mono text-sm" />
                  </div>

                  <Button type="submit" className="w-full shadow-[0_0_10px_rgba(0,255,159,0.2)]" disabled={updateProfile.isPending || isUploading}>
                    {updateProfile.isPending ? leet("SYNCING...") : leet("COMMIT_CHANGES")}
                  </Button>
                </form>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card className="p-6 bg-card/30 border-primary/10 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-2 opacity-5 font-display text-4xl select-none">DATA</div>
                  <h3 className="text-primary text-xs uppercase mb-4 tracking-[0.2em] border-b border-primary/20 pb-2">{leet("USER_BIOGRAPHY")}</h3>
                  <div className="whitespace-pre-wrap text-foreground min-h-[100px] leading-relaxed">
                    {profile.bio || <span className="text-muted-foreground/50 italic">{leet("NO_DATA_IN_BIO_RECORD")}</span>}
                  </div>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 border-primary/10 bg-card/20">
                    <p className="text-[10px] text-muted-foreground uppercase">{leet("JOIN_DATE")}</p>
                    <p className="font-mono text-primary mt-1">{format(new Date(profile.createdAt), 'dd.MM.yyyy')}</p>
                  </Card>
                  <Card className="p-4 border-primary/10 bg-card/20">
                    <p className="text-[10px] text-muted-foreground uppercase">Network Status</p>
                    <p className="font-mono text-primary mt-1">{profile.icq ? `ICQ:${profile.icq}` : "OFFLINE"}</p>
                  </Card>
                </div>
              </div>
            )}
          </div>
          
          {profile.isBanned && (
            <div className="w-full md:w-64">
              <Card className="p-4 border-destructive bg-destructive/5 text-center shadow-[0_0_15px_rgba(255,0,0,0.1)]">
                <Shield className="w-12 h-12 text-destructive mx-auto mb-2" />
                <h3 className="text-destructive font-bold text-xl uppercase tracking-widest">{leet("BANNED")}</h3>
                <p className="text-[10px] text-destructive/80 mt-2 uppercase">Access to terminal revoked by system admin.</p>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
