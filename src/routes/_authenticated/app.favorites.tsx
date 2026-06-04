import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/app/favorites")({
  component: FavPage,
});

function FavPage() {
  const { data } = useQuery({
    queryKey: ["favs"],
    queryFn: async () => {
      const { data } = await supabase.from("favorites").select("question:questions(id, text)").limit(100);
      return data || [];
    },
  });
  return (
    <AppShell>
      <h1 className="mb-6 text-3xl font-bold">Favorites</h1>
      <div className="space-y-2">
        {!data?.length && <p className="text-sm text-muted-foreground">No favorite questions yet.</p>}
        {data?.map((f: any) => (
          <div key={f.question?.id} className="rounded-xl border border-border bg-card p-4 text-sm">{f.question?.text}</div>
        ))}
      </div>
    </AppShell>
  );
}
