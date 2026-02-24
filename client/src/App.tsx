import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { leet } from "@/lib/leet";
import { Loader2, Clock } from "lucide-react";

// Pages
import Home from "@/pages/home";
import Auth from "@/pages/auth";
import CategoryView from "@/pages/category";
import ThreadView from "@/pages/thread";
import Profile from "@/pages/profile";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isLoading } = useAuth();

  // 1. Состояние загрузки (проверка сессии)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-primary font-mono">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        {leet("SYNCING_SESSION...")}
      </div>
    );
  }

  // 2. Если не авторизован — показываем только страницу входа
  if (!user) {
    return (
      <Switch>
        <Route path="/auth" component={Auth} />
        <Route>
          <Auth />
        </Route>
      </Switch>
    );
  }

  // 3. ПРОВЕРКА СТАТУСА: Если аккаунт не одобрен
  // Админов пропускаем в любом случае, чтобы они не заблокировали сами себя
  if (user.status !== "APPROVED" && user.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4 text-center">
        <div className="max-w-md p-8 border border-primary/30 bg-primary/5 rounded-lg shadow-[0_0_20px_rgba(0,255,159,0.1)]">
          <Clock className="w-16 h-16 text-primary mx-auto mb-6 animate-pulse" />
          <h1 className="text-2xl font-display text-primary mb-4 tracking-tighter uppercase">
            {leet("ACCESS_PENDING")}
          </h1>
          <p className="text-muted-foreground font-mono text-sm leading-relaxed">
            Your applicatin has recieved to moderators. Please wait. <br />
            <span className="text-[10px] mt-4 block opacity-50">
              ID: {user.id} | STATUS: {user.status}
            </span>
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-8 text-[10px] border border-primary/50 px-4 py-2 hover:bg-primary/20 transition-all text-primary"
          >
            {leet("RECHECK_STATUS")}
          </button>
        </div>
      </div>
    );
  }

  // 4. Если всё ок — доступ к полному функционалу
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={Auth} />
      <Route path="/category/:id" component={CategoryView} />
      <Route path="/thread/:id" component={ThreadView} />
      <Route path="/user/:id" component={Profile} />
      <Route path="/admin" component={Admin} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
