import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Records one "active study minute" every 60s while the tab is visible AND
 * the user has interacted within the last 90s. Refresh / background tabs
 * don't count — server-side counters award +10 at 30 min and +25 at 60 min.
 */
export function useStudyHeartbeat() {
  const lastActivity = useRef<number>(Date.now());

  useEffect(() => {
    const bump = () => { lastActivity.current = Date.now(); };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, bump, { passive: true }));

    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastActivity.current > 90_000) return;
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return;
        await supabase.rpc("record_study_heartbeat" as any, { _year: null } as any);
      } catch { /* ignore */ }
    };

    const id = setInterval(tick, 60_000);
    return () => {
      clearInterval(id);
      events.forEach(e => window.removeEventListener(e, bump));
    };
  }, []);
}
