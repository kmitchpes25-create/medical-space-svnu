import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Zap } from "lucide-react";

export function StreakBadge() {
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      // Bump (idempotent for same day) then read.
      const { data, error } = await supabase.rpc("bump_streak" as any);
      if (!cancelled) {
        if (!error && data) setStreak((data as any).current_streak);
        else {
          const { data: row } = await supabase
            .from("user_streaks").select("current_streak").eq("user_id", u.user.id).maybeSingle();
          if (row) setStreak((row as any).current_streak);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (streak == null) return null;
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
      <Zap className="h-3.5 w-3.5 fill-current" />
      <span>Streaks</span>
      <span className="rounded-full bg-warning/20 px-1.5 py-0.5 text-[10px]">Day {streak}</span>
    </div>
  );
}
