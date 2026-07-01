import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { BookOpen, ChevronRight, GraduationCap, Layers, FolderOpen } from "lucide-react";
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
    queryKey: ["years_tree"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_years")
        .select("id, name, order_index, semesters(id, name, order_index, deleted_at, subjects(id, name, order_index, deleted_at))")
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
          <p className="mt-1 text-sm text-muted-foreground">Pick a year, module, and subject to start studying</p>
        </div>
        <StreakBadge />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-card" />)}
        </div>
      ) : (
        <div className="space-y-8">
          {(years || []).map((y: any) => {
            const modules = (y.semesters || []).filter((m: any) => !m.deleted_at).sort((a: any, b: any) => a.order_index - b.order_index);
            return (
              <section key={y.id} className="glass hover-lift animate-fade-in rounded-3xl border border-border/60 p-5 sm:p-7 shadow-elegant">
                <header className="mb-5 flex items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary shadow-glow">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-xl sm:text-2xl font-bold">{y.name}</h2>
                    <p className="text-xs text-muted-foreground">{modules.length} module{modules.length === 1 ? "" : "s"}</p>
                  </div>
                </header>

                {modules.length === 0 ? (
                  <EmptyState icon={<Layers className="h-6 w-6" />} title="No modules yet" hint="An admin can add modules to this year from the admin panel." />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {modules.map((mod: any) => {
                      const subjects = (mod.subjects || []).filter((s: any) => !s.deleted_at).sort((a: any, b: any) => a.order_index - b.order_index);
                      return (
                        <div key={mod.id} className="group relative rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur transition-all duration-300 hover:border-primary/50 hover:shadow-glow">
                          <div className="mb-3 flex items-center gap-2">
                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/20 text-accent">
                              <Layers className="h-4 w-4" />
                            </div>
                            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{mod.name}</h3>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{subjects.length}</span>
                          </div>

                          {subjects.length === 0 ? (
                            <EmptyState small icon={<FolderOpen className="h-5 w-5" />} title="No subjects yet" hint="Add subjects from the admin panel." />
                          ) : (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {subjects.map((sub: any) => (
                                <Link
                                  key={sub.id}
                                  to="/app/subject/$subjectId"
                                  params={{ subjectId: sub.id }}
                                  className="group/sub relative flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 p-3 transition-all duration-300 hover:border-primary/60 hover:bg-primary/5 hover:shadow-glow"
                                >
                                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                                    <BookOpen className="h-4 w-4" />
                                  </div>
                                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{sub.name}</span>
                                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover/sub:translate-x-0.5 group-hover/sub:text-primary" />
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
          {!years?.length && (
            <EmptyState icon={<GraduationCap className="h-8 w-8" />} title="No content yet" hint="An admin can add years, modules and subjects from the admin panel." />
          )}
        </div>
      )}
    </AppShell>
  );
}

function EmptyState({ icon, title, hint, small }: { icon: React.ReactNode; title: string; hint?: string; small?: boolean }) {
  return (
    <div className={`grid place-items-center rounded-xl border border-dashed border-border/60 bg-background/30 text-center ${small ? "p-4" : "p-8"}`}>
      <div className={`mb-2 grid ${small ? "h-9 w-9" : "h-12 w-12"} place-items-center rounded-full bg-primary/10 text-primary`}>{icon}</div>
      <p className={`${small ? "text-xs" : "text-sm"} font-semibold`}>{title}</p>
      {hint && <p className={`mt-1 ${small ? "text-[11px]" : "text-xs"} text-muted-foreground`}>{hint}</p>}
    </div>
  );
}
