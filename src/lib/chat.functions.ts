import { createServerFn } from "@tanstack/react-start";

type Msg = { role: "user" | "assistant" | "system"; content: string };

export const chatWithAI = createServerFn({ method: "POST" })
  .inputValidator((data: { messages: Msg[] }) => {
    if (!Array.isArray(data?.messages)) throw new Error("messages must be an array");
    return data;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a friendly, helpful AI assistant inside the Medical Space learning platform. Answer any question clearly and concisely. Use markdown when helpful." },
          ...data.messages,
        ],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) throw new Error("Rate limit exceeded — please wait a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to your workspace.");
      throw new Error(`AI error (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    const reply: string = json?.choices?.[0]?.message?.content ?? "";
    return { reply };
  });
