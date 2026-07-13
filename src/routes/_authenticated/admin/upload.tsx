import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { Upload, FileText, Sparkles, Loader2, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

// ---------------- Rule-based parser ----------------
type ParsedRow = {
  question: string;
  A: string;
  B: string;
  C: string;
  D: string;
  answer: string;
  valid: boolean;
  reason?: string;
};

const OPTION_RE = /^\s*([A-Da-d])\s*[\.\)\:\-]\s*(.+?)\s*$/;
const ANSWER_RE = /^\s*(?:correct\s*answer|correct|answer|ans)\s*[\.\:\)\-]?\s*([A-Da-d])\b/i;
const NUMBERING_RE = /^\s*(?:q(?:uestion)?\s*)?\d+\s*[\.\)\:\-]\s*/i;

function optionLetter(line: string): string | null {
  const m = line.match(OPTION_RE);
  if (!m) return null;
  return m[1].toUpperCase();
}
function optionValue(line: string): string {
  const m = line.match(OPTION_RE);
  return m ? m[2].trim() : "";
}
function answerLetter(line: string): string | null {
  const m = line.match(ANSWER_RE);
  return m ? m[1].toUpperCase() : null;
}

export function parseQuestions(text: string): ParsedRow[] {
  const rawLines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0);

  const rows: ParsedRow[] = [];
  let i = 0;

  while (i < rawLines.length) {
    // Collect question text until we hit option A
    const qLines: string[] = [];
    while (i < rawLines.length && optionLetter(rawLines[i]) !== "A") {
      // Skip stray answer lines / stray B/C/D that appear before any A (garbage)
      const letter = optionLetter(rawLines[i]);
      if (letter && letter !== "A") { i++; continue; }
      if (answerLetter(rawLines[i])) { i++; continue; }
      qLines.push(rawLines[i]);
      i++;
    }
    if (i >= rawLines.length) break;
    if (qLines.length === 0) {
      // Option A without preceding question text
      i++;
      continue;
    }

    // Strip leading numbering from first line
    qLines[0] = qLines[0].replace(NUMBERING_RE, "");
    const question = qLines.join(" ").trim();

    const opts: Record<string, string> = { A: "", B: "", C: "", D: "" };
    // Consume A
    opts.A = optionValue(rawLines[i]);
    i++;
    // Consume up to B, C, D or answer or next A
    for (const want of ["B", "C", "D"] as const) {
      if (i < rawLines.length && optionLetter(rawLines[i]) === want) {
        opts[want] = optionValue(rawLines[i]);
        i++;
      }
    }
    // Answer
    let answer = "";
    if (i < rawLines.length) {
      const a = answerLetter(rawLines[i]);
      if (a) { answer = a; i++; }
    }

    let valid = true;
    let reason = "";
    if (!question) { valid = false; reason = "Missing question text"; }
    else if (!opts.A || !opts.B || !opts.C || !opts.D) { valid = false; reason = "Missing one or more options (A–D)"; }
    else if (!answer) { valid = false; reason = "Missing answer"; }
    else if (!["A", "B", "C", "D"].includes(answer)) { valid = false; reason = "Invalid answer letter"; }

    rows.push({ question, A: opts.A, B: opts.B, C: opts.C, D: opts.D, answer, valid, reason });
  }

  return rows;
}

async function sha256Hex(s: string): Promise<string> {
  const enc = new TextEncoder().encode(s.toLowerCase());
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------- Page ----------------
function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [yearId, setYearId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [lectureId, setLectureId] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [pasted, setPasted] = useState("");

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
    if (!subjectId || !sectionId) {
      toast.error("Pick a subject and section");
      return;
    }
    if (!file && !pasted.trim()) {
      toast.error("Pick a file or paste text");
      return;
    }
    setBusy(true);
    setLog([]);
    setRows([]);
    try {
      let text = pasted;
      if (file) {
        addLog(`Reading "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`);
        text = await readFileAsText(file);
      }
      if (!text.trim()) throw new Error("No text found");
      addLog(`Parsing ${text.length.toLocaleString()} chars with local rule-based parser…`);
      console.log("[upload] RAW TEXT sample:", text.slice(0, 300));
      const parsed = parseQuestions(text);
      console.log("[upload] PARSED rows:", parsed.length, parsed);
      addLog(`Parsed ${parsed.length} candidates (${parsed.filter((r) => r.valid).length} valid, ${parsed.filter((r) => !r.valid).length} invalid)`);
      setRows(parsed);
      console.log("[upload] setRows called with", parsed.length, "rows");
      if (!parsed.length) toast.warning("No questions detected");
      else toast.success(`Parsed ${parsed.length} questions — review & Save All`);
      // Scroll preview into view so users see the table right away
      setTimeout(() => {
        const el = document.getElementById("parse-preview");
        console.log("[upload] preview element found?", !!el);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    } catch (e: any) {
      const msg = e?.message || "Parse failed";
      addLog(`ERROR: ${msg}`);
      toast.error(msg, { duration: 8000 });
    } finally {
      setBusy(false);
    }
  };

  const updateRow = (idx: number, field: keyof ParsedRow, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      const r = { ...next[idx], [field]: field === "answer" ? value.toUpperCase() : value } as ParsedRow;
      // Re-validate
      let valid = true;
      let reason = "";
      if (!r.question.trim()) { valid = false; reason = "Missing question text"; }
      else if (!r.A.trim() || !r.B.trim() || !r.C.trim() || !r.D.trim()) { valid = false; reason = "Missing one or more options (A–D)"; }
      else if (!["A", "B", "C", "D"].includes(r.answer)) { valid = false; reason = "Invalid answer letter"; }
      r.valid = valid;
      r.reason = reason;
      next[idx] = r;
      return next;
    });
  };

  const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const saveAll = async () => {
    const valid = rows.filter((r) => r.valid);
    if (!valid.length) { toast.error("No valid questions to save"); return; }
    if (!subjectId || !sectionId) { toast.error("Pick a subject & section first"); return; }
    setSaving(true);
    let imported = 0, skipped = 0;
    const errors: string[] = [];
    try {
      for (const r of valid) {
        try {
          const hash = await sha256Hex(r.question);
          const { data: existing } = await supabase.from("questions").select("id").eq("hash", hash).maybeSingle();
          let qid: string;
          if (existing) {
            qid = existing.id;
            skipped++;
          } else {
            const correctText = (r as any)[r.answer] as string;
            const { data: inserted, error: qErr } = await supabase.from("questions").insert({
              subject_id: subjectId,
              section_id: sectionId,
              lecture_id: lectureId || null,
              source_kind: (selectedSection?.kind as string) || "question_bank",
              question_type: "mcq",
              text: r.question,
              explanation: `Correct answer: ${r.answer}. ${correctText}`,
              hash,
            } as any).select("id").single();
            if (qErr || !inserted) { skipped++; errors.push(qErr?.message || "insert failed"); continue; }
            qid = inserted.id;
            const choiceRows = (["A", "B", "C", "D"] as const).map((letter, i) => ({
              question_id: qid,
              text: (r as any)[letter] as string,
              is_correct: r.answer === letter,
              order_index: i,
            }));
            const { error: cErr } = await supabase.from("choices").insert(choiceRows);
            if (cErr) errors.push(`Choices: ${cErr.message}`);
            imported++;
          }
          if (lectureId) {
            await supabase.from("question_lectures" as any).upsert(
              { question_id: qid, lecture_id: lectureId },
              { onConflict: "question_id,lecture_id" } as any,
            );
          }
        } catch (e: any) {
          skipped++;
          errors.push(e?.message || "row error");
        }
      }
      toast.success(`Saved ${imported} new, ${skipped} skipped${errors.length ? ` (${errors.length} warnings)` : ""}`);
      if (errors.length) console.warn("[upload] save warnings:", errors.slice(0, 10));
      setRows([]);
      setFile(null);
      setPasted("");
    } finally {
      setSaving(false);
    }
  };

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.length - validCount;

  return (
    <AdminShell>
      <h1 className="mb-2 text-3xl font-bold">Extract Questions</h1>
      <p className="mb-8 text-sm text-muted-foreground">Local rule-based parser. Pick a destination, upload a file or paste text, review, then Save All.</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Sel value={yearId} onChange={(v) => { setYearId(v); setModuleId(""); setSubjectId(""); setSectionId(""); setLectureId(""); }} label="Year" options={years} />
        <Sel value={moduleId} onChange={(v) => { setModuleId(v); setSubjectId(""); setSectionId(""); setLectureId(""); }} label="Module" options={modules} disabled={!yearId} />
        <Sel value={subjectId} onChange={(v) => { setSubjectId(v); setSectionId(""); setLectureId(""); }} label="Subject *" options={subjects} disabled={!moduleId} />
        <Sel value={sectionId} onChange={(v) => { setSectionId(v); setLectureId(""); }} label="Section *" options={sections} disabled={!subjectId} />
        <Sel value={lectureId} onChange={setLectureId} label="Lecture (optional)" options={lectures} disabled={!sectionId} />
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-3 font-semibold">Pick a file or paste text</h3>
        <p className="text-xs text-muted-foreground">PDF, DOCX, TXT — parsed locally, no AI</p>
        <input type="file" accept=".pdf,.docx,.txt,.json,.md" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-4 mx-auto block text-sm" />
        {file && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
            <FileText className="h-4 w-4" /> {file.name}
          </div>
        )}
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="…or paste question text here"
          className="mt-4 min-h-32 w-full max-w-3xl mx-auto block rounded-lg border border-input bg-input/30 px-3 py-2 text-sm"
        />
        <div className="mt-4">
          <button disabled={(!file && !pasted.trim()) || !subjectId || !sectionId || busy} onClick={run} className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Parsing..." : "Parse questions"}
          </button>
        </div>
      </div>

      {log.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parser log</div>
          <pre className="max-h-48 overflow-auto text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap">{log.join("\n")}</pre>
        </div>
      )}

      {rows.length > 0 && (
        <div id="parse-preview" className="mt-8 scroll-mt-24">
          <div className="mb-2 text-xs text-muted-foreground">Preview ({rows.length} rows in state)</div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-semibold">{rows.length}</span> parsed ·{" "}
              <span className="text-emerald-500">{validCount} valid</span> ·{" "}
              <span className="text-destructive">{invalidCount} invalid</span>
            </div>
            <button
              onClick={saveAll}
              disabled={saving || !validCount}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save All ({validCount})
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-2 text-left">#</th>
                  <th className="p-2 text-left min-w-64">Question</th>
                  <th className="p-2 text-left">A</th>
                  <th className="p-2 text-left">B</th>
                  <th className="p-2 text-left">C</th>
                  <th className="p-2 text-left">D</th>
                  <th className="p-2 text-left">Answer</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} className={`border-t border-border ${r.valid ? "" : "bg-destructive/5"}`}>
                    <td className="p-2 align-top text-xs text-muted-foreground">{idx + 1}</td>
                    <td className="p-2 align-top">
                      <textarea value={r.question} onChange={(e) => updateRow(idx, "question", e.target.value)} className="w-full min-w-64 rounded border border-input bg-input/20 px-2 py-1 text-sm" rows={2} />
                    </td>
                    {(["A", "B", "C", "D"] as const).map((L) => (
                      <td key={L} className="p-2 align-top">
                        <input value={r[L]} onChange={(e) => updateRow(idx, L, e.target.value)} className="w-32 rounded border border-input bg-input/20 px-2 py-1 text-sm" />
                      </td>
                    ))}
                    <td className="p-2 align-top">
                      <select value={r.answer} onChange={(e) => updateRow(idx, "answer", e.target.value)} className="rounded border border-input bg-input/20 px-2 py-1 text-sm">
                        <option value="">—</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </td>
                    <td className="p-2 align-top text-xs">
                      {r.valid ? (
                        <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-500">Valid</span>
                      ) : (
                        <span className="rounded bg-destructive/15 px-2 py-0.5 text-destructive" title={r.reason}>{r.reason || "Invalid"}</span>
                      )}
                    </td>
                    <td className="p-2 align-top">
                      <button onClick={() => removeRow(idx)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
