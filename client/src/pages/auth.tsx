import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Input, Textarea } from "@/components/ui/cyber-components";
import { leet } from "@/lib/leet";
import { AlertCircle } from "lucide-react";
import { Redirect } from "wouter";

export default function Auth() {
  const { user, login, register, isLoggingIn, isRegistering, error } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [icq, setIcq] = useState("");
  const [applicationReason, setApplicationReason] = useState("");

  if (user) return <Redirect to="/" />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      login({ username, password });
    } else {
      register({ username, password, email, icq, applicationReason });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
      {/* Фоновое свечение */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <Card className="w-full max-w-md p-8 border-primary/50 shadow-[0_0_30px_rgba(0,255,159,0.1)] relative z-10">
        <div className="flex flex-col items-center mb-8">
          
          {/* БОЛЬШОЙ ЧЕРЕП ПО ЦЕНТРУ */}
          <div className="relative group mb-6">
            <div className="absolute -inset-2 bg-primary/20 rounded-full blur-xl opacity-30 group-hover:opacity-60 transition duration-1000"></div>
            <img 
              src="https://media.discordapp.net/attachments/1293910911240634390/1477790740582105098/favicon.png?ex=69a60b60&is=69a4b9e0&hm=5dd412db36f37b9e2fa7023f90820a09787af31955f897e492d6ee6cbe9103c2&=&format=webp&quality=lossless&width=20&height=20" 
              alt="SYSTEM_SKULL" 
              className="relative w-28 h-28 md:w-32 md:h-32 object-contain filter drop-shadow-[0_0_15px_rgba(0,255,159,0.5)] animate-pulse"
            />
          </div>

          <h1 className="text-3xl font-display text-primary tracking-widest">{leet("I-SWEA")}</h1>
          <p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest">{leet("SECURE_PORTAL")}</p>
        </div>

        {/* Улучшенное отображение ошибок */}
        {error && (
          <div className="mb-6 p-3 border border-red-500 bg-red-500/10 text-red-500 text-xs flex items-center gap-2 rounded">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{typeof error === 'string' ? error : "Ошибка валидации: проверьте поля"}</span>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <Button variant={mode === "login" ? "default" : "outline"} className="flex-1" onClick={() => setMode("login")}>
            {leet("LOGIN")}
          </Button>
          <Button variant={mode === "register" ? "default" : "outline"} className="flex-1" onClick={() => setMode("register")}>
            {leet("REGISTER")}
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] text-primary uppercase">{leet("IDENTIFIER")}</label>
            <Input value={username} onChange={e => setUsername(e.target.value)} required className="mt-1" />
          </div>
          
          {mode === "register" && (
            <>
              <div>
                <label className="text-[10px] text-primary uppercase">{leet("EMAIL")}</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-primary uppercase">{leet("REASON_FOR_JOINING")}</label>
                <Textarea 
                  value={applicationReason} 
                  onChange={e => setApplicationReason(e.target.value)} 
                  required 
                  placeholder="why are you asking for access. Type extended response."
                  className="mt-1 min-h-[80px]"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-[10px] text-primary uppercase">{leet("PASSPHRASE")}</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1" />
          </div>

          {mode === "register" && (
            <div>
              <label className="text-[10px] text-muted-foreground uppercase">ICQ or JABBER(OPTIONAL)</label>
              <Input value={icq} onChange={e => setIcq(e.target.value)} className="mt-1" />
            </div>
          )}

          <Button type="submit" className="w-full mt-6" disabled={isLoggingIn || isRegistering}>
            {isLoggingIn || isRegistering ? leet("SYNCING...") : leet(mode === "login" ? "INITIALIZE" : "CREATE_ID")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
