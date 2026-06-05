import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM = `You extract exam questions from raw text. Output STRICT JSON only:
{"questions":[{"text":"...","type":"mcq"|"written","explanation":"...","choices":[{"text":"...","is_correct":true|false}]}]}
Rules:
- For MCQ: provide all choices with exactly one (or several) is_correct=true. explanation = brief rationale.
- For written/short-answer questions: type="written", omit choices, put the model answer in "explanation".
- Skip page numbers, headers, watermarks, decorative text.
- Deduplicate. Preserve original wording. Output ONLY valid JSON, no markdown fences.`;

export const extractQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string; subjectId: string; sourceKind: string; defaultType?: "mcq" | "written" }) => {
    if (!input.text || input.text.length < 20) throw new Error("Text too short");
    if (input.text.length > 200000) throw new Error("Text too large (max 200k chars)");
    if (!input.subjectId) throw new Error("subjectId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Default question type when ambiguous: ${data.defaultType || "mcq"}.\n\nTEXT:\n${data.text}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`AI gateway error ${resp.status}: ${t.slice(0, 200)}`);
    }
    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { throw new Error("AI returned invalid JSON"); }
    const items = (parsed.questions || []) as any[];
    if (!items.length) return { imported: 0, skipped: 0, total: 0 };

    const { supabase } = context;
    let imported = 0, skipped = 0;
    for (const q of items) {
      const text = String(q.text || "").trim();
      if (!text) { skipped++; continue; }
      const type = q.type === "written" ? "written" : "mcq";
      const explanation = q.explanation ? String(q.explanation) : null;
      // Simple hash for dedupe
      const enc = new TextEncoder().encode(text.toLowerCase());
      const hashBuf = await crypto.subtle.digest("SHA-256", enc);
      const hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

      const { data: existing } = await supabase.from("questions").select("id").eq("hash", hash).maybeSingle();
      if (existing) { skipped++; continue; }

      const { data: inserted, error: qErr } = await supabase.from("questions").insert({
        subject_id: data.subjectId,
        source_kind: data.sourceKind as any,
        question_type: type as any,
        text, explanation, hash,
      }).select("id").single();
      if (qErr || !inserted) { skipped++; continue; }

      if (type === "mcq" && Array.isArray(q.choices) && q.choices.length) {
        const rows = q.choices.map((c: any, i: number) => ({
          question_id: inserted.id,
          text: String(c.text || ""),
          is_correct: !!c.is_correct,
          order_index: i,
        })).filter((r: any) => r.text);
        if (rows.length) await supabase.from("choices").insert(rows);
      }
      imported++;
    }
    return { imported, skipped, total: items.length };
  });
