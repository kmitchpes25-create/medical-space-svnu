import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { BookOpen, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  component: AppHome,
});

function AppHome() {
  const { data: years, isLoading } = useQuery({
    queryKey: ["years_tree"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_years")
        .select("id, name, name_ar, order_index, semesters(id, name, name_ar, order_index, subjects(id, name, name_ar, order_index))")
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">مرحباً بك في Medical Space</h1>
        <p className="mt-1 text-sm text-muted-foreground">اختر السنة الدراسية للبدء</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-40 animate-pulse rounded-xl bg-card" />)}
        </div>
      ) : (
        <div className="space-y-8">
          {years?.map((y: any) => (
            <section key={y.id}>
              <h2 className="mb-3 text-lg font-semibold">{y.name_ar || y.name}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(y.semesters || []).flatMap((s: any) =>
                  (s.subjects || []).map((sub: any) => (
                    <Link
                      key={sub.id}
                      to="/app/subject/$subjectId"
                      params={{ subjectId: sub.id }}
                      className="group rounded-xl border border-border bg-card p-5 transition hover:border-primary/50 hover:shadow-elegant"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <ChevronLeft className="h-4 w-4 text-muted-foreground transition group-hover:-translate-x-1 group-hover:text-primary" />
                      </div>
                      <h3 className="font-semibold">{sub.name_ar || sub.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{s.name_ar || s.name}</p>
                    </Link>
                  ))
                )}
                {(y.semesters || []).every((s: any) => !s.subjects?.length) && (
                  <p className="text-sm text-muted-foreground">لا توجد مواد بعد. يستطيع المسؤول إضافة المواد من لوحة الإدارة.</p>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}
