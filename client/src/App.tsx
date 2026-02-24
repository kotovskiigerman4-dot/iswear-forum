import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";

// Pages
import Home from "@/pages/home";
import Auth from "@/pages/auth";
import CategoryView from "@/pages/category";
import ThreadView from "@/pages/thread";
import Profile from "@/pages/profile";
import Admin from "@/pages/admin";

function Router() {
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
