import { useUsersList, useAdminUpdateUser, useStats } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button } from "@/components/ui/cyber-components";
import { Layout } from "@/components/layout";
import { leet } from "@/lib/leet";
import { Redirect } from "wouter";
import { useEffect } from "react";

// ПРЯМЫЕ ИМПОРТЫ ИКОНОК (Чтобы Render не падал при сборке)
import ShieldAlert from "lucide-react/dist/esm/icons/shield-alert";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import XCircle from "lucide-react/dist/esm/icons/x-circle";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

export default function Admin() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading, error } = useUsersList();
  const { data: stats } = useStats();
  const updateUser = useAdminUpdateUser();

  // Логирование для отладки
  useEffect(() => {
    if (users) {
      console.log("ADMIN_DEBUG: Received users list:", users);
    }
    if (error) {
      console.error("ADMIN_DEBUG: API Error:", error);
    }
  }, [users, error]);

  if (!currentUser) return <Redirect to="/auth" />;
  
  // Проверка прав (админы и модераторы)
  if (currentUser.role !== "ADMIN" && currentUser.role !== "MODERATOR") {
    return (
      <Layout>
        <div className="text-center text-destructive p-8 text-2xl font-display">
          {leet("UNAUTHORIZED_ACCESS")}
        </div>
      </Layout>
    );
  }

  const handleRoleChange = (id: number, role: string) => {
    updateUser.mutate({ id, data: { role } });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateUser.mutate({ id, data: { status } });
  };

  const handleBanToggle = (id: number, currentBanStatus: boolean) => {
    updateUser.mutate({ id, data: { isBanned: !currentBanStatus } });
  };

  // Хелпер для нормализации статуса
  const getStatus = (s: string | undefined) => s?.toUpperCase() || "PENDING";

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-3 border-b border-accent/50 pb-4">
          <ShieldAlert className="text-accent w-8 h-8" />
          <h1 className="text-3xl text-accent font-display tracking-tighter">
            {leet("SYSTEM_ADMINISTRATION")}
          </h1>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 border-accent/30 bg-accent/5 flex items-center justify-between">
            <div>
              <p className="text-accent text-xs uppercase font-mono">{leet("TOTAL_OPERATORS")}</p>
              <h2 className="text-4xl font-display mt-2">{stats?.userCount || 0}</h2>
            </div>
            <div className="text-accent/70 text-[10px] font-mono text-right bg-accent/10 p-2 border border-accent/20">
              {users?.filter(u => getStatus(u.status) === "PENDING").length || 0} {leet("WAITING_APPROVAL")}
            </div>
          </Card>
          <Card className="p-6 border-primary/30 bg-primary/5 flex items-center justify-between">
            <div>
              <p className="text-primary text-xs uppercase font-mono">{leet("TOTAL_DATABANKS")}</p>
              <h2 className="text-4xl font-display mt-2">{stats?.threadCount || 0}</h2>
            </div>
          </Card>
        </div>

        {/* Таблица пользователей */}
        <Card className="border-border/50 bg-black/40 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-mono">
              <thead className="bg-secondary/30 text-muted-foreground uppercase text-[10px] tracking-widest">
                <tr>
                  <th className="p-4">{leet("USER")}</th>
                  <th className="p-4">{leet("APPLICATION_REASON")}</th>
                  <th className="p-4">{leet("ROLE")}</th>
                  <th className="p-4">{leet("STATUS")}</th>
                  <th className="p-4 text-right">{leet("ACTIONS")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent opacity-50" />
                    </td>
                  </tr>
                ) : users && users.length > 0 ? (
                  users.map(u => {
                    const status = getStatus(u.status);
                    const isPending = status === "PENDING";
                    
                    return (
                      <tr key={u.id} className={`transition-colors ${isPending ? 'bg-accent/10' : 'hover:bg-white/5'}`}>
                        <td className="p-4">
                          <div className="font-bold text-primary">{u.username}</div>
                          <div className="text-[9px] text-muted-foreground opacity-50 uppercase tracking-tighter">ID: {u.id}</div>
                        </td>
                        
                        <td className="p-4 max-w-xs">
                          <div className="text-[11px] leading-relaxed text-muted-foreground break-words italic border-l border-accent/20 pl-2">
                            {u.applicationReason || "--- NO DATA ---"}
                          </div>
                        </td>

                        <td className="p-4">
                          <select 
                            className="bg-black border border-border/50 text-[10px] p-1 outline-none focus:border-accent text-foreground cursor-pointer"
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={updateUser.isPending}
                          >
                            <option value="MEMBER">MEMBER</option>
                            <option value="OLDGEN">OLDGEN</option>
                            <option value="MODERATOR">MODERATOR</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </td>

                        <td className="p-4 text-[10px]">
                          {status === "PENDING" && <span className="text-yellow-500 animate-pulse">● PENDING</span>}
                          {status === "APPROVED" && <span className="text-primary">● APPROVED</span>}
                          {status === "REJECTED" && <span className="text-destructive">● REJECTED</span>}
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            {status === "PENDING" ? (
                              <>
                                <Button 
                                  size="sm" 
                                  className="h-7 text-[10px] bg-primary/20 text-primary hover:bg-primary/40 border-primary/50"
                                  onClick={() => handleStatusChange(u.id, "APPROVED")}
                                  disabled={updateUser.isPending}
                                >
                                  <ShieldCheck className="w-3 h-3 mr-1" /> {leet("ACCEPT")}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  className="h-7 text-[10px]"
                                  onClick={() => handleStatusChange(u.id, "REJECTED")}
                                  disabled={updateUser.isPending}
                                >
                                  <XCircle className="w-3 h-3 mr-1" /> {leet("REJECT")}
                                </Button>
                              </>
                            ) : (
                              <Button 
                                size="sm" 
                                variant={u.isBanned ? "outline" : "destructive"}
                                className="h-7 text-[10px] min-w-[80px]"
                                onClick={() => handleBanToggle(u.id, !!u.isBanned)}
                                disabled={updateUser.isPending || u.id === currentUser.id}
                              >
                                {u.isBanned ? leet("UNBAN") : leet("BAN")}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground font-mono italic">
                      {leet("NO_RECORDS_FOUND")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
