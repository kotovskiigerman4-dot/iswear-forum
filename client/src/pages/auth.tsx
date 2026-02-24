import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Input } from "@/components/ui/cyber-components";
import { leet } from "@/lib/leet";
import { Terminal, AlertCircle } from "lucide-react";
import { Redirect } from "wouter";

export default function Auth() {
  // Добавляем error из хука, если он там предусмотрен
  const { user, login, register, isLoggingIn, isRegistering, error } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [icq, setIcq] = useState("");

  // Сбрасываем поля при переключении режима, чтобы не отправить email в логин
  useEffect(() => {
    setPassword("");
    setEmail("");
    setIcq("");
  }, [mode]);

  if (user) return <Redirect to="/" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация перед отправкой
    if (!username || !password) return;

    if (mode === "login") {
      login({ username, password });
    } else {
      register({ username, password, email, icq });
    }
  };

  const isLoading = isLoggingIn || isRegistering;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <Card className="w-full max-w-md p-8 border-primary/50 shadow-[0_0_30px_rgba(0,255,159,0.1)] relative z-10 backdrop-blur-sm">
        <div className="flex flex-col items-center mb-8">
          <Terminal className="w-12 h-12 text-primary mb-4 animate-pulse" />
          <h1 className="text-3xl font-display text-primary tracking-widest">{leet("I-SWEA")}</h1>
          <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-[0.2em]">{leet("SECURE_ACCESS_PORTAL")}</p>
        </div>

        <div className="flex gap-2 mb-6 p-1 bg-secondary/30 rounded-md">
          <Button 
            variant={mode === "login" ? "default" : "ghost"} 
            className="flex-1 transition-all"
            onClick={() => setMode("login")}
            type="button"
            disabled={isLoading}
          >
            {leet("LOGIN")}
          </Button>
          <Button 
            variant={mode === "register" ? "default" : "ghost"} 
            className="flex-1 transition-all"
            onClick={() => setMode("register")}
            type="button"
            disabled={isLoading}
          >
            {leet("REGISTER")}
          </Button>
        </div>

        {/* Вывод ошибки, если она пришла с сервера */}
        {error && (
          <div className="mb-4 p-3 border border-destructive/50 bg-destructive/10 text-destructive text-xs flex items-center gap-2 rounded">
            <AlertCircle className="w-4 h-4" />
            <span>{error.message || "Access Denied"}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-primary uppercase tracking-wider ml-1">{leet("IDENTIFIER")}</label>
            <Input 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              autoFocus
              placeholder="root_admin"
              disabled={isLoading}
              className="bg-background/50 border-primary/20 focus:border-primary"
            />
          </div>
          
          {mode === "register" && (
            <div className="space-y-1">
              <label className="text-[10px] text-primary uppercase tracking-wider ml-1">{leet("EMAIL_ROUTING")}</label>
              <Input 
                type="email"
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                placeholder="node@network.com"
                disabled={isLoading}
                className="bg-background/50 border-primary/20 focus:border-primary"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] text-primary uppercase tracking-wider ml-1">{leet("PASSPHRASE")}</label>
            <Input 
              type="password"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
              disabled={isLoading}
              className="bg-background/50 border-primary/20 focus:border-primary"
            />
          </div>

          {mode === "register" && (
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider ml-1">ICQ {leet("(OPTIONAL)")}</label>
              <Input 
                value={icq} 
                onChange={e => setIcq(e.target.value)} 
                placeholder="123-456-789"
                disabled={isLoading}
                className="bg-background/50 border-primary/10 focus:border-primary"
              />
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full mt-6 shadow-[0_0_15px_rgba(0,255,159,0.2)]"
            disabled={isLoading}
          >
            {isLoading 
              ? leet("PROCESSING...") 
              : leet(mode === "login" ? "INITIALIZE_LINK" : "CREATE_IDENTITY")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
