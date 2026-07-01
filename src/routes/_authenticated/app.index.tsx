import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { BookOpen, ChevronRight } from "lucide-react";
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
        .select("id, name, order_index, semesters(id, name, order_index, subjects(id, name, order_index))")
        .is("deleted_at", null)
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const name = firstName(me?.full_name, me?.email);

  return (
    <AppShell>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome {name ? `Dr. ${name}` : "Doctor"} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pick a year, module, and subject to start studying</p>
        </div>
        <StreakBadge />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-card" />)}
        </div>
      ) : (
        <div className="space-y-10">
          {years?.map((y: any) => (
            <section key={y.id}>
              <h2 className="mb-4 text-lg font-semibold">{y.name}</h2>
              <div className="space-y-6">
                {(y.semesters || []).sort((a: any, b: any) => a.order_index - b.order_index).map((mod: any) => (
                  <div key={mod.id}>
                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">{mod.name}</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {(mod.subjects || []).sort((a: any, b: any) => a.order_index - b.order_index).map((sub: any) => (
                        <Link
                          key={sub.id}
                          to="/app/subject/$subjectId"
                          params={{ subjectId: sub.id }}
                          className="group hover-lift animate-fade-in rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/60 hover:shadow-glow"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary shadow-glow">
                              <BookOpen className="h-5 w-5" />
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                          </div>
                          <h4 className="font-semibold">{sub.name}</h4>
                          <p className="mt-1 text-xs text-muted-foreground">{mod.name}</p>
                        </Link>
                      ))}
                      {!(mod.subjects || []).length && (
                        <p className="text-sm text-muted-foreground">No subjects in this module yet.</p>
                      )}
                    </div>
                  </div>
                ))}
                {!(y.semesters || []).length && (
                  <p className="text-sm text-muted-foreground">No modules in this year yet.</p>
                )}
              </div>
            </section>
          ))}
          {!years?.length && (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No content yet. An admin can add years, modules, and subjects from the admin panel.
            </p>
          )}
        </div>
      )}
    </AppShell>
  );
}
