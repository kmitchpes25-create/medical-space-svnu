import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { toast } from "sonner";
import { RotateCcw, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/recovery")({
  component: RecoveryPage,
});

const TABS: { key: string; label: string; table: string }[] = [
  { key: "years", label: "Years", table: "academic_years" },
  { key: "modules", label: "Modules", table: "semesters" },
  { key: "subjects", label: "Subjects", table: "subjects" },
  { key: "sections", label: "Sections", table: "sections" },
  { key: "lectures", label: "Lectures", table: "lectures" },
  { key: "questions", label: "Questions", table: "questions" },
];

function RecoveryPage() {
  const [tab, setTab] = useState(TABS[0]);
  const qc = useQueryClient();
  const cols = tab.table === "questions" ? "id, text, deleted_at" : "id, name, deleted_at";

  const { data, isLoading } = useQuery({
    queryKey: ["recovery", tab.table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tab.table as any)
        .select(cols)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const restore = async (id: string) => {
    const { error } = await supabase.rpc("admin_restore" as any, { _table: tab.table, _id: id });
    if (error) toast.error(error.message);
    else {
      toast.success("Restored");
      qc.invalidateQueries({ queryKey: ["recovery", tab.table] });
      qc.invalidateQueries({ queryKey: ["content_tree"] });
    }
  };

  return (
    <AdminShell>
      <h1 className="mb-2 text-3xl font-bold">Recovery</h1>
      <p className="mb-6 text-sm text-muted-foreground">Soft-deleted content. Restore items here to make them visible again.</p>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${tab.key === t.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : data?.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nothing to restore.</p>
      ) : (
        <div className="space-y-2">
          {data?.map((row: any) => (
            <div key={row.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div className="flex-1">
                <div className="font-medium">{row.name || row.text?.slice(0, 100) || "(no label)"}</div>
                <div className="mt-1 text-xs text-muted-foreground">Deleted {new Date(row.deleted_at).toLocaleString()}</div>
              </div>
              <button onClick={() => restore(row.id)} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:border-primary hover:text-primary">
                <RotateCcw className="h-3.5 w-3.5" /> Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
