import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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

const SOURCE_KINDS = [
  { v: "question_bank", l: "Question Bank" },
  { v: "formative", l: "Formative" },
  { v: "previous_years", l: "Previous Years" },
  { v: "mock_exam", l: "Mock Exams" },
  { v: "revision", l: "Revision" },
  { v: "practical", l: "Practical" },
  { v: "spotters", l: "Spotters" },
  { v: "assignments", l: "Assignments" },
  { v: "ospe", l: "Written" },
  { v: "custom", l: "Custom" },
];

async function readFileAsText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "txt" || ext === "json" || ext === "md") return await file.text();
  if (ext === "pdf") {
    // @ts-ignore - dynamic CDN load
    const pdfjs: any = await import(/* @vite-ignore */ "https://esm.sh/pdfjs-dist@4.7.76/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.7.76/build/pdf.worker.mjs";
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
    const m: any = await import(/* @vite-ignore */ "https://esm.sh/mammoth@1.8.0/mammoth.browser.min.js");
    const buf = await file.arrayBuffer();
    const r = await m.extractRawText({ arrayBuffer: buf });
    return r.value;
  }
  throw new Error("Unsupported file type. Use PDF, DOCX, TXT, or JSON.");
}

function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [sourceKind, setSourceKind] = useState("question_bank");
  const [defaultType, setDefaultType] = useState<"mcq" | "written">("mcq");
  const extract = useServerFn(extractQuestions);

  const { data: subjects } = useQuery({
    queryKey: ["subjects_upload"],
    queryFn: async () => (await supabase.from("subjects").select("id, name").order("name")).data || [],
  });

  const run = async () => {
    if (!file || !subjectId) { toast.error("Pick a file and a subject"); return; }
    setBusy(true);
    try {
      toast.info("Reading file...");
      const text = await readFileAsText(file);
      if (!text.trim()) throw new Error("No text could be extracted");
      toast.info(`Extracted ${text.length.toLocaleString()} characters. Sending to AI...`);
      const result = await extract({ data: { text: text.slice(0, 180000), subjectId, sourceKind, defaultType } });
      toast.success(`Imported ${result.imported} questions (${result.skipped} skipped, ${result.total} found).`);
      setFile(null);
    } catch (e: any) {
      toast.error(e.message || "Extraction failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell>
      <h1 className="mb-2 text-3xl font-bold">AI Upload &amp; Extract</h1>
      <p className="mb-8 text-sm text-muted-foreground">Upload a PDF, DOCX, or TXT. The AI parses it and inserts the questions directly into the chosen subject and section.</p>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Subject</label>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
            <option value="">Select a subject</option>
            {subjects?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Section</label>
          <select value={sourceKind} onChange={(e) => setSourceKind(e.target.value)} className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
            {SOURCE_KINDS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Default question type</label>
          <select value={defaultType} onChange={(e) => setDefaultType(e.target.value as any)} className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm">
            <option value="mcq">MCQ</option>
            <option value="written">Written</option>
          </select>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 font-semibold">Pick a file</h3>
        <p className="text-xs text-muted-foreground">PDF, DOCX, TXT, JSON · up to ~180k characters</p>
        <input
          type="file"
          accept=".pdf,.docx,.txt,.json,.md"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mt-4 mx-auto block text-sm"
        />
        {file && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
            <FileText className="h-4 w-4" /> {file.name}
          </div>
        )}
        <div className="mt-6">
          <button
            disabled={!file || !subjectId || busy}
            onClick={run}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Extracting..." : "Extract &amp; import questions"}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
        <div className="flex items-center gap-2 font-semibold text-primary">
          <Sparkles className="h-4 w-4" /> Powered by Lovable AI (Gemini 2.5 Flash)
        </div>
        <p className="mt-1 text-muted-foreground">
          PDFs are parsed in your browser, then questions are extracted by AI and inserted into the database. Duplicates (same wording) are skipped automatically.
        </p>
      </div>
    </AdminShell>
  );
}
