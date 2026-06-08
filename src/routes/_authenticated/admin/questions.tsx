import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Plus, Pencil, Trash2, Loader2, Link2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/questions")({
  component: QuestionsAdmin,
});

function QuestionsAdmin() {
  const qc = useQueryClient();
  const [subjectId, setSubjectId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [lectureId, setLectureId] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [linking, setLinking] = useState<any | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: subjects } = useQuery({
    queryKey: ["subjects_all"],
    queryFn: async () => (await supabase.from("subjects").select("id, name").is("deleted_at", null).order("name")).data || [],
  });
  const { data: sections } = useQuery({
    queryKey: ["sections_by_subject", subjectId],
    queryFn: async () => subjectId ? (await supabase.from("sections").select("id, name, kind").eq("subject_id", subjectId).is("deleted_at", null).order("order_index")).data || [] : [],
    enabled: !!subjectId,
  });
  const { data: lectures } = useQuery({
    queryKey: ["lectures_by_section", sectionId],
    queryFn: async () => sectionId ? (await supabase.from("lectures").select("id, name").eq("section_id", sectionId).is("deleted_at", null).order("order_index")).data || [] : [],
    enabled: !!sectionId,
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["admin_questions", subjectId, sectionId, lectureId],
    queryFn: async () => {
      if (lectureId) {
        const { data, error } = await supabase
          .from("question_lectures" as any)
          .select("question_id, questions!inner(id, text, source_kind, question_type, subject_id, section_id, lecture_id, deleted_at, choices(id, text, order_index))")
          .eq("lecture_id", lectureId)
          .limit(500);
        if (error) throw error;
        return ((data as any[]) || []).map((r: any) => r.questions).filter((q: any) => q && !q.deleted_at);
      }
      let q = supabase
        .from("questions")
        .select("id, text, source_kind, question_type, subject_id, section_id, lecture_id, choices(id, text, order_index)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(300);
      if (subjectId) q = q.eq("subject_id", subjectId);
      if (sectionId) q = q.eq("section_id", sectionId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // augment with is_correct via admin RPC
  const { data: correctness } = useQuery({
    queryKey: ["admin_choices", (questions || []).map((q: any) => q.id).join(",")],
    queryFn: async () => {
      const qids = (questions || []).map((q: any) => q.id);
      if (!qids.length) return new Map<string, boolean>();
      const { data } = await supabase.rpc("get_choices_admin" as any, { _qids: qids as any });
      const m = new Map<string, boolean>();
      for (const c of ((data as any[]) || [])) m.set(c.id, !!c.is_correct);
      return m;
    },
    enabled: !!questions?.length,
  });

  const remove = async (id: string) => {
    if (!confirm("Soft-delete this question?")) return;
    const { error } = await supabase.rpc("admin_soft_delete" as any, { _table: "questions", _id: id });
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin_questions"] }); }
  };
  const bulkRemove = async () => {
    if (!selected.size) return;
    if (!confirm(`Soft-delete ${selected.size} question(s)?`)) return;
    for (const id of selected) {
      await supabase.rpc("admin_soft_delete" as any, { _table: "questions", _id: id });
    }
    toast.success("Deleted");
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["admin_questions"] });
  };
  const toggleSel = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Questions</h1>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button onClick={bulkRemove} className="rounded-lg border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">Delete {selected.size}</button>
          )}
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <Plus className="h-4 w-4" /> Add question
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setSectionId(""); setLectureId(""); }} className="rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
          <option value="">All subjects</option>
          {subjects?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={sectionId} onChange={(e) => { setSectionId(e.target.value); setLectureId(""); }} disabled={!subjectId} className="rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
          <option value="">All sections</option>
          {sections?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={lectureId} onChange={(e) => setLectureId(e.target.value)} disabled={!sectionId} className="rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
          <option value="">All lectures</option>
          {lectures?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {questions?.map((q: any) => (
            <div key={q.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selected.has(q.id)} onChange={() => toggleSel(q.id)} className="mt-1 h-4 w-4 accent-primary" />
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">{q.source_kind}</span>
                    <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">{q.question_type}</span>
                  </div>
                  <p className="font-medium leading-relaxed">{q.text}</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {(q.choices || []).sort((a: any, b: any) => a.order_index - b.order_index).map((c: any) => {
                      const ok = correctness?.get(c.id);
                      return (
                        <li key={c.id} className={ok ? "text-success" : "text-muted-foreground"}>
                          {ok ? "✓" : "·"} {c.text}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setLinking(q)} className="rounded p-1.5 hover:bg-accent" title="Link to lectures (reuse)"><Link2 className="h-4 w-4" /></button>
                  <button onClick={() => setEditing(q)} className="rounded p-1.5 hover:bg-accent"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(q.id)} className="rounded p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
          {questions?.length === 0 && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No questions.</p>}
        </div>
      )}

      {(creating || editing) && (
        <QuestionDialog
          initial={editing}
          subjects={subjects || []}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); qc.invalidateQueries({ queryKey: ["admin_questions"] }); }}
        />
      )}
      {linking && (
        <LinkDialog question={linking} onClose={() => setLinking(null)} />
      )}
    </AdminShell>
  );
}

function QuestionDialog({ initial, subjects, onClose, onSaved }: any) {
  const [text, setText] = useState(initial?.text || "");
  const [explanation, setExplanation] = useState(initial?.explanation || "");
  const [questionType, setQuestionType] = useState(initial?.question_type || "mcq");
  const [subjectId, setSubjectId] = useState(initial?.subject_id || "");
  const [sectionId, setSectionId] = useState(initial?.section_id || "");
  const [lectureId, setLectureId] = useState(initial?.lecture_id || "");
  const [choices, setChoices] = useState<{ text: string; is_correct: boolean }[]>(
    initial?.choices?.length
      ? initial.choices.sort((a: any, b: any) => a.order_index - b.order_index).map((c: any) => ({ text: c.text, is_correct: c.is_correct }))
      : [{ text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }]
  );
  const [saving, setSaving] = useState(false);

  const { data: sections } = useQuery({
    queryKey: ["dlg_sections", subjectId],
    queryFn: async () => subjectId ? (await supabase.from("sections").select("id, name, kind").eq("subject_id", subjectId).is("deleted_at", null)).data || [] : [],
    enabled: !!subjectId,
  });
  const { data: lectures } = useQuery({
    queryKey: ["dlg_lectures", sectionId],
    queryFn: async () => sectionId ? (await supabase.from("lectures").select("id, name").eq("section_id", sectionId).is("deleted_at", null)).data || [] : [],
    enabled: !!sectionId,
  });

  const selectedSec = sections?.find((s: any) => s.id === sectionId);

  const save = async () => {
    if (!text.trim() || !subjectId || !sectionId) { toast.error("Subject, section, and text are required"); return; }
    if (questionType !== "written" && !choices.some((c) => c.is_correct)) { toast.error("Mark at least one correct answer"); return; }
    setSaving(true);
    try {
      const payload: any = {
        text, explanation: explanation || null,
        source_kind: (selectedSec?.kind as string) || "question_bank",
        question_type: questionType,
        subject_id: subjectId, section_id: sectionId, lecture_id: lectureId || null,
      };
      let qid = initial?.id;
      if (qid) {
        const { error } = await supabase.from("questions").update(payload).eq("id", qid);
        if (error) throw error;
        await supabase.from("choices").delete().eq("question_id", qid);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase.from("questions").insert({ ...payload, created_by: user?.id }).select().single();
        if (error) throw error;
        qid = data.id;
      }
      const rows = choices.filter((c) => c.text.trim()).map((c, i) => ({
        question_id: qid, text: c.text, is_correct: c.is_correct, order_index: i,
      }));
      if (questionType !== "written" && rows.length) {
        const { error: cErr } = await supabase.from("choices").insert(rows);
        if (cErr) throw cErr;
      }
      if (lectureId) {
        await supabase.from("question_lectures" as any).upsert(
          { question_id: qid, lecture_id: lectureId },
          { onConflict: "question_id,lecture_id" } as any,
        );
      }
      toast.success("Saved");
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-bold">{initial ? "Edit question" : "Add new question"}</h3>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setSectionId(""); setLectureId(""); }} className="rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
              <option value="">Select subject *</option>
              {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={sectionId} onChange={(e) => { setSectionId(e.target.value); setLectureId(""); }} disabled={!subjectId} className="rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
              <option value="">Select section *</option>
              {sections?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={lectureId} onChange={(e) => setLectureId(e.target.value)} disabled={!sectionId} className="rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
              <option value="">Lecture (optional)</option>
              {lectures?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select value={questionType} onChange={(e) => setQuestionType(e.target.value)} className="rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
              <option value="mcq">Single Choice (MCQ)</option>
              <option value="true_false">True/False</option>
              <option value="multiple_answers">Multiple Answers</option>
              <option value="clinical_case">Clinical Case</option>
              <option value="written">Written (open-ended)</option>
            </select>
          </div>
          <textarea placeholder="Question text *" value={text} onChange={(e) => setText(e.target.value)} rows={3} className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm" />
          <textarea placeholder="Explanation (optional)" value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm" />

          {questionType !== "written" && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium">Choices</label>
                <button onClick={() => setChoices([...choices, { text: "", is_correct: false }])} className="text-xs text-primary">+ Add choice</button>
              </div>
              {choices.map((c, i) => (
                <div key={i} className="mb-2 flex items-center gap-2">
                  <input type="checkbox" checked={c.is_correct} onChange={(e) => { const n = [...choices]; n[i].is_correct = e.target.checked; setChoices(n); }} className="h-4 w-4 accent-primary" />
                  <input value={c.text} onChange={(e) => { const n = [...choices]; n[i].text = e.target.value; setChoices(n); }} placeholder={`Choice ${i + 1}`} className="flex-1 rounded-lg border border-input bg-input/30 px-3 py-2 text-sm" />
                  <button onClick={() => setChoices(choices.filter((_, x) => x !== i))} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
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

function LinkDialog({ question, onClose }: any) {
  const qc = useQueryClient();
  const { data: linked } = useQuery({
    queryKey: ["q_links", question.id],
    queryFn: async () => (await supabase.from("question_lectures" as any).select("lecture_id").eq("question_id", question.id)).data || [],
  });
  const { data: allLectures } = useQuery({
    queryKey: ["all_lectures_grouped"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subjects")
        .select("id, name, sections(id, name, lectures(id, name, deleted_at))")
        .is("deleted_at", null)
        .order("name");
      return data || [];
    },
  });
  const linkedSet = new Set(((linked as any[]) || []).map((r) => r.lecture_id));

  const toggle = async (lectureId: string) => {
    if (linkedSet.has(lectureId)) {
      await supabase.from("question_lectures" as any).delete().eq("question_id", question.id).eq("lecture_id", lectureId);
    } else {
      await supabase.from("question_lectures" as any).insert({ question_id: question.id, lecture_id: lectureId });
    }
    qc.invalidateQueries({ queryKey: ["q_links", question.id] });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4" onClick={onClose}>
      <div className="my-8 max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-1 text-lg font-bold">Link to lectures (reuse)</h3>
        <p className="mb-4 text-xs text-muted-foreground">This question stays as a single source. Linking adds it to extra lectures without duplication.</p>
        <p className="mb-4 rounded-lg bg-muted p-3 text-sm">{question.text}</p>
        <div className="space-y-3">
          {((allLectures as any[]) || []).map((sub: any) => (
            <div key={sub.id}>
              <div className="text-sm font-semibold">{sub.name}</div>
              {(sub.sections || []).map((sec: any) => (
                <div key={sec.id} className="ml-4 mt-1">
                  <div className="text-xs text-muted-foreground">{sec.name}</div>
                  <div className="ml-3 flex flex-wrap gap-2 py-1">
                    {(sec.lectures || []).filter((l: any) => !l.deleted_at).map((lec: any) => {
                      const on = linkedSet.has(lec.id);
                      return (
                        <button key={lec.id} onClick={() => toggle(lec.id)} className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
                          {on ? "✓ " : "+ "} {lec.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Done</button>
        </div>
      </div>
    </div>
  );
}
