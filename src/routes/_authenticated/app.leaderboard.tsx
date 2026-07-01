import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { AnimatedNumber } from "@/components/animated-number";
import { Trophy, Crown, Medal, Flame, Target, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/leaderboard")({
  component: LeaderboardPage,
});

interface Row {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_points: number;
  correct_answers: number;
  current_streak: number;
  last_event_at: string;
  rank: number;
  is_me: boolean;
}

function LeaderboardPage() {
  const qc = useQueryClient();
  const [yearId, setYearId] = useState<string | null>(null);

  const { data: years } = useQuery({
    queryKey: ["lb_years"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_years")
        .select("id, name, order_index")
        .is("deleted_at", null)
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!yearId && years?.length) {
      (async () => {
        const { data: u } = await supabase.auth.getUser();
        if (u.user) {
          const { data: p } = await supabase.from("profiles").select("primary_year_id").eq("id", u.user.id).maybeSingle();
          if (p?.primary_year_id && years.find(y => y.id === p.primary_year_id)) {
            setYearId(p.primary_year_id);
            return;
          }
        }
        setYearId(years[0].id);
      })();
    }
  }, [years, yearId]);

  const { data: rows, isLoading } = useQuery<Row[]>({
    queryKey: ["leaderboard", yearId],
    enabled: !!yearId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leaderboard" as any, { _year: yearId });
      if (error) throw error;
      return (data as any) || [];
    },
  });

  useEffect(() => {
    if (!yearId) return;
    const channel = supabase
      .channel(`lb-${yearId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "leaderboard_scores", filter: `year_id=eq.${yearId}` }, () => {
        qc.invalidateQueries({ queryKey: ["leaderboard", yearId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [yearId, qc]);

  const top3 = useMemo(() => (rows || []).slice(0, 3), [rows]);
  const rest = useMemo(() => (rows || []).filter(r => r.rank > 3 && r.rank <= 100), [rows]);
  const me = useMemo(() => (rows || []).find(r => r.is_me), [rows]);
  const meInList = me && me.rank <= 100;
  const maxPoints = Math.max(1, ...(rows || []).map(r => r.total_points));

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary/80">
            <Sparkles className="h-3.5 w-3.5" /> Monthly contest
          </div>
          <h1 className="text-3xl font-bold neon-text">Leaderboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Top 100 students · updates in real time</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Year</label>
          <select
            value={yearId ?? ""}
            onChange={(e) => setYearId(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            {years?.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </div>
      </div>

      {isLoading || !yearId ? (
        <div className="grid h-64 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !rows?.length ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No scores yet. Answer questions to enter the leaderboard.</p>
        </div>
      ) : (
        <>
          <Podium rows={top3} />
          <div className="mt-8 space-y-2">
            {rest.map((r) => (
              <LbRow key={r.user_id} row={r} maxPoints={maxPoints} />
            ))}
          </div>
          {me && !meInList && (
            <div className="sticky bottom-4 mt-6 rounded-2xl border-2 border-primary bg-card/95 p-1 shadow-glow backdrop-blur">
              <LbRow row={me} maxPoints={maxPoints} sticky />
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

function Podium({ rows }: { rows: Row[] }) {
  const order = [rows[1], rows[0], rows[2]].filter(Boolean);
  const heights = ["h-32", "h-40", "h-24"];
  const colors = ["from-slate-300 to-slate-500", "from-yellow-300 to-amber-500", "from-orange-400 to-orange-700"];
  const iconColors = ["text-slate-300", "text-yellow-400", "text-orange-400"];
  const positions = [2, 1, 3];

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-6">
      {order.map((r, i) => {
        const pos = positions[i];
        const Icon = pos === 1 ? Crown : Medal;
        return (
          <div key={r.user_id} className="flex flex-col items-center animate-scale-in">
            <div className="relative">
              <div className={`grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-full bg-gradient-to-br ${colors[i]} p-[3px] shadow-glow`}>
                <div className="grid h-full w-full place-items-center rounded-full bg-card text-lg font-bold">
                  {r.full_name.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="absolute -top-2 -right-2 grid h-8 w-8 place-items-center rounded-full bg-card shadow-elegant">
                <Icon className={`h-5 w-5 ${iconColors[i]} ${pos === 1 ? "animate-float" : ""}`} />
              </div>
            </div>
            <p className="mt-3 max-w-full truncate text-sm font-semibold">{r.full_name}</p>
            <p className="text-xs text-muted-foreground">
              <AnimatedNumber value={r.total_points} /> pts
            </p>
            <div className={`mt-2 ${heights[i]} w-full rounded-t-xl bg-gradient-to-t ${colors[i]} opacity-90 shadow-glow`}>
              <div className="pt-2 text-center text-2xl font-black text-black/70">#{pos}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LbRow({ row, maxPoints, sticky }: { row: Row; maxPoints: number; sticky?: boolean }) {
  const pct = Math.max(4, Math.round((row.total_points / maxPoints) * 100));
  return (
    <div
      className={`group relative flex items-center gap-3 rounded-2xl border p-3 sm:p-4 transition-all duration-300 hover-lift ${
        row.is_me
          ? "border-primary/60 bg-primary/5 shadow-glow"
          : "border-border bg-card hover:border-primary/40 hover:shadow-glow"
      } ${sticky ? "border-transparent" : ""}`}
    >
      <div className={`grid h-10 w-10 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-xl font-bold text-sm ${
        row.rank <= 3 ? "bg-gradient-to-br from-yellow-400 to-amber-600 text-black" : "bg-muted text-muted-foreground"
      }`}>
        #{row.rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">
            {row.full_name}
            {row.is_me && <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">YOU</span>}
          </p>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-accent transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Target className="h-3 w-3" /> {row.correct_answers} correct</span>
          <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3 text-orange-400" /> {row.current_streak} day streak</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-lg sm:text-xl font-black tabular-nums neon-text">
          <AnimatedNumber value={row.total_points} />
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">points</div>
      </div>
    </div>
  );
}
