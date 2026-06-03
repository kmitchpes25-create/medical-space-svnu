import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Users, FileQuestion, Layers, Upload, BookOpen } from "lucide-react";

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
      <h1 className="mb-2 text-3xl font-bold">لوحة الإدارة</h1>
      <p className="mb-8 text-sm text-muted-foreground">إدارة كاملة لمنصة Medical Space</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="السنوات الدراسية" value={stats?.years} icon={Layers} />
        <StatCard title="المواد" value={stats?.subjects} icon={BookOpen} />
        <StatCard title="الأسئلة" value={stats?.questions} icon={FileQuestion} />
        <StatCard title="المستخدمون" value={stats?.users} icon={Users} />
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/admin/content" className="group rounded-xl border border-border bg-card p-6 transition hover:border-primary/50">
          <Layers className="mb-3 h-6 w-6 text-primary" />
          <h3 className="font-semibold">إدارة الهيكل الأكاديمي</h3>
          <p className="mt-1 text-xs text-muted-foreground">السنوات، الترمات، المواد، الشابترز، المحاضرات</p>
        </Link>
        <Link to="/admin/questions" className="group rounded-xl border border-border bg-card p-6 transition hover:border-primary/50">
          <FileQuestion className="mb-3 h-6 w-6 text-primary" />
          <h3 className="font-semibold">إدارة الأسئلة</h3>
          <p className="mt-1 text-xs text-muted-foreground">إضافة، تعديل، وحذف الأسئلة</p>
        </Link>
        <Link to="/admin/upload" className="group rounded-xl border border-border bg-card p-6 transition hover:border-primary/50">
          <Upload className="mb-3 h-6 w-6 text-primary" />
          <h3 className="font-semibold">رفع ملفات</h3>
          <p className="mt-1 text-xs text-muted-foreground">رفع PDF/DOCX لاستخراج الأسئلة</p>
        </Link>
        <Link to="/admin/users" className="group rounded-xl border border-border bg-card p-6 transition hover:border-primary/50">
          <Users className="mb-3 h-6 w-6 text-primary" />
          <h3 className="font-semibold">إدارة المستخدمين</h3>
          <p className="mt-1 text-xs text-muted-foreground">منح/سحب صلاحيات وحظر المستخدمين</p>
        </Link>
      </div>
    </AdminShell>
  );
}
