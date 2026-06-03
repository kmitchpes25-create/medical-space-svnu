import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Brain, FileQuestion, GraduationCap, Layers, Sparkles, Stethoscope, Upload } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Medical Space — منصة طلاب الطب البشري" },
      { name: "description", content: "بنك أسئلة، فورماتيف، سنوات سابقة، اختبارات تجريبية، وإدارة كاملة للمواد الطبية." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: FileQuestion, title: "بنك أسئلة شامل", desc: "آلاف الأسئلة مقسّمة حسب المادة والشابتر والمحاضرة." },
  { icon: Brain, title: "أسئلة الفورماتيف", desc: "تدرّب على أسئلة الفورماتيف بشكل تفاعلي مع الحلول." },
  { icon: GraduationCap, title: "سنوات سابقة", desc: "أرشيف كامل لأسئلة الامتحانات السابقة مصنّفة بدقة." },
  { icon: Stethoscope, title: "اختبارات تجريبية", desc: "صمّم اختبارك بنفسك من أي مادة أو شابتر مع مؤقت." },
  { icon: Layers, title: "هيكل أكاديمي ديناميكي", desc: "سنة → ترم → مادة → شابتر → محاضرة، قابل للتوسع." },
  { icon: Upload, title: "رفع وتحليل ملفات", desc: "ارفع PDF/DOCX واستخرج الأسئلة تلقائياً." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-glow">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="text-lg">Medical Space</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
              تسجيل الدخول
            </Link>
            <Link to="/auth" search={{ mode: "signup" } as any} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition hover:opacity-90">
              ابدأ مجاناً
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-hero relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:py-32">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            منصة شاملة لطلاب الطب البشري
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            تعلّم الطب
            <span className="bg-gradient-to-l from-primary to-primary/50 bg-clip-text text-transparent"> بذكاء</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            بنك أسئلة منظم، اختبارات تجريبية، أسئلة سنوات سابقة، وفورماتيف — كل ما تحتاجه للتفوّق في كل سنة من سنوات الطب البشري.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/app" className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02]">
              ادخل المنصة
            </Link>
            <Link to="/auth" className="rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-accent">
              إنشاء حساب جديد
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">كل ما تحتاجه في مكان واحد</h2>
          <p className="mt-3 text-muted-foreground">أدوات احترافية مصمّمة خصيصاً لطلاب كليات الطب</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="group rounded-2xl border border-border bg-card p-6 transition hover:border-primary/50 hover:shadow-elegant">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 pb-24">
        <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-bl from-primary/10 via-card to-card p-10 text-center shadow-elegant">
          <BookOpen className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 text-2xl font-bold sm:text-3xl">ابدأ رحلتك الآن</h2>
          <p className="mt-2 text-muted-foreground">حساب مجاني. وصول فوري لجميع المواد والأسئلة.</p>
          <Link to="/auth" className="mt-6 inline-flex rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
            سجّل الآن مجاناً
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Medical Space
      </footer>
    </div>
  );
}
