import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { BookOpen, FolderOpen, Play, FileText, ScrollText } from "lucide-react";
import { MistakesSection } from "@/components/mistakes-section";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/subject/$subjectId")({
  component: SubjectPage,
});

function SubjectPage() {
  const { subjectId } = Route.useParams();
  const navigate = useNavigate();

  const { data: subject } = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, description, sections(id, name, kind, order_index, deleted_at, lectures(id, name, order_index, deleted_at))")
        .eq("id", subjectId)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const startQuiz = async (filters: { lecture_id?: string; section_id?: string; source_kind?: string; title?: string }) => {
    let ids: string[] = [];
    if (filters.lecture_id) {
      // pull through reuse junction so the same question appears across lectures
      const { data } = await supabase
        .from("question_lectures" as any)
        .select("question_id, questions!inner(id, deleted_at)")
        .eq("lecture_id", filters.lecture_id)
        .limit(500);
      ids = ((data as any[]) || [])
        .filter((r) => !r.questions?.deleted_at)
        .map((r) => r.question_id);
    } else {
      let q = supabase.from("questions").select("id").eq("subject_id", subjectId).is("deleted_at", null);
      if (filters.section_id) q = q.eq("section_id", filters.section_id);
      if (filters.source_kind) q = q.eq("source_kind", filters.source_kind as any);
      const { data } = await q.limit(500);
      ids = (data || []).map((x) => x.id);
    }
    if (!ids.length) {
      toast.error("No questions in this selection yet.");
      return;
    }
    ids.sort(() => Math.random() - 0.5);
    sessionStorage.setItem("quiz_ids", JSON.stringify(ids));
    sessionStorage.setItem("quiz_meta", JSON.stringify({ subjectId, ...filters, title: filters.title || subject?.name }));
    navigate({ to: "/app/quiz" });
  };

  const sections = ((subject as any)?.sections || [])
    .filter((s: any) => !s.deleted_at)
    .sort((a: any, b: any) => a.order_index - b.order_index);

  return (
    <AppShell>
      <div className="mb-6">
        <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
        <h1 className="mt-2 text-3xl font-bold">{subject?.name || "..."}</h1>
        {subject?.description && <p className="mt-1 text-sm text-muted-foreground">{subject.description}</p>}
      </div>

      <h2 className="mb-3 text-lg font-semibold">Sections</h2>
      <div className="mb-10 space-y-3">
        {sections.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No sections yet. An admin can add Question Bank, Formatives, OSPE, Past Papers, or any custom section.
          </p>
        )}
        {sections.map((sec: any) => {
          const lectures = (sec.lectures || [])
            .filter((l: any) => !l.deleted_at)
            .sort((a: any, b: any) => a.order_index - b.order_index);
          return (
            <details key={sec.id} className="rounded-xl border border-border bg-card" open>
              <summary className="flex cursor-pointer items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <FolderOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold">{sec.name}</div>
                    <div className="text-xs text-muted-foreground">{lectures.length} lecture{lectures.length === 1 ? "" : "s"}</div>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); startQuiz({ section_id: sec.id, title: `${subject?.name} · ${sec.name}` }); }}
                  className="rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Section exam
                </button>
              </summary>
              <div className="border-t border-border p-3">
                {lectures.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">No lectures yet</p>
                ) : (
                  <ul className="space-y-1">
                    {lectures.map((lec: any) => (
                      <li key={lec.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-accent">
                        <span className="flex items-center gap-2 text-sm">
                          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" /> {lec.name}
                        </span>
                        <button
                          onClick={() => startQuiz({ lecture_id: lec.id, title: `${subject?.name} · ${lec.name}` })}
                          className="flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                        >
                          <Play className="h-3 w-3" /> Start
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          );
        })}
      </div>

      <MistakesSection subjectId={subjectId} />
    </AppShell>
  );
}
