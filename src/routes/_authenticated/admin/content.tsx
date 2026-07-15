import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, ArrowUp, ArrowDown, Move, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/content")({
  component: ContentTree,
});

type Level = "academic_years" | "semesters" | "subjects" | "sections" | "lectures";
const LABEL: Record<Level, string> = {
  academic_years: "Year",
  semesters: "Module",
  subjects: "Subject",
  sections: "Section",
  lectures: "Lecture",
};
const CHILD: Partial<Record<Level, Level>> = {
  academic_years: "semesters",
  semesters: "subjects",
  subjects: "sections",
  sections: "lectures",
};
const PARENT_COL: Partial<Record<Level, string>> = {
  semesters: "year_id",
  subjects: "semester_id",
  sections: "subject_id",
  lectures: "section_id",
};

const SECTION_KINDS = [
  "question_bank", "formative", "previous_years", "mock_exam",
  "revision", "practical", "spotters", "assignments", "ospe", "custom",
];

function ContentTree() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<{ level: Level; row?: any; parentId?: string } | null>(null);
  const [moving, setMoving] = useState<{ level: Level; id: string } | null>(null);

  const { data: tree, isLoading } = useQuery({
    queryKey: ["content_tree"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_years")
        .select("id, name, order_index, deleted_at, semesters(id, name, order_index, deleted_at, year_id, subjects(id, name, order_index, deleted_at, semester_id, sections(id, name, kind, order_index, deleted_at, subject_id, lectures(id, name, order_index, deleted_at, section_id, lecture_summary_link, lecture_transcript_link, lecture_recording_link))))")
        .is("deleted_at", null)
        .order("order_index");
      if (error) throw error;
      return data || [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["content_tree"] });

  const softDelete = async (level: Level, id: string, name: string) => {
    if (!confirm(`Permanently delete "${name}" and ALL nested items, questions, choices and answers? This cannot be undone.`)) return;
    const { error } = await supabase.rpc("admin_hard_delete" as any, { _table: level, _id: id });
    if (error) toast.error(error.message); else { toast.success("Deleted"); refresh(); }
  };

  const reorder = async (level: Level, parentList: any[], id: string, dir: -1 | 1) => {
    const ids = [...parentList].filter(x => !x.deleted_at).sort((a,b)=>a.order_index-b.order_index).map(x=>x.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const { error } = await supabase.rpc("admin_reorder" as any, { _table: level, _ids: ids });
    if (error) toast.error(error.message); else refresh();
  };

  const moveNode = async (level: Level, id: string, newParent: string) => {
    const { error } = await supabase.rpc("admin_move_node" as any, { _table: level, _id: id, _new_parent: newParent });
    if (error) toast.error(error.message); else { toast.success("Moved"); setMoving(null); refresh(); }
  };

  const sortActive = (arr: any[] = []) => arr.filter(x => !x.deleted_at).sort((a,b)=>a.order_index-b.order_index);
  const toggle = (k: string) => setExpanded(p => ({ ...p, [k]: !p[k] }));

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Academic content</h1>
          <p className="mt-1 text-sm text-muted-foreground">Year → Module → Subject → Section → Lecture. Everything is dynamic.</p>
        </div>
        <button
          onClick={() => setEditing({ level: "academic_years" })}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Add Year
        </button>
      </div>

      {isLoading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-2">
          {sortActive(tree as any[]).map((year: any) => {
            const yk = `y:${year.id}`;
            const semesters = sortActive(year.semesters);
            return (
              <div key={year.id} className="rounded-xl border border-border bg-card">
                <Row
                  level="academic_years"
                  row={year}
                  expanded={!!expanded[yk]}
                  hasChildren
                  onToggle={() => toggle(yk)}
                  onAdd={() => setEditing({ level: "semesters", parentId: year.id })}
                  onEdit={() => setEditing({ level: "academic_years", row: year })}
                  onDelete={() => softDelete("academic_years", year.id, year.name)}
                  onUp={() => reorder("academic_years", tree as any[], year.id, -1)}
                  onDown={() => reorder("academic_years", tree as any[], year.id, 1)}
                  onMove={() => setMoving({ level: "academic_years", id: year.id })}
                  movable={false}
                />
                {expanded[yk] && (
                  <div className="border-t border-border pl-6">
                    {semesters.length === 0 && <Empty label="No modules" onAdd={() => setEditing({ level: "semesters", parentId: year.id })} addLabel="Add Module" />}
                    {semesters.map((mod: any) => {
                      const mk = `m:${mod.id}`;
                      const subjects = sortActive(mod.subjects);
                      return (
                        <div key={mod.id} className="border-b border-border last:border-0">
                          <Row
                            level="semesters"
                            row={mod}
                            expanded={!!expanded[mk]}
                            hasChildren
                            onToggle={() => toggle(mk)}
                            onAdd={() => setEditing({ level: "subjects", parentId: mod.id })}
                            onEdit={() => setEditing({ level: "semesters", row: mod, parentId: year.id })}
                            onDelete={() => softDelete("semesters", mod.id, mod.name)}
                            onUp={() => reorder("semesters", year.semesters, mod.id, -1)}
                            onDown={() => reorder("semesters", year.semesters, mod.id, 1)}
                            onMove={() => setMoving({ level: "semesters", id: mod.id })}
                          />
                          {expanded[mk] && (
                            <div className="pl-6 pb-2">
                              {subjects.length === 0 && <Empty label="No subjects" onAdd={() => setEditing({ level: "subjects", parentId: mod.id })} addLabel="Add Subject" />}
                              {subjects.map((subj: any) => {
                                const sk = `s:${subj.id}`;
                                const sections = sortActive(subj.sections);
                                return (
                                  <div key={subj.id} className="border-b border-dashed border-border last:border-0">
                                    <Row
                                      level="subjects"
                                      row={subj}
                                      expanded={!!expanded[sk]}
                                      hasChildren
                                      onToggle={() => toggle(sk)}
                                      onAdd={() => setEditing({ level: "sections", parentId: subj.id })}
                                      onEdit={() => setEditing({ level: "subjects", row: subj, parentId: mod.id })}
                                      onDelete={() => softDelete("subjects", subj.id, subj.name)}
                                      onUp={() => reorder("subjects", mod.subjects, subj.id, -1)}
                                      onDown={() => reorder("subjects", mod.subjects, subj.id, 1)}
                                      onMove={() => setMoving({ level: "subjects", id: subj.id })}
                                    />
                                    {expanded[sk] && (
                                      <div className="pl-6 pb-2">
                                        {sections.length === 0 && <Empty label="No sections" onAdd={() => setEditing({ level: "sections", parentId: subj.id })} addLabel="Add Section" />}
                                        {sections.map((sec: any) => {
                                          const seck = `sec:${sec.id}`;
                                          const lectures = sortActive(sec.lectures);
                                          return (
                                            <div key={sec.id} className="border-b border-dotted border-border last:border-0">
                                              <Row
                                                level="sections"
                                                row={sec}
                                                expanded={!!expanded[seck]}
                                                hasChildren
                                                badge={sec.kind}
                                                onToggle={() => toggle(seck)}
                                                onAdd={() => setEditing({ level: "lectures", parentId: sec.id })}
                                                onEdit={() => setEditing({ level: "sections", row: sec, parentId: subj.id })}
                                                onDelete={() => softDelete("sections", sec.id, sec.name)}
                                                onUp={() => reorder("sections", subj.sections, sec.id, -1)}
                                                onDown={() => reorder("sections", subj.sections, sec.id, 1)}
                                                onMove={() => setMoving({ level: "sections", id: sec.id })}
                                              />
                                              {expanded[seck] && (
                                                <div className="pl-6 pb-2">
                                                  {lectures.length === 0 && <Empty label="No lectures" onAdd={() => setEditing({ level: "lectures", parentId: sec.id })} addLabel="Add Lecture" />}
                                                  {lectures.map((lec: any) => (
                                                    <Row
                                                      key={lec.id}
                                                      level="lectures"
                                                      row={lec}
                                                      expanded={false}
                                                      onToggle={() => {}}
                                                      onAdd={() => {}}
                                                      onEdit={() => setEditing({ level: "lectures", row: lec, parentId: sec.id })}
                                                      onDelete={() => softDelete("lectures", lec.id, lec.name)}
                                                      onUp={() => reorder("lectures", sec.lectures, lec.id, -1)}
                                                      onDown={() => reorder("lectures", sec.lectures, lec.id, 1)}
                                                      onMove={() => setMoving({ level: "lectures", id: lec.id })}
                                                      hasChildren={false}
                                                    />
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {!tree?.length && <Empty label="No academic years yet" onAdd={() => setEditing({ level: "academic_years" })} addLabel="Add Year" />}
        </div>
      )}

      {editing && <EditDialog state={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {moving && <MoveDialog state={moving} tree={tree as any[]} onClose={() => setMoving(null)} onMove={moveNode} />}
    </AdminShell>
  );
}

function Row({
  level, row, expanded, hasChildren, badge, onToggle, onAdd, onEdit, onDelete, onUp, onDown, onMove, movable = true,
}: any) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 hover:bg-accent/30">
      {hasChildren ? (
        <button onClick={onToggle} className="rounded p-1 hover:bg-accent">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      ) : <span className="w-6" />}
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{LABEL[level as Level]}</span>
      <span className="flex-1 truncate text-sm font-medium">{row.name}</span>
      {badge && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{badge}</span>}
      <button onClick={onUp} className="rounded p-1 hover:bg-accent" title="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
      <button onClick={onDown} className="rounded p-1 hover:bg-accent" title="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
      {hasChildren && (
        <button onClick={onAdd} className="rounded p-1 text-primary hover:bg-accent" title="Add child"><Plus className="h-3.5 w-3.5" /></button>
      )}
      {movable && (
        <button onClick={onMove} className="rounded p-1 hover:bg-accent" title="Move to another parent"><Move className="h-3.5 w-3.5" /></button>
      )}
      <button onClick={onEdit} className="rounded p-1 hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
      <button onClick={onDelete} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function Empty({ label, onAdd, addLabel }: any) {
  return (
    <div className="flex items-center justify-between px-3 py-3 text-sm text-muted-foreground">
      <span>{label}</span>
      <button onClick={onAdd} className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs text-primary"><Plus className="h-3 w-3" /> {addLabel}</button>
    </div>
  );
}

function EditDialog({ state, onClose, onSaved }: any) {
  const { level, row, parentId } = state;
  const [name, setName] = useState(row?.name || "");
  const [kind, setKind] = useState(row?.kind || "custom");
  const [summaryLink, setSummaryLink] = useState(row?.lecture_summary_link || "");
  const [transcriptLink, setTranscriptLink] = useState(row?.lecture_transcript_link || "");
  const [recordingLink, setRecordingLink] = useState(row?.lecture_recording_link || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      const parentCol = PARENT_COL[level as Level];
      const payload: any = { name };
      if (level === "sections") payload.kind = kind;
      if (level === "lectures") {
        payload.lecture_summary_link = summaryLink.trim() || null;
        payload.lecture_transcript_link = transcriptLink.trim() || null;
      }
      if (row) {
        const { error } = await supabase.from(level).update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        if (parentCol && parentId) payload[parentCol] = parentId;
        const { error } = await supabase.from(level).insert(payload);
        if (error) throw error;
      }
      toast.success("Saved");
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-bold">{row ? `Edit ${LABEL[level as Level]}` : `Add ${LABEL[level as Level]}`}</h3>
        <div className="space-y-3">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm" />
          {level === "sections" && (
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
              {SECTION_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          )}
          {level === "lectures" && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Lecture Summary Telegram Link</label>
                <input value={summaryLink} onChange={(e) => setSummaryLink(e.target.value)} placeholder="https://t.me/..." className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Lecture Transcript Telegram Link</label>
                <input value={transcriptLink} onChange={(e) => setTranscriptLink(e.target.value)} placeholder="https://t.me/..." className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm" />
              </div>
            </>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{saving ? "..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function MoveDialog({ state, tree, onClose, onMove }: any) {
  const { level, id } = state;
  // Build candidate parent list based on target level
  const candidates = useMemo(() => {
    const targetParent = PARENT_COL[level as Level];
    if (!targetParent) return [] as { id: string; label: string }[];
    const out: { id: string; label: string }[] = [];
    for (const y of (tree || [])) {
      if (level === "semesters") out.push({ id: y.id, label: y.name });
      for (const m of (y.semesters || []).filter((x: any) => !x.deleted_at)) {
        if (level === "subjects") out.push({ id: m.id, label: `${y.name} › ${m.name}` });
        for (const s of (m.subjects || []).filter((x: any) => !x.deleted_at)) {
          if (level === "sections") out.push({ id: s.id, label: `${y.name} › ${m.name} › ${s.name}` });
          for (const sec of (s.sections || []).filter((x: any) => !x.deleted_at)) {
            if (level === "lectures") out.push({ id: sec.id, label: `${y.name} › ${m.name} › ${s.name} › ${sec.name}` });
          }
        }
      }
    }
    return out;
  }, [tree, level]);
  const [target, setTarget] = useState("");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-bold">Move to another parent</h3>
        <select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
          <option value="">Select destination…</option>
          {candidates.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
          <button onClick={() => target && onMove(level, id, target)} disabled={!target} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Move</button>
        </div>
      </div>
    </div>
  );
}
