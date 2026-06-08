import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { Stethoscope, LayoutDashboard, Layers, FileQuestion, Users, Upload, ArrowLeft, LogOut, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const links = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/content", label: "Content", icon: Layers },
  { to: "/admin/questions", label: "Questions", icon: FileQuestion },
  { to: "/admin/upload", label: "Uploads", icon: Upload },
  { to: "/admin/recovery", label: "Recovery", icon: Archive },
  { to: "/admin/users", label: "Users", icon: Users },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <Link to="/admin" className="mb-8 flex items-center gap-2 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-glow">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold">Medical Space</div>
            <div className="text-xs text-muted-foreground">Admin panel</div>
          </div>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {links.map((l) => (
            <Link key={l.to} to={l.to as any} activeOptions={{ exact: l.exact }} activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition hover:bg-sidebar-accent">
              <l.icon className="h-4 w-4" />{l.label}
            </Link>
          ))}
        </nav>
        <Link to="/app" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent">
          <ArrowLeft className="h-4 w-4" /> Back to app
        </Link>
        <button onClick={logout} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl p-4 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
