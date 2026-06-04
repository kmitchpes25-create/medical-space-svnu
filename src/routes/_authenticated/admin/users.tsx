import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Shield, ShieldOff, Ban, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersAdmin,
});

function UsersAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["all_users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("*");
      return (profiles || []).map((p: any) => ({
        ...p,
        roles: (roles || []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
      }));
    },
  });

  const setAdmin = async (userId: string, makeAdmin: boolean) => {
    if (makeAdmin) {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["all_users"] });
  };

  const toggleBan = async (userId: string, banned: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_banned: !banned }).eq("id", userId);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["all_users"] }); }
  };

  return (
    <AdminShell>
      <h1 className="mb-6 text-3xl font-bold">Users</h1>
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {data?.map((u: any) => {
              const isAdmin = u.roles.includes("admin");
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{u.full_name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    {isAdmin
                      ? <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">Admin</span>
                      : <span className="rounded bg-muted px-2 py-0.5 text-xs">Student</span>}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_banned
                      ? <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive">Banned</span>
                      : <span className="rounded bg-success/10 px-2 py-0.5 text-xs text-success">Active</span>}
                  </td>
                  <td className="flex justify-end gap-2 px-4 py-3">
                    <button onClick={() => setAdmin(u.id, !isAdmin)} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
                      {isAdmin ? <><ShieldOff className="mr-1 inline h-3 w-3" />Remove admin</> : <><Shield className="mr-1 inline h-3 w-3" />Make admin</>}
                    </button>
                    <button onClick={() => toggleBan(u.id, u.is_banned)} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
                      {u.is_banned ? <><Check className="mr-1 inline h-3 w-3" />Unban</> : <><Ban className="mr-1 inline h-3 w-3" />Ban</>}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
