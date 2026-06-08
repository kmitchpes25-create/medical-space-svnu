import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin-shell";
import { Upload, FileText, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractQuestions } from "@/lib/extract.functions";

export const Route = createFileRoute("/_authenticated/admin/upload")({
  component: UploadPage,
});

async function readFileAsText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "txt" || ext === "json" || ext === "md") return await file.text();
  if (ext === "pdf") {
    const pdfjs: any = await import("pdfjs-dist");
    // @ts-ignore
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    let out = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      out += tc.items.map((it: any) => it.str).join(" ") + "\n\n";
    }
    return out;
  }
  if (ext === "docx") {
    // @ts-ignore
    const mammoth: any = await import("mammoth/mammoth.browser");
    const buf = await file.arrayBuffer();
    const r = await mammoth.extractRawText({ arrayBuffer: buf });
    return r.value;
  }
  throw new Error("Unsupported file type. Use PDF, DOCX, TXT, or JSON.");
}

function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [yearId, setYearId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [lectureId, setLectureId] = useState("");
  const [defaultType, setDefaultType] = useState<"mcq" | "written">("mcq");
  const extract = useServerFn(extractQuestions);

  const { data: tree } = useQuery({
    queryKey: ["upload_tree"],
    queryFn: async () => {
      const { data } = await supabase
        .from("academic_years")
        .select("id, name, order_index, semesters(id, name, order_index, subjects(id, name, order_index, sections(id, name, kind, order_index, lectures(id, name, order_index))))")
        .is("deleted_at", null)
        .order("order_index");
      return data || [];
    },
  });

  const years = (tree || []) as any[];
  const modules = useMemo(() => years.find((y) => y.id === yearId)?.semesters || [], [years, yearId]);
  const subjects = useMemo(() => modules.find((m: any) => m.id === moduleId)?.subjects || [], [modules, moduleId]);
  const sections = useMemo(() => subjects.find((s: any) => s.id === subjectId)?.sections || [], [subjects, subjectId]);
  const lectures = useMemo(() => sections.find((s: any) => s.id === sectionId)?.lectures || [], [sections, sectionId]);

  const selectedSection = sections.find((s: any) => s.id === sectionId);

  const [log, setLog] = useState<string[]>([]);
  const addLog = (m: string) => { console.log("[upload]", m); setLog((p) => [...p, `${new Date().toLocaleTimeString()} — ${m}`]); };

  const run = async () => {
    if (!file || !subjectId || !sectionId) {
      toast.error("Pick a file, subject, and section");
      return;
    }
    setBusy(true);
    setLog([]);
    try {
      addLog(`Step 1: reading "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`);
      const text = await readFileAsText(file);
      if (!text.trim()) throw new Error("No text could be extracted");
      addLog(`Step 1 done: ${text.length.toLocaleString()} characters`);

      addLog(`Step 2: sending to AI (Gemini 2.5 Flash)…`);
      const result = await extract({
        data: {
          text: text.slice(0, 180000),
          subjectId,
          sectionId,
          lectureId: lectureId || undefined,
          sourceKind: (selectedSection?.kind as string) || "question_bank",
          defaultType,
        },
      });
      addLog(`Steps 3–4: AI returned ${result.total} questions, JSON parsed`);
      addLog(`Step 5: saved ${result.imported} new, ${result.skipped} skipped`);
      if (result.errors?.length) addLog(`Warnings: ${result.errors.slice(0, 3).join(" | ")}`);
      addLog(`Step 6: questions are now available in the chosen lecture/section.`);
      toast.success(`Imported ${result.imported} of ${result.total}`);
      setFile(null);
    } catch (e: any) {
      const msg = e?.message || "Extraction failed";
      addLog(`ERROR: ${msg}`);
      toast.error(msg, { duration: 8000 });
      console.error("[upload] error:", e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell>
      <h1 className="mb-2 text-3xl font-bold">AI Upload &amp; Extract</h1>
      <p className="mb-8 text-sm text-muted-foreground">Pick a destination (Year → Module → Subject → Section → Lecture), then upload a file.</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Sel value={yearId} onChange={(v) => { setYearId(v); setModuleId(""); setSubjectId(""); setSectionId(""); setLectureId(""); }} label="Year" options={years} />
        <Sel value={moduleId} onChange={(v) => { setModuleId(v); setSubjectId(""); setSectionId(""); setLectureId(""); }} label="Module" options={modules} disabled={!yearId} />
        <Sel value={subjectId} onChange={(v) => { setSubjectId(v); setSectionId(""); setLectureId(""); }} label="Subject *" options={subjects} disabled={!moduleId} />
        <Sel value={sectionId} onChange={(v) => { setSectionId(v); setLectureId(""); }} label="Section *" options={sections} disabled={!subjectId} />
        <Sel value={lectureId} onChange={setLectureId} label="Lecture (optional)" options={lectures} disabled={!sectionId} />
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Default question type when ambiguous</label>
        <select value={defaultType} onChange={(e) => setDefaultType(e.target.value as any)} className="rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
          <option value="mcq">MCQ</option>
          <option value="written">Written</option>
        </select>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 font-semibold">Pick a file</h3>
        <p className="text-xs text-muted-foreground">PDF, DOCX, TXT, JSON · up to ~180k characters</p>
        <input type="file" accept=".pdf,.docx,.txt,.json,.md" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-4 mx-auto block text-sm" />
        {file && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
            <FileText className="h-4 w-4" /> {file.name}
          </div>
        )}
        <div className="mt-6">
          <button disabled={!file || !subjectId || !sectionId || busy} onClick={run} className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Extracting..." : "Extract & import questions"}
          </button>
        </div>
      </div>

      {log.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pipeline log</div>
          <pre className="max-h-64 overflow-auto text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap">{log.join("\n")}</pre>
        </div>
      )}
    </AdminShell>
  );
}

function Sel({ value, onChange, label, options, disabled }: { value: string; onChange: (v: string) => void; label: string; options: any[]; disabled?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm disabled:opacity-50">
        <option value="">{disabled ? "—" : `Select ${label}`}</option>
        {[...(options || [])].sort((a: any, b: any) => a.order_index - b.order_index).map((o: any) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    </div>
  );
}
