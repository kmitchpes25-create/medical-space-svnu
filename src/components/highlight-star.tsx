import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  questionId: string;
  subjectId?: string | null;
  chapterId?: string | null;
  className?: string;
};

export function HighlightStar({ questionId, subjectId, chapterId, className = "" }: Props) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("highlights")
        .select("id")
        .eq("user_id", u.user.id)
        .eq("question_id", questionId)
        .maybeSingle();
      if (!cancel) setOn(!!data);
    })();
    return () => { cancel = true; };
  }, [questionId]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (on) {
        const { error } = await supabase
          .from("highlights").delete()
          .eq("user_id", u.user.id).eq("question_id", questionId);
        if (error) throw error;
        setOn(false);
      } else {
        const { error } = await supabase.from("highlights").insert({
          user_id: u.user.id,
          question_id: questionId,
          subject_id: subjectId ?? null,
          chapter_id: chapterId ?? null,
        });
        if (error && !String(error.message).includes("duplicate")) throw error;
        setOn(true);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't update highlight");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      aria-pressed={on}
      title={on ? "Remove from Highlights" : "Save to Highlights"}
      className={`grid h-9 w-9 place-items-center rounded-lg border border-border bg-card transition hover:bg-accent ${className}`}
    >
      <Star className={`h-4 w-4 transition ${on ? "fill-warning text-warning" : "text-muted-foreground"}`} />
    </button>
  );
}
