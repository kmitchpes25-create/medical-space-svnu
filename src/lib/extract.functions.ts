import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM = `You extract exam questions from raw text. Output STRICT JSON only.
Schema: {"questions":[{"text":"...","type":"mcq"|"written","explanation":"...","choices":[{"text":"...","is_correct":true|false}]}]}
Rules:
- For MCQ: include all options; mark the correct one(s) with is_correct=true. Put a short rationale in "explanation".
- For written/short-answer: type="written", omit "choices", put the model answer in "explanation".
- Skip page numbers, headers, watermarks, decorative text.
- Deduplicate. Preserve original wording. Output ONLY a valid JSON object (no markdown fences, no prose).`;

// Robust JSON extraction: strips fences, finds {...} or [...] braces, accepts both shapes.
function extractJSON(raw: string): any {
  let s = String(raw || "").trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  if (!s) throw new Error("AI returned empty content");
  if (!(s.startsWith("{") || s.startsWith("["))) {
    const objStart = s.indexOf("{");
    const arrStart = s.indexOf("[");
    const isArr = arrStart !== -1 && (objStart === -1 || arrStart < objStart);
    const start = isArr ? arrStart : objStart;
    const end = isArr ? s.lastIndexOf("]") : s.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error(`No JSON braces found. Raw head: ${s.slice(0, 200)}`);
    s = s.slice(start, end + 1);
  }
  try { return JSON.parse(s); }
  catch (e: any) { throw new Error(`JSON.parse failed: ${e.message}. Head: ${s.slice(0, 200)}`); }
}

function normalizeQuestions(parsed: any): any[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
  if (parsed && Array.isArray(parsed.items)) return parsed.items;
  if (parsed && Array.isArray(parsed.data)) return parsed.data;
  throw new Error(`Parsed JSON has no questions array. Top-level keys: ${Object.keys(parsed || {}).join(",") || "none"}`);
}

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

    console.log("[extract] step 2 — sending AI request", { chars: data.text.length, subjectId: data.subjectId, sourceKind: data.sourceKind });

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
      if (resp.status === 429) throw new Error("Rate limit hit. Please try again in a minute.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Please add credits to your workspace.");
      throw new Error(`AI gateway error ${resp.status}: ${t.slice(0, 300)}`);
    }
    const json = await resp.json();
    const finish = json.choices?.[0]?.finish_reason;
    const content: string = json.choices?.[0]?.message?.content || "";
    console.log("[extract] step 3 — AI response received", { finish_reason: finish, content_length: content.length, head: content.slice(0, 300) });

    if (finish === "length") {
      console.warn("[extract] response truncated by token limit — output may be incomplete");
    }

    let parsed: any;
    try {
      parsed = extractJSON(content);
    } catch (e: any) {
      console.error("[extract] step 4 — JSON parse failed", e.message);
      throw new Error(`Could not parse AI JSON: ${e.message}`);
    }
    const items = normalizeQuestions(parsed);
    console.log("[extract] step 4 — JSON parsed", { totalQuestions: items.length });
    if (!items.length) return { imported: 0, skipped: 0, total: 0, errors: ["No questions found in AI output"] };

    const { supabase } = context;
    let imported = 0, skipped = 0;
    const errors: string[] = [];
    for (const q of items) {
      try {
        const text = String(q.text || q.question || "").trim();
        if (!text) { skipped++; errors.push("Empty question text"); continue; }
        const type = q.type === "written" ? "written" : "mcq";
        const explanation = q.explanation ? String(q.explanation) : null;
        const choices = Array.isArray(q.choices) ? q.choices : Array.isArray(q.options) ? q.options : [];

        if (type === "mcq") {
          if (!choices.length) { skipped++; errors.push(`MCQ missing choices: ${text.slice(0,60)}`); continue; }
          if (!choices.some((c: any) => c.is_correct || c.correct)) {
            skipped++; errors.push(`No correct answer marked: ${text.slice(0,60)}`); continue;
          }
        }

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
        if (qErr || !inserted) { skipped++; errors.push(`DB insert failed: ${qErr?.message || "unknown"}`); continue; }

        if (type === "mcq") {
          const rows = choices.map((c: any, i: number) => ({
            question_id: inserted.id,
            text: String(c.text || c.label || ""),
            is_correct: !!(c.is_correct || c.correct),
            order_index: i,
          })).filter((r: any) => r.text);
          if (rows.length) {
            const { error: cErr } = await supabase.from("choices").insert(rows);
            if (cErr) errors.push(`Choices insert failed: ${cErr.message}`);
          }
        }
        imported++;
      } catch (e: any) {
        skipped++;
        errors.push(`Item error: ${e.message}`);
      }
    }
    console.log("[extract] step 5 — saved", { imported, skipped, total: items.length, errorSample: errors.slice(0, 5) });
    return { imported, skipped, total: items.length, errors };
  });
