import { useUsersList, useAdminUpdateUser, useStats } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button } from "@/components/ui/cyber-components";
import { Layout } from "@/components/layout";
import { leet } from "@/lib/leet";
import { ShieldAlert, AlertTriangle, ShieldCheck, UserPlus, XCircle } from "lucide-react";
import { Redirect } from "wouter";

export default function Admin() {
  const { user } = useAuth();
  const { data: users, isLoading } = useUsersList();
  const { data: stats } = useStats();
  const updateUser = useAdminUpdateUser();

  if (!user) return <Redirect to="/auth" />;
  if (user.role !== "ADMIN" && user.role !== "MODERATOR") {
    return <Layout><div className="text-center text-destructive p-8 text-2xl">{leet("UNAUTHORIZED_ACCESS")}</div></Layout>;
  }

  const handleRoleChange = (id: number, role: "ADMIN" | "MODERATOR" | "OLDGEN" | "MEMBER") => {
    updateUser.mutate({ id, data: { role } });
  };

  const handleStatusChange = (id: number, status: "APPROVED" | "REJECTED" | "PENDING") => {
    updateUser.mutate({ id, data: { status } });
  };

  const handleBanToggle = (id: number, currentStatus: boolean) => {
    updateUser.mutate({ id, data: { isBanned: !currentStatus } });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center gap-3 border-b border-accent pb-4">
          <ShieldAlert className="text-accent w-8 h-8" />
          <h1 className="text-3xl text-accent font-display">{leet("SYSTEM_ADMINISTRATION")}</h1>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 border-accent/30 bg-accent/5 flex items-center justify-between">
            <div>
              <p className="text-accent text-sm uppercase">{leet("TOTAL_OPERATORS")}</p>
              <h2 className="text-4xl font-display mt-2">{stats?.userCount || 0}</h2>
            </div>
            <div className="text-accent/50 text-xs text-right">
              {users?.filter(u => u.status === "PENDING").length} {leet("WAITING_APPROVAL")}
            </div>
          </Card>
          <Card className="p-6 border-primary/30 bg-primary/5 flex items-center justify-between">
            <div>
              <p className="text-primary text-sm uppercase">{leet("TOTAL_DATABANKS")}</p>
              <h2 className="text-4xl font-display mt-2">{stats?.threadCount || 0}</h2>
            </div>
          </Card>
        </div>

        {/* Таблица пользователей */}
        <Card className="border-border overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="p-4">{leet("USER")}</th>
                <th className="p-4">{leet("APPLICATION_REASON")}</th>
                <th className="p-4">{leet("ROLE")}</th>
                <th className="p-4">{leet("STATUS")}</th>
                <th className="p-4 text-right">{leet("ACTIONS")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>
              ) : (
                users?.map(u => (
                  <tr key={u.id} className={`border-t border-border transition-colors ${u.status === 'PENDING' ? 'bg-accent/5' : 'hover:bg-white/5'}`}>
                    <td className="p-4">
                      <div className="font-bold text-primary">{u.username}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{u.email}</div>
                    </td>
                    
                    {/* Текст заявки */}
                    <td className="p-4 max-w-xs">
                      <div className="text-xs italic text-muted-foreground line-clamp-2 hover:line-clamp-none transition-all cursor-help">
                        {u.applicationReason || "No reason provided"}
                      </div>
                    </td>

                    <td className="p-4">
                      <select 
                        className="bg-background border border-border text-[10px] p-1 outline-none focus:border-accent text-foreground"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                        disabled={updateUser.isPending}
                      >
                        <option value="MEMBER">MEMBER</option>
                        <option value="OLDGEN">OLDGEN</option>
                        <option value="MODERATOR">MODERATOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>

                    <td className="p-4 text-xs font-mono">
                      {u.status === "PENDING" && <span className="text-yellow-500 animate-pulse">● PENDING</span>}
                      {u.status === "APPROVED" && <span className="text-primary">● APPROVED</span>}
                      {u.status === "REJECTED" && <span className="text-destructive">● REJECTED</span>}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {u.status === "PENDING" ? (
                          <>
                            <Button 
                              size="sm" 
                              className="h-7 px-2 bg-primary/20 text-primary hover:bg-primary/40 border-primary/50"
                              onClick={() => handleStatusChange(u.id, "APPROVED")}
                              disabled={updateUser.isPending}
                            >
                              <ShieldCheck className="w-3 h-3 mr-1" /> {leet("ACCEPT")}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              className="h-7 px-2"
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
                            className="h-7 px-2"
                            onClick={() => handleBanToggle(u.id, u.isBanned)}
                            disabled={updateUser.isPending || u.id === user.id}
                          >
                            {u.isBanned ? leet("UNBAN") : leet("BAN")}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </Layout>
  );
}
