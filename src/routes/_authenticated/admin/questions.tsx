import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/questions")({
  component: QuestionsAdmin,
});

const SOURCE_KINDS = [
  "question_bank", "formative", "previous_years", "mock_exam",
  "revision", "practical", "spotters", "assignments", "ospe", "custom",
];

function QuestionsAdmin() {
  const qc = useQueryClient();
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [lectureId, setLectureId] = useState("");
  const [sourceKind, setSourceKind] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: subjects } = useQuery({
    queryKey: ["subjects_all"],
    queryFn: async () => (await supabase.from("subjects").select("id, name, name_ar").order("name")).data || [],
  });
  const { data: chapters } = useQuery({
    queryKey: ["chapters_by_subject", subjectId],
    queryFn: async () => subjectId ? (await supabase.from("chapters").select("id, name, name_ar").eq("subject_id", subjectId).order("order_index")).data || [] : [],
    enabled: !!subjectId,
  });
  const { data: lectures } = useQuery({
    queryKey: ["lectures_by_chapter", chapterId],
    queryFn: async () => chapterId ? (await supabase.from("lectures").select("id, name, name_ar").eq("chapter_id", chapterId).order("order_index")).data || [] : [],
    enabled: !!chapterId,
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["admin_questions", subjectId, chapterId, lectureId, sourceKind],
    queryFn: async () => {
      let q = supabase.from("questions").select("id, text, source_kind, exam_year, question_type, choices(id, text, is_correct, order_index)").order("created_at", { ascending: false }).limit(200);
      if (subjectId) q = q.eq("subject_id", subjectId);
      if (chapterId) q = q.eq("chapter_id", chapterId);
      if (lectureId) q = q.eq("lecture_id", lectureId);
      if (sourceKind) q = q.eq("source_kind", sourceKind as any);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const remove = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا السؤال؟")) return;
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["admin_questions"] }); }
  };

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">إدارة الأسئلة</h1>
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> إضافة سؤال
        </button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setChapterId(""); setLectureId(""); }} className="rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
          <option value="">كل المواد</option>
          {subjects?.map((s: any) => <option key={s.id} value={s.id}>{s.name_ar || s.name}</option>)}
        </select>
        <select value={chapterId} onChange={(e) => { setChapterId(e.target.value); setLectureId(""); }} disabled={!subjectId} className="rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
          <option value="">كل الشابترز</option>
          {chapters?.map((c: any) => <option key={c.id} value={c.id}>{c.name_ar || c.name}</option>)}
        </select>
        <select value={lectureId} onChange={(e) => setLectureId(e.target.value)} disabled={!chapterId} className="rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
          <option value="">كل المحاضرات</option>
          {lectures?.map((l: any) => <option key={l.id} value={l.id}>{l.name_ar || l.name}</option>)}
        </select>
        <select value={sourceKind} onChange={(e) => setSourceKind(e.target.value)} className="rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
          <option value="">كل الأقسام</option>
          {SOURCE_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {questions?.map((q: any) => (
            <div key={q.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2 text-xs">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">{q.source_kind}</span>
                    <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">{q.question_type}</span>
                  </div>
                  <p className="font-medium leading-relaxed">{q.text}</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {(q.choices || []).sort((a:any,b:any)=>a.order_index-b.order_index).map((c: any) => (
                      <li key={c.id} className={c.is_correct ? "text-success" : "text-muted-foreground"}>
                        {c.is_correct ? "✓" : "·"} {c.text}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(q)} className="rounded p-1.5 hover:bg-accent"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(q.id)} className="rounded p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
          {questions?.length === 0 && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">لا توجد أسئلة. أضف سؤالاً جديداً.</p>}
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
    </AdminShell>
  );
}

function QuestionDialog({ initial, subjects, onClose, onSaved }: any) {
  const [text, setText] = useState(initial?.text || "");
  const [explanation, setExplanation] = useState(initial?.explanation || "");
  const [sourceKind, setSourceKind] = useState(initial?.source_kind || "question_bank");
  const [questionType, setQuestionType] = useState(initial?.question_type || "mcq");
  const [examYear, setExamYear] = useState(initial?.exam_year || "");
  const [subjectId, setSubjectId] = useState(initial?.subject_id || "");
  const [chapterId, setChapterId] = useState(initial?.chapter_id || "");
  const [lectureId, setLectureId] = useState(initial?.lecture_id || "");
  const [choices, setChoices] = useState<{ text: string; is_correct: boolean }[]>(
    initial?.choices?.length
      ? initial.choices.sort((a:any,b:any)=>a.order_index-b.order_index).map((c:any) => ({ text: c.text, is_correct: c.is_correct }))
      : [{ text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }]
  );
  const [saving, setSaving] = useState(false);

  const { data: chapters } = useQuery({
    queryKey: ["dlg_chapters", subjectId],
    queryFn: async () => subjectId ? (await supabase.from("chapters").select("id, name, name_ar").eq("subject_id", subjectId)).data || [] : [],
    enabled: !!subjectId,
  });
  const { data: lectures } = useQuery({
    queryKey: ["dlg_lectures", chapterId],
    queryFn: async () => chapterId ? (await supabase.from("lectures").select("id, name, name_ar").eq("chapter_id", chapterId)).data || [] : [],
    enabled: !!chapterId,
  });

  const save = async () => {
    if (!text.trim() || !subjectId) { toast.error("املأ نص السؤال واختر مادة"); return; }
    if (!choices.some(c => c.is_correct)) { toast.error("حدد إجابة صحيحة واحدة على الأقل"); return; }
    setSaving(true);
    try {
      const payload: any = {
        text, explanation: explanation || null,
        source_kind: sourceKind, question_type: questionType,
        exam_year: examYear ? Number(examYear) : null,
        subject_id: subjectId, chapter_id: chapterId || null, lecture_id: lectureId || null,
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
      const rows = choices.filter(c => c.text.trim()).map((c, i) => ({
        question_id: qid, text: c.text, is_correct: c.is_correct, order_index: i,
      }));
      const { error: cErr } = await supabase.from("choices").insert(rows);
      if (cErr) throw cErr;
      toast.success("تم الحفظ");
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-bold">{initial ? "تعديل السؤال" : "إضافة سؤال جديد"}</h3>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={subjectId} onChange={(e)=>{setSubjectId(e.target.value);setChapterId("");setLectureId("");}} className="rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
              <option value="">اختر المادة *</option>
              {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name_ar || s.name}</option>)}
            </select>
            <select value={chapterId} onChange={(e)=>{setChapterId(e.target.value);setLectureId("");}} disabled={!subjectId} className="rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
              <option value="">الشابتر (اختياري)</option>
              {chapters?.map((c: any) => <option key={c.id} value={c.id}>{c.name_ar || c.name}</option>)}
            </select>
            <select value={lectureId} onChange={(e)=>setLectureId(e.target.value)} disabled={!chapterId} className="rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
              <option value="">المحاضرة (اختياري)</option>
              {lectures?.map((l: any) => <option key={l.id} value={l.id}>{l.name_ar || l.name}</option>)}
            </select>
            <select value={sourceKind} onChange={(e)=>setSourceKind(e.target.value)} className="rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
              {SOURCE_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <select value={questionType} onChange={(e)=>setQuestionType(e.target.value)} className="rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
              <option value="mcq">MCQ</option>
              <option value="true_false">True/False</option>
              <option value="multiple_answers">Multiple Answers</option>
              <option value="clinical_case">Clinical Case</option>
            </select>
            <input placeholder="سنة الامتحان (للسنوات السابقة)" type="number" value={examYear} onChange={(e)=>setExamYear(e.target.value)} className="rounded-lg border border-input bg-input/30 px-3 py-2 text-sm" />
          </div>
          <textarea placeholder="نص السؤال *" value={text} onChange={(e)=>setText(e.target.value)} rows={3} className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm" />
          <textarea placeholder="شرح الإجابة (اختياري)" value={explanation} onChange={(e)=>setExplanation(e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm" />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">الاختيارات</label>
              <button onClick={() => setChoices([...choices, { text: "", is_correct: false }])} className="text-xs text-primary">+ إضافة اختيار</button>
            </div>
            {choices.map((c, i) => (
              <div key={i} className="mb-2 flex items-center gap-2">
                <input type="checkbox" checked={c.is_correct} onChange={(e) => {
                  const next = [...choices];
                  next[i].is_correct = e.target.checked;
                  setChoices(next);
                }} className="h-4 w-4 accent-primary" />
                <input value={c.text} onChange={(e) => { const n = [...choices]; n[i].text = e.target.value; setChoices(n); }} placeholder={`اختيار ${i+1}`} className="flex-1 rounded-lg border border-input bg-input/30 px-3 py-2 text-sm" />
                <button onClick={() => setChoices(choices.filter((_, x) => x !== i))} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">إلغاء</button>
          <button onClick={save} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {saving ? "..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}
