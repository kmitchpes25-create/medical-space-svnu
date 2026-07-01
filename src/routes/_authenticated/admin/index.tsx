import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Users, FileQuestion, Layers, Upload, BookOpen, Trophy, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

function StatCard({ title, value, icon: Icon }: any) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{title}</div>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="mt-2 text-3xl font-bold">{value ?? "—"}</div>
    </div>
  );
}

function AdminHome() {
  const { data: stats } = useQuery({
    queryKey: ["admin_stats"],
    queryFn: async () => {
      const [years, subjects, questions, users] = await Promise.all([
        supabase.from("academic_years").select("*", { count: "exact", head: true }),
        supabase.from("subjects").select("*", { count: "exact", head: true }),
        supabase.from("questions").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
      ]);
      return {
        years: years.count, subjects: subjects.count, questions: questions.count, users: users.count,
      };
    },
  });

  return (
    <AdminShell>
      <h1 className="mb-2 text-3xl font-bold">Admin dashboard</h1>
      <p className="mb-8 text-sm text-muted-foreground">Full administration of Medical Space</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Academic years" value={stats?.years} icon={Layers} />
        <StatCard title="Subjects" value={stats?.subjects} icon={BookOpen} />
        <StatCard title="Questions" value={stats?.questions} icon={FileQuestion} />
        <StatCard title="Users" value={stats?.users} icon={Users} />
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/admin/content" className="group rounded-xl border border-border bg-card p-6 transition hover:border-primary/50">
          <Layers className="mb-3 h-6 w-6 text-primary" />
          <h3 className="font-semibold">Academic structure</h3>
          <p className="mt-1 text-xs text-muted-foreground">Years, semesters, subjects, chapters, lectures</p>
        </Link>
        <Link to="/admin/questions" className="group rounded-xl border border-border bg-card p-6 transition hover:border-primary/50">
          <FileQuestion className="mb-3 h-6 w-6 text-primary" />
          <h3 className="font-semibold">Questions</h3>
          <p className="mt-1 text-xs text-muted-foreground">Add, edit, and delete questions</p>
        </Link>
        <Link to="/admin/upload" className="group rounded-xl border border-border bg-card p-6 transition hover:border-primary/50">
          <Upload className="mb-3 h-6 w-6 text-primary" />
          <h3 className="font-semibold">Uploads</h3>
          <p className="mt-1 text-xs text-muted-foreground">Upload PDF/DOCX to extract questions</p>
        </Link>
        <Link to="/admin/users" className="group rounded-xl border border-border bg-card p-6 transition hover:border-primary/50">
          <Users className="mb-3 h-6 w-6 text-primary" />
          <h3 className="font-semibold">Users</h3>
          <p className="mt-1 text-xs text-muted-foreground">Grant/revoke admin and ban users</p>
        </Link>
      </div>

      <LeaderboardResetSection />
    </AdminShell>
  );
}

function LeaderboardResetSection() {
  const { data: years } = useQuery({
    queryKey: ["admin_years"],
    queryFn: async () => {
      const { data } = await supabase.from("academic_years").select("id, name").is("deleted_at", null).order("order_index");
      return data || [];
    },
  });
  const [selected, setSelected] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const doReset = async () => {
    if (!selected) return;
    if (!confirm("Reset the leaderboard for this year? All students will restart from 0 in a new season. Historical events are preserved.")) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_reset_leaderboard" as any, { _year: selected } as any);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("New season started — scores reset to 0");
  };

  return (
    <div className="mt-10 rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-warning" />
        <h3 className="font-semibold">Leaderboard control</h3>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Start a new monthly season for a specific academic year. All current scores become 0 while the historical ledger is preserved.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Select a year…</option>
          {(years || []).map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>
        <button
          onClick={doReset}
          disabled={!selected || busy}
          className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          {busy ? "Resetting…" : "Reset & start new season"}
        </button>
      </div>
    </div>
  );
}
