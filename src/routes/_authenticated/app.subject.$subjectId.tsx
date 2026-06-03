import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { BookOpen, FileQuestion, Brain, History as HistoryIcon, ClipboardCheck, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/subject/$subjectId")({
  component: SubjectPage,
});

const sectionCards = [
  { kind: "question_bank", label: "بنك الأسئلة", icon: FileQuestion, color: "text-primary" },
  { kind: "formative", label: "Formative", icon: Brain, color: "text-warning" },
  { kind: "previous_years", label: "السنوات السابقة", icon: HistoryIcon, color: "text-success" },
  { kind: "mock_exam", label: "Mock Exams", icon: ClipboardCheck, color: "text-primary" },
  { kind: "revision", label: "مراجعة", icon: Star, color: "text-warning" },
  { kind: "practical", label: "Practical", icon: BookOpen, color: "text-success" },
  { kind: "spotters", label: "Spotters", icon: BookOpen, color: "text-primary" },
  { kind: "ospe", label: "OSPE", icon: BookOpen, color: "text-warning" },
  { kind: "assignments", label: "Assignments", icon: BookOpen, color: "text-success" },
];

function SubjectPage() {
  const { subjectId } = Route.useParams();
  const navigate = useNavigate();

  const { data: subject } = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*, chapters(id, name, name_ar, order_index, lectures(id, name, name_ar, order_index))").eq("id", subjectId).single();
      if (error) throw error;
      return data;
    },
  });

  const startQuiz = async (filters: { source_kind?: string; chapter_id?: string; lecture_id?: string }) => {
    let q = supabase.from("questions").select("id").eq("subject_id", subjectId);
    if (filters.source_kind) q = q.eq("source_kind", filters.source_kind as any);
    if (filters.chapter_id) q = q.eq("chapter_id", filters.chapter_id);
    if (filters.lecture_id) q = q.eq("lecture_id", filters.lecture_id);
    const { data } = await q.limit(50);
    const ids = (data || []).map((x) => x.id);
    if (!ids.length) {
      alert("لا توجد أسئلة بعد في هذا القسم.");
      return;
    }
    sessionStorage.setItem("quiz_ids", JSON.stringify(ids));
    sessionStorage.setItem("quiz_meta", JSON.stringify({ subjectId, ...filters, title: subject?.name_ar || subject?.name }));
    navigate({ to: "/app/quiz" });
  };

  return (
    <AppShell>
      <div className="mb-6">
        <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground">← الرئيسية</Link>
        <h1 className="mt-2 text-3xl font-bold">{subject?.name_ar || subject?.name || "..."}</h1>
        {subject?.description && <p className="mt-1 text-sm text-muted-foreground">{subject.description}</p>}
      </div>

      <h2 className="mb-3 text-lg font-semibold">الأقسام التعليمية</h2>
      <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sectionCards.map((s) => (
          <button
            key={s.kind}
            onClick={() => startQuiz({ source_kind: s.kind })}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-right transition hover:border-primary/50"
          >
            <div className={`grid h-10 w-10 place-items-center rounded-lg bg-primary/10 ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <span className="font-medium">{s.label}</span>
          </button>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-semibold">الشابترز والمحاضرات</h2>
      <div className="space-y-3">
        {(subject?.chapters || []).sort((a: any, b: any) => a.order_index - b.order_index).map((ch: any) => (
          <details key={ch.id} className="rounded-xl border border-border bg-card">
            <summary className="flex cursor-pointer items-center justify-between p-4 font-medium">
              <span>{ch.name_ar || ch.name}</span>
              <button
                onClick={(e) => { e.preventDefault(); startQuiz({ chapter_id: ch.id }); }}
                className="rounded-md bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary hover:text-primary-foreground"
              >
                اختبار الشابتر
              </button>
            </summary>
            <div className="border-t border-border p-3">
              {(ch.lectures || []).length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">لا توجد محاضرات بعد</p>
              ) : (
                <ul className="space-y-1">
                  {ch.lectures.sort((a: any, b: any) => a.order_index - b.order_index).map((lec: any) => (
                    <li key={lec.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-accent">
                      <span className="text-sm">{lec.name_ar || lec.name}</span>
                      <button
                        onClick={() => startQuiz({ lecture_id: lec.id })}
                        className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                      >
                        ابدأ Quiz
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        ))}
        {!(subject?.chapters || []).length && (
          <p className="text-sm text-muted-foreground">لا توجد شابترز بعد.</p>
        )}
      </div>
    </AppShell>
  );
}
