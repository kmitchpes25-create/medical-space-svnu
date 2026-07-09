import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { ChevronRight, GraduationCap, Layers } from "lucide-react";
import { StreakBadge } from "@/components/streak-badge";

export const Route = createFileRoute("/_authenticated/app/")({
  component: AppHome,
});

function firstName(full?: string | null, email?: string | null) {
  if (full && full.trim()) return full.trim().split(/\s+/)[0];
  if (email) return email.split("@")[0];
  return "";
}

function AppHome() {
  const { data: me } = useQuery({
    queryKey: ["me_profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("full_name, email").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  const { data: years, isLoading } = useQuery({
    queryKey: ["years_list_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_years")
        .select("id, name, order_index, semesters(id, deleted_at)")
        .is("deleted_at", null)
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const name = firstName(me?.full_name, me?.email);

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold neon-text">Welcome {name ? `Dr. ${name}` : "Doctor"} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose your academic year to get started</p>
        </div>
        <StreakBadge />
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-3xl bg-card" />)}
        </div>
      ) : !years?.length ? (
        <EmptyState title="No academic years yet" hint="An admin can add years from the admin panel." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {years.map((y: any) => {
            const moduleCount = (y.semesters || []).filter((m: any) => !m.deleted_at).length;
            return (
              <Link
                key={y.id}
                to="/app/year/$yearId"
                params={{ yearId: y.id }}
                className="group glass hover-lift animate-fade-in relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/60 p-6 shadow-elegant transition-all duration-300 hover:border-primary/60 hover:shadow-glow"
              >
                <div>
                  <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary shadow-glow">
                    <GraduationCap className="h-7 w-7" />
                  </div>
                  <h2 className="truncate text-2xl font-bold">{y.name}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" />
                    {moduleCount} module{moduleCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between text-sm font-semibold text-primary">
                  <span>Open Year</span>
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border/60 bg-background/30 p-12 text-center">
      <div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
        <GraduationCap className="h-7 w-7" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
