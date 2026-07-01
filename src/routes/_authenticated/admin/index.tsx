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
    </AdminShell>
  );
}
