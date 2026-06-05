import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/content")({
  component: ContentManager,
});

type Crumb = { kind: "years" | "year" | "semester" | "subject" | "chapter"; id?: string; label: string };

function ContentManager() {
  const [path, setPath] = useState<Crumb[]>([{ kind: "years", label: "Academic years" }]);
  const current = path[path.length - 1];

  return (
    <AdminShell>
      <h1 className="mb-2 text-3xl font-bold">Academic content</h1>
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        {path.map((c, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <button
              onClick={() => setPath(path.slice(0, i + 1))}
              className={`rounded px-2 py-1 ${i === path.length - 1 ? "bg-accent font-semibold" : "text-muted-foreground hover:text-foreground"}`}
            >
              {c.label}
            </button>
          </span>
        ))}
      </div>

      {current.kind === "years" && (
        <List
          title="Academic years"
          table="academic_years"
          fields={[{ key: "name", label: "Name" }, { key: "order_index", label: "Order", type: "number" }]}
          onOpen={(row) => setPath([...path, { kind: "year", id: row.id, label: row.name }])}
        />
      )}
      {current.kind === "year" && current.id && (
        <List
          title="Semesters"
          table="semesters"
          parentKey="year_id"
          parentId={current.id}
          fields={[{ key: "name", label: "Name" }, { key: "order_index", label: "Order", type: "number" }]}
          onOpen={(row) => setPath([...path, { kind: "semester", id: row.id, label: row.name }])}
        />
      )}
      {current.kind === "semester" && current.id && (
        <List
          title="Subjects"
          table="subjects"
          parentKey="semester_id"
          parentId={current.id}
          fields={[
            { key: "name", label: "Name" },
            { key: "description", label: "Description" },
            { key: "order_index", label: "Order", type: "number" },
          ]}
          onOpen={(row) => setPath([...path, { kind: "subject", id: row.id, label: row.name }])}
        />
      )}
      {current.kind === "subject" && current.id && (
        <>
          <List
            title="Chapters"
            table="chapters"
            parentKey="subject_id"
            parentId={current.id}
            fields={[{ key: "name", label: "Name" }, { key: "order_index", label: "Order", type: "number" }]}
            onOpen={(row) => setPath([...path, { kind: "chapter", id: row.id, label: row.name }])}
          />
          <div className="mt-8">
            <List
              title="Sections (Spotters, Written, ...)"
              table="sections"
              parentKey="subject_id"
              parentId={current.id}
              fields={[
                { key: "name", label: "Name" },
                {
                  key: "kind",
                  label: "Kind",
                  type: "select",
                  options: [
                    "question_bank", "formative", "previous_years", "mock_exam",
                    "revision", "practical", "spotters", "assignments", "ospe", "custom",
                  ],
                },
              ]}
            />
          </div>
        </>
      )}
      {current.kind === "chapter" && current.id && (
        <List
          title="Lectures"
          table="lectures"
          parentKey="chapter_id"
          parentId={current.id}
          fields={[
            { key: "name", label: "Name" },
            { key: "description", label: "Description" },
            { key: "order_index", label: "Order", type: "number" },
          ]}
        />
      )}
    </AdminShell>
  );
}

interface Field { key: string; label: string; type?: "text" | "number" | "select"; options?: string[] }

function List({ title, table, parentKey, parentId, fields, onOpen }: {
  title: string; table: string; parentKey?: string; parentId?: string; fields: Field[]; onOpen?: (row: any) => void;
}) {
  const qc = useQueryClient();
  const queryKey = ["admin_list", table, parentId];
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = supabase.from(table as any).select("*");
      if (parentKey && parentId) q = q.eq(parentKey, parentId);
      const { data, error } = await q.order("order_index", { ascending: true }).order("created_at");
      if (error) throw error;
      return data as any[];
    },
  });

  const save = async (form: any) => {
    try {
      const payload: any = { ...form };
      fields.forEach((f) => { if (f.type === "number" && payload[f.key] !== undefined) payload[f.key] = Number(payload[f.key]) || 0; });
      if (parentKey && parentId) payload[parentKey] = parentId;
      if (editing) {
        const { error } = await supabase.from(table as any).update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Updated");
      } else {
        const { error } = await supabase.from(table as any).insert(payload);
        if (error) throw error;
        toast.success("Added");
      }
      setEditing(null); setCreating(false);
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["years_tree"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (id: string) => {
    if (!confirm("Are you sure you want to delete this?")) return;
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); qc.invalidateQueries({ queryKey }); qc.invalidateQueries({ queryKey: ["years_tree"] }); }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {fields.map(f => <th key={f.key} className="px-4 py-3 text-left font-medium text-muted-foreground">{f.label}</th>)}
              <th className="w-32 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {data?.map((row) => (
              <tr key={row.id} className="border-t border-border hover:bg-accent/30">
                {fields.map(f => (
                  <td key={f.key} className="px-4 py-3">
                    {onOpen && f === fields[0]
                      ? <button onClick={() => onOpen(row)} className="font-medium text-primary hover:underline">{row[f.key] || "—"}</button>
                      : row[f.key] || "—"}
                  </td>
                ))}
                <td className="flex justify-end gap-1 px-4 py-3">
                  <button onClick={() => setEditing(row)} className="rounded p-1.5 hover:bg-accent"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(row.id)} className="rounded p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr><td colSpan={fields.length + 1} className="px-4 py-6 text-center text-sm text-muted-foreground">No data</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <RowDialog
          fields={fields}
          initial={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={save}
        />
      )}
    </div>
  );
}

function RowDialog({ fields, initial, onClose, onSave }: { fields: Field[]; initial: any; onClose: () => void; onSave: (v: any) => void }) {
  const [form, setForm] = useState<any>(initial || {});
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-bold">{initial ? "Edit" : "Add new"}</h3>
        <div className="space-y-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="mb-1 block text-xs text-muted-foreground">{f.label}</label>
              {f.type === "select" ? (
                <select
                  value={form[f.key] || ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm"
                >
                  <option value="">-</option>
                  {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={f.type || "text"}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm"
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
          <button onClick={() => onSave(form)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save</button>
        </div>
      </div>
    </div>
  );
}
