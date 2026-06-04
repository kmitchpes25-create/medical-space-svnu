import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Home, LogOut, Settings, Stethoscope, Star, History,
} from "lucide-react";
import { toast } from "sonner";

const studentLinks = [
  { to: "/app", label: "Home", icon: Home },
  { to: "/app/favorites", label: "Favorites", icon: Star },
  { to: "/app/history", label: "My results", icon: History },
];

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { data: isAdmin } = useQuery({
    queryKey: ["is_admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase
        .from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      return !!data;
    },
  });

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <Link to="/app" className="mb-8 flex items-center gap-2 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-glow">
            <Stethoscope className="h-5 w-5" />
          </div>
          <span className="font-bold">Medical Space</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {studentLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to as any}
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
              activeOptions={{ exact: l.to === "/app" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition hover:bg-sidebar-accent"
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </Link>
          ))}

          {isAdmin && (
            <>
              <div className="mt-6 mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">Administration</div>
              <Link to="/admin" activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition hover:bg-sidebar-accent">
                <Settings className="h-4 w-4" /> Admin panel
              </Link>
            </>
          )}
        </nav>

        <button onClick={logout} className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition hover:bg-sidebar-accent">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl p-4 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
