import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Shield, ShieldOff, Ban, Check, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersAdmin,
});

function UsersAdmin() {
  const qc = useQueryClient();
  const [emailQuery, setEmailQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(emailQuery.trim()), 250);
    return () => clearTimeout(t);
  }, [emailQuery]);

  const { data, isFetching } = useQuery({
    queryKey: ["all_users", debounced],
    queryFn: async () => {
      let q = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
      if (debounced) q = q.ilike("email", `%${debounced.replace(/[%_]/g, m => "\\" + m)}%`);
      const { data: profiles } = await q;
      const ids = (profiles || []).map((p: any) => p.id);
      const { data: roles } = ids.length
        ? await supabase.from("user_roles").select("*").in("user_id", ids)
        : { data: [] as any[] };
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

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={emailQuery}
            onChange={(e) => setEmailQuery(e.target.value)}
            placeholder="Search user by email..."
            className="w-full rounded-lg border border-input bg-input/30 pl-9 pr-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        {isFetching && <span className="text-xs text-muted-foreground">Searching…</span>}
      </div>

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
                      ? <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">admin</span>
                      : <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">student</span>}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_banned
                      ? <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive">banned</span>
                      : <span className="rounded bg-success/10 px-2 py-0.5 text-xs text-success">active</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setAdmin(u.id, !isAdmin)}
                        title={isAdmin ? "Remove admin" : "Make admin"}
                        className="rounded-md p-1.5 hover:bg-accent"
                      >
                        {isAdmin ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => toggleBan(u.id, u.is_banned)}
                        title={u.is_banned ? "Unban" : "Ban"}
                        className="rounded-md p-1.5 hover:bg-accent"
                      >
                        {u.is_banned ? <Check className="h-4 w-4 text-success" /> : <Ban className="h-4 w-4 text-destructive" />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {data?.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No users match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
