import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, Input } from "@/components/ui/cyber-components";
import { leet } from "@/lib/leet";
import { Terminal } from "lucide-react";
import { Redirect } from "wouter";

export default function Auth() {
  const { user, login, register, isLoggingIn, isRegistering } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [icq, setIcq] = useState("");

  if (user) return <Redirect to="/" />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      login({ username, password });
    } else {
      register({ username, password, email, icq });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <Card className="w-full max-w-md p-8 border-primary/50 shadow-[0_0_30px_rgba(0,255,159,0.1)] relative z-10">
        <div className="flex flex-col items-center mb-8">
          <Terminal className="w-12 h-12 text-primary mb-4" />
          <h1 className="text-3xl font-display text-primary tracking-widest">{leet("I-SWEA")}</h1>
          <p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest">{leet("SECURE_ACCESS_PORTAL")}</p>
        </div>

        <div className="flex gap-2 mb-6">
          <Button 
            variant={mode === "login" ? "default" : "outline"} 
            className="flex-1"
            onClick={() => setMode("login")}
            type="button"
          >
            {leet("LOGIN")}
          </Button>
          <Button 
            variant={mode === "register" ? "default" : "outline"} 
            className="flex-1"
            onClick={() => setMode("register")}
            type="button"
          >
            {leet("REGISTER")}
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-primary uppercase tracking-wider">{leet("IDENTIFIER")}</label>
            <Input 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              autoFocus
              className="mt-1"
            />
          </div>
          
          {mode === "register" && (
            <div>
              <label className="text-xs text-primary uppercase tracking-wider">{leet("EMAIL_ROUTING")}</label>
              <Input 
                type="email"
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                className="mt-1"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-primary uppercase tracking-wider">{leet("PASSPHRASE")}</label>
            <Input 
              type="password"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              className="mt-1"
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">ICQ {leet("(OPTIONAL)")}</label>
              <Input 
                value={icq} 
                onChange={e => setIcq(e.target.value)} 
                className="mt-1"
              />
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full mt-6"
            disabled={isLoggingIn || isRegistering}
          >
            {isLoggingIn || isRegistering ? leet("PROCESSING...") : leet(mode === "login" ? "INITIALIZE_LINK" : "CREATE_IDENTITY")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
