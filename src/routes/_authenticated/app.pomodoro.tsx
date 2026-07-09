import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, RotateCcw, Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/pomodoro")({
  component: PomodoroPage,
});

type Mode = "focus" | "short" | "long";
const DURATIONS: Record<Mode, number> = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
const LABELS: Record<Mode, string> = { focus: "Focus", short: "Short Break", long: "Long Break" };
const STORAGE_KEY = "pomodoro_state_v1";

function beep() {
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    o.start(); o.stop(ctx.currentTime + 1.25);
  } catch { /* noop */ }
}

function PomodoroPage() {
  const [mode, setMode] = useState<Mode>("focus");
  const [remaining, setRemaining] = useState<number>(DURATIONS.focus);
  const [running, setRunning] = useState(false);
  const endAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  // hydrate from storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.mode) setMode(s.mode);
      if (s.running && s.endAt) {
        const rem = Math.max(0, Math.round((s.endAt - Date.now()) / 1000));
        setRemaining(rem);
        if (rem > 0) {
          endAtRef.current = s.endAt;
          setRunning(true);
        }
      } else if (typeof s.remaining === "number") {
        setRemaining(s.remaining);
      }
    } catch { /* noop */ }
  }, []);

  const persist = useCallback((state: { mode: Mode; running: boolean; remaining: number; endAt: number | null }) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* noop */ }
  }, []);

  // tick using requestAnimationFrame + wall clock (accurate across tab throttling)
  useEffect(() => {
    if (!running) return;
    firedRef.current = false;
    const tick = () => {
      if (endAtRef.current == null) return;
      const rem = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) {
        if (!firedRef.current) {
          firedRef.current = true;
          beep();
          try {
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("Pomodoro", { body: `${LABELS[mode]} finished!` });
            }
          } catch { /* noop */ }
        }
        setRunning(false);
        endAtRef.current = null;
        persist({ mode, running: false, remaining: 0, endAt: null });
        return;
      }
      rafRef.current = window.setTimeout(tick, 250) as unknown as number;
    };
    tick();
    return () => { if (rafRef.current) clearTimeout(rafRef.current); };
  }, [running, mode, persist]);

  const start = () => {
    if (remaining <= 0) return;
    // notification permission
    try {
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    } catch { /* noop */ }
    const endAt = Date.now() + remaining * 1000;
    endAtRef.current = endAt;
    setRunning(true);
    persist({ mode, running: true, remaining, endAt });
  };
  const pause = () => {
    setRunning(false);
    endAtRef.current = null;
    persist({ mode, running: false, remaining, endAt: null });
  };
  const reset = () => {
    setRunning(false);
    endAtRef.current = null;
    setRemaining(DURATIONS[mode]);
    persist({ mode, running: false, remaining: DURATIONS[mode], endAt: null });
  };
  const switchMode = (m: Mode) => {
    setRunning(false);
    endAtRef.current = null;
    setMode(m);
    setRemaining(DURATIONS[m]);
    persist({ mode: m, running: false, remaining: DURATIONS[m], endAt: null });
  };

  const total = DURATIONS[mode];
  const progress = 1 - remaining / total; // 0 → 1
  const mins = Math.floor(remaining / 60).toString().padStart(2, "0");
  const secs = (remaining % 60).toString().padStart(2, "0");

  // SVG circle
  const R = 130;
  const C = 2 * Math.PI * R;
  const dash = C * progress;

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold neon-text">Pomodoro Timer 🍅</h1>
        <p className="mt-1 text-sm text-muted-foreground">Stay focused with structured study sessions</p>
      </div>

      <div className="mx-auto max-w-xl">
        {/* Mode tabs */}
        <div className="glass mb-8 flex gap-1 rounded-full border border-border/60 p-1">
          {(Object.keys(DURATIONS) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === m ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {LABELS[m]}
            </button>
          ))}
        </div>

        {/* Timer */}
        <div className="glass animate-fade-in relative mx-auto grid aspect-square w-full max-w-sm place-items-center rounded-full border border-border/60 p-6 shadow-elegant">
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 300 300">
            <circle cx="150" cy="150" r={R} fill="none" stroke="currentColor" strokeWidth="10" className="text-border/40" />
            <circle
              cx="150" cy="150" r={R} fill="none"
              stroke="currentColor" strokeWidth="10" strokeLinecap="round"
              className="text-primary transition-[stroke-dashoffset] duration-500"
              strokeDasharray={C}
              strokeDashoffset={C - dash}
              style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary) / 0.6))" }}
            />
          </svg>
          <div className="relative text-center">
            <div className="text-6xl font-bold tabular-nums neon-text sm:text-7xl">{mins}:{secs}</div>
            <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">{LABELS[mode]}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-8 flex items-center justify-center gap-3">
          {!running ? (
            <button
              onClick={start}
              disabled={remaining <= 0}
              className="hover-lift inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-glow transition disabled:opacity-50"
            >
              <Play className="h-5 w-5" /> Start
            </button>
          ) : (
            <button
              onClick={pause}
              className="hover-lift inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3 font-semibold text-accent-foreground shadow-glow transition"
            >
              <Pause className="h-5 w-5" /> Pause
            </button>
          )}
          <button
            onClick={reset}
            className="hover-lift inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 font-semibold transition hover:bg-accent"
          >
            <RotateCcw className="h-5 w-5" /> Reset
          </button>
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <Bell className="h-3.5 w-3.5" /> A sound and browser notification will alert you when the session ends.
        </p>
      </div>
    </AppShell>
  );
}
