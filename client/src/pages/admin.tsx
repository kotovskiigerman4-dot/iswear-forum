import { useUsersList, useAdminUpdateUser, useStats } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { Card, Button, RoleBadge } from "@/components/ui/cyber-components";
import { Layout } from "@/components/layout";
import { leet } from "@/lib/leet";
import { ShieldAlert, AlertTriangle, ShieldCheck } from "lucide-react";
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 border-accent/30 bg-accent/5 flex items-center justify-between">
            <div>
              <p className="text-accent text-sm uppercase">{leet("TOTAL_OPERATORS")}</p>
              <h2 className="text-4xl font-display mt-2">{stats?.userCount || 0}</h2>
            </div>
            <div className="w-16 h-16 rounded-full border-2 border-accent/50 flex items-center justify-center">
              <div className="w-12 h-12 bg-accent/20 rounded-full animate-pulse" />
            </div>
          </Card>
          <Card className="p-6 border-primary/30 bg-primary/5 flex items-center justify-between">
            <div>
              <p className="text-primary text-sm uppercase">{leet("TOTAL_DATABANKS")}</p>
              <h2 className="text-4xl font-display mt-2">{stats?.threadCount || 0}</h2>
            </div>
            <div className="w-16 h-16 rounded-full border-2 border-primary/50 flex items-center justify-center">
              <div className="w-12 h-12 bg-primary/20 rounded-full animate-pulse" />
            </div>
          </Card>
        </div>

        <Card className="border-border overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="p-4">{leet("ID")}</th>
                <th className="p-4">{leet("USERNAME")}</th>
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
                  <tr key={u.id} className="border-t border-border hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono text-muted-foreground">#{u.id}</td>
                    <td className="p-4 font-bold text-primary">{u.username}</td>
                    <td className="p-4">
                      <select 
                        className="bg-background border border-border text-xs p-1 outline-none focus:border-accent text-foreground"
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
                    <td className="p-4">
                      {u.isBanned ? (
                        <span className="text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> BANNED</span>
                      ) : (
                        <span className="text-primary flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> ACTIVE</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Button 
                        size="sm" 
                        variant={u.isBanned ? "outline" : "destructive"}
                        onClick={() => handleBanToggle(u.id, u.isBanned)}
                        disabled={updateUser.isPending || u.id === user.id}
                      >
                        {u.isBanned ? "UNBAN" : "BAN"}
                      </Button>
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
