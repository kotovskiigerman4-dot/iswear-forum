import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Input, Textarea } from "@/components/ui/cyber-components"; // Добавил Textarea для удобства
import { leet } from "@/lib/leet";
import { Terminal, AlertCircle, ShieldCheck } from "lucide-react";
import { Redirect } from "wouter";

export default function Auth() {
  const { user, login, register, isLoggingIn, isRegistering, error } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  
  // State управления формой
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [icq, setIcq] = useState("");
  const [applicationReason, setApplicationReason] = useState(""); // ТО САМОЕ ПОЛЕ

  // Очистка при смене режима
  useEffect(() => {
    setErrorDisplay(null);
  }, [mode]);

  const [errorDisplay, setErrorDisplay] = useState<string | null>(null);

  if (user) return <Redirect to="/" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorDisplay(null);

    if (mode === "login") {
      login({ username, password });
    } else {
      // Передаем весь объект, включая обязательный applicationReason
      register({ 
        username, 
        password, 
        email, 
        icq, 
        applicationReason 
      });
    }
  };

  const isLoading = isLoggingIn || isRegistering;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#050505]">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      
      <Card className="w-full max-w-md p-8 border-primary/30 bg-black/80 backdrop-blur-xl relative z-10 shadow-[0_0_50px_rgba(0,0,0,1)]">
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <Terminal className="w-12 h-12 text-primary mb-2" />
            <ShieldCheck className="w-5 h-5 text-primary absolute -right-2 -top-2 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black text-primary tracking-[0.3em] ml-2">{leet("I-SWEA")}</h1>
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent mt-4" />
        </div>

        <div className="flex gap-2 mb-8 bg-muted/20 p-1 rounded-sm border border-white/5">
          <Button 
            variant={mode === "login" ? "default" : "ghost"} 
            className="flex-1 text-[10px] tracking-widest"
            onClick={() => setMode("login")}
          >
            {leet("LOGIN")}
          </Button>
          <Button 
            variant={mode === "register" ? "default" : "ghost"} 
            className="flex-1 text-[10px] tracking-widest"
            onClick={() => setMode("register")}
          >
            {leet("REGISTER")}
          </Button>
        </div>

        {(error || errorDisplay) && (
          <div className="mb-6 p-4 border border-red-500/50 bg-red-500/10 text-red-400 text-[11px] flex gap-3 items-start animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="break-all font-mono">
              <p className="font-bold uppercase mb-1">Access Denied:</p>
              {typeof error === 'string' ? error : JSON.stringify(error)}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] text-primary/70 uppercase tracking-tighter">{leet("IDENTIFIER")}</label>
            <Input 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              autoComplete="username"
              className="bg-primary/5 border-primary/20 focus:border-primary/60 transition-colors"
            />
          </div>

          {mode === "register" && (
            <div className="space-y-2 animate-in fade-in duration-500">
              <label className="text-[10px] text-primary/70 uppercase tracking-tighter">{leet("EMAIL_ROUTING")}</label>
              <Input 
                type="email"
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                className="bg-primary/5 border-primary/20"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] text-primary/70 uppercase tracking-tighter">{leet("PASSPHRASE")}</label>
            <Input 
              type="password"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              autoComplete="current-password"
              className="bg-primary/5 border-primary/20"
            />
          </div>

          {mode === "register" && (
            <>
              <div className="space-y-2 animate-in fade-in duration-700">
                <label className="text-[10px] text-primary/70 uppercase tracking-tighter">{leet("APPLICATION_REASON")}</label>
                <Input 
                  value={applicationReason} 
                  onChange={e => setApplicationReason(e.target.value)} 
                  required 
                  placeholder="Reason for access..."
                  className="bg-primary/5 border-primary/20"
                />
              </div>
              <div className="space-y-2 animate-in fade-in duration-1000">
                <label className="text-[10px] text-muted-foreground uppercase tracking-tighter">ICQ {leet("(OPTIONAL)")}</label>
                <Input 
                  value={icq} 
                  onChange={e => setIcq(e.target.value)} 
                  className="bg-primary/5 border-white/10"
                />
              </div>
            </>
          )}

          <Button 
            type="submit" 
            className="w-full h-12 mt-4 bg-primary text-black font-bold hover:bg-primary/80 transition-all shadow-[0_0_20px_rgba(0,255,159,0.2)]"
            disabled={isLoading}
          >
            {isLoading ? leet("SYNCHRONIZING...") : leet(mode === "login" ? "ESTABLISH_CONNECTION" : "REGISTER_NEW_NODE")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
