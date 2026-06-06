import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, X, Send, Trash2, Loader2 } from "lucide-react";
import { chatWithAI } from "@/lib/chat.functions";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };
const STORAGE_KEY = "ms_chat_history_v1";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const send = useServerFn(chatWithAI);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMsgs(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const { reply } = await send({ data: { messages: next } });
      setMsgs(m => [...m, { role: "assistant", content: reply || "(empty response)" }]);
    } catch (err: any) {
      toast.error(err?.message ?? "Chat failed");
      setMsgs(m => [...m, { role: "assistant", content: "Sorry, something went wrong." }]);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => { setMsgs([]); localStorage.removeItem(STORAGE_KEY); };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open AI assistant"
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow transition hover:scale-105 active:scale-95"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      <div
        className={`fixed bottom-24 right-5 z-50 flex w-[calc(100vw-2.5rem)] max-w-sm origin-bottom-right flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elegant transition-all duration-200 ${
          open ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
        style={{ height: "min(540px, calc(100vh - 8rem))" }}
      >
        <div className="flex items-center justify-between border-b border-border bg-background/60 px-4 py-3">
          <div>
            <div className="text-sm font-semibold">AI Assistant</div>
            <div className="text-[11px] text-muted-foreground">Ask anything</div>
          </div>
          <button onClick={clear} title="Clear chat" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {msgs.length === 0 && (
            <div className="grid h-full place-items-center text-center text-xs text-muted-foreground">
              <div>
                <MessageCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
                Start the conversation — ask me anything.
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-muted text-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={submit} className="flex items-center gap-2 border-t border-border bg-background/60 p-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </>
  );
}
