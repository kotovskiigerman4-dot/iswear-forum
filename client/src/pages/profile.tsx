import { useState, useEffect } from "react";
import { useProfile, useUpdateProfile } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Input, Textarea, RoleBadge } from "@/components/ui/cyber-components";
import { Layout } from "@/components/layout";
import { useParams } from "wouter";
import { leet } from "@/lib/leet";
import { format } from "date-fns";
import { User as UserIcon, Settings2, Shield, AlertCircle } from "lucide-react";

export default function Profile() {
  const { id } = useParams();
  const { data: profile, isLoading, error } = useProfile(Number(id));
  const { user } = useAuth();
  const updateProfile = useUpdateProfile(); // ✅ ДОБАВИТЬ ЭТУ ФУНКЦИЮ
  
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [icq, setIcq] = useState("");
  const [updateError, setUpdateError] = useState<string | null>(null);

  const isOwner = user?.id === Number(id);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatarUrl || "");
      setBannerUrl(profile.bannerUrl || "");
      setIcq(profile.icq || "");
    }
  }, [profile]);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);
    
    // ✅ ИСПРАВИТЬ: Вызвать функцию обновления
    updateProfile.mutate(
      { 
        id: Number(id), 
        data: { bio, avatarUrl, bannerUrl, icq } 
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
        onError: (err) => {
          setUpdateError(typeof err === 'string' ? err : "Ошибка обновления профиля");
        }
      }
    );
  };

  if (isLoading) return <Layout><div className="animate-pulse h-64 bg-card" /></Layout>;
  if (error) return <Layout><div className="text-center text-destructive p-8">{leet("ERROR_LOADING_PROFILE")}</div></Layout>;
  if (!profile) return <Layout><div className="text-center text-destructive p-8">{leet("USER_NOT_FOUND")}</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Banner */}
        <div className="h-48 w-full bg-secondary border border-border relative overflow-hidden">
          {profile.bannerUrl ? (
            <img src={profile.bannerUrl} alt="banner" className="w-full h-full object-cover opacity-50" />
          ) : (
            <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,255,159,0.05)_10px,rgba(0,255,159,0.05)_20px)]" />
          )}
          
          <div className="absolute -bottom-12 left-8 flex items-end gap-6">
            <div className="w-24 h-24 bg-card border-2 border-primary overflow-hidden flex items-center justify-center z-10">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
          </div>
          
          {isOwner && (
            <Button 
              size="sm" 
              variant="outline" 
              className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm"
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
              <h1 className="text-4xl text-primary font-display mb-2">{profile.username}</h1>
              <RoleBadge role={profile.role} />
            </div>

            {isEditing ? (
              <Card className="p-6 border-primary/50">
                {/* ✅ ДОБАВИТЬ ОБРАБОТКУ ОШИБОК */}
                {updateError && (
                  <div className="mb-4 p-3 border border-red-500 bg-red-500/10 text-red-500 text-xs flex items-center gap-2 rounded">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{updateError}</span>
                  </div>
                )}
                
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase">{leet("AVATAR_URL")}</label>
                    <Input 
                      value={avatarUrl} 
                      onChange={e => setAvatarUrl(e.target.value)} 
                      placeholder="https://..." 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase">{leet("BANNER_URL")}</label>
                    <Input 
                      value={bannerUrl} 
                      onChange={e => setBannerUrl(e.target.value)} 
                      placeholder="https://..." 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase">ICQ</label>
                    <Input 
                      value={icq} 
                      onChange={e => setIcq(e.target.value)} 
                      placeholder="UIN..." 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase">{leet("BIO")}</label>
                    <Textarea 
                      value={bio} 
                      onChange={e => setBio(e.target.value)} 
                      rows={4} 
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={updateProfile.isPending} // ✅ ДОБАВИТЬ СОСТОЯНИЕ ЗАГРУЗКИ
                  >
                    {updateProfile.isPending ? leet("SAVING...") : leet("SAVE_PARAMETERS")}
                  </Button>
                </form>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card className="p-6 bg-card/30">
                  <h3 className="text-primary text-sm uppercase mb-4 tracking-widest">{leet("BIOGRAPHY")}</h3>
                  <div className="whitespace-pre-wrap text-foreground min-h-[100px]">
                    {profile.bio || <span className="text-muted-foreground italic">{leet("NO_DATA_PROVIDED")}</span>}
                  </div>
                </Card>
                
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground uppercase">{leet("REGISTRATION_DATE")}</p>
                    <p className="font-bold mt-1">{format(new Date(profile.createdAt), 'PP')}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground uppercase">ICQ</p>
                    <p className="font-bold mt-1">{profile.icq || "N/A"}</p>
                  </Card>
                </div>
              </div>
            )}
          </div>
          
          {profile.isBanned && (
            <div className="w-full md:w-64">
              <Card className="p-4 border-destructive bg-destructive/10 text-center">
                <Shield className="w-12 h-12 text-destructive mx-auto mb-2" />
                <h3 className="text-destructive font-bold text-xl uppercase tracking-widest">BANNED</h3>
                <p className="text-xs text-destructive/80 mt-2">Access permanently revoked.</p>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
