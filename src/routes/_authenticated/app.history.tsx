import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/app/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { data } = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const { data } = await supabase.from("exam_attempts").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });
  return (
    <AppShell>
      <h1 className="mb-6 text-3xl font-bold">نتائجي</h1>
      <div className="space-y-2">
        {data?.length === 0 && <p className="text-sm text-muted-foreground">لم تقم بأي اختبار بعد.</p>}
        {data?.map((a: any) => (
          <Link key={a.id} to="/app/result/$attemptId" params={{ attemptId: a.id }} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition hover:border-primary/50">
            <div>
              <div className="font-medium">{a.title}</div>
              <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("ar")}</div>
            </div>
            <div className="text-left">
              <div className="text-lg font-bold text-primary">{a.score_percent?.toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">{a.correct_count}/{a.total_questions}</div>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
