import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Brain, FileQuestion, GraduationCap, Layers, Sparkles, Stethoscope, Upload } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Medical Space — Platform for Medical Students" },
      { name: "description", content: "Question bank, formatives, past years, mock exams, and complete subject management for medical students." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: FileQuestion, title: "Comprehensive Question Bank", desc: "Thousands of questions organized by subject, chapter, and lecture." },
  { icon: Brain, title: "Formative Questions", desc: "Practice formative questions interactively with full solutions." },
  { icon: GraduationCap, title: "Past Years", desc: "Complete archive of previous exam questions, accurately classified." },
  { icon: Stethoscope, title: "Mock Exams", desc: "Build your own exam from any subject or chapter with a timer." },
  { icon: Layers, title: "Dynamic Academic Structure", desc: "Year → Semester → Subject → Chapter → Lecture, fully extensible." },
  { icon: Upload, title: "Upload & Parse Files", desc: "Upload PDF/DOCX and extract questions automatically." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
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
              Sign in
            </Link>
            <Link to="/auth" search={{ mode: "signup" } as any} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition hover:opacity-90">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-hero relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:py-32">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            A complete platform for medical students
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Study medicine
            <span className="bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent"> smarter</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            An organized question bank, mock exams, previous-year questions, and formatives — everything you need to excel through every year of medical school.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/app" className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02]">
              Enter the platform
            </Link>
            <Link to="/auth" className="rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-accent">
              Create a new account
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Everything you need in one place</h2>
          <p className="mt-3 text-muted-foreground">Professional tools designed specifically for medical students</p>
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
        <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-10 text-center shadow-elegant">
          <BookOpen className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 text-2xl font-bold sm:text-3xl">Start your journey now</h2>
          <p className="mt-2 text-muted-foreground">Free account. Instant access to every subject and question.</p>
          <Link to="/auth" className="mt-6 inline-flex rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
            Sign up free
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Medical Space
      </footer>
    </div>
  );
}
