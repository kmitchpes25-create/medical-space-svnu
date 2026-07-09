import { useState } from "react";
import { Phone, MessageCircle, Copy, X } from "lucide-react";
import { toast } from "sonner";

const WHATSAPP_NUMBER = "01108387331";
const WHATSAPP_INTL = "201108387331";
const PHONE_NUMBER = "01055543090";
const PHONE_INTL = "+201055543090";

export function CallUsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-background/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass relative w-full max-w-md rounded-2xl border border-border/60 p-6 shadow-elegant animate-scale-in"
        style={{ animation: "scale-in 200ms ease-out" }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent/20 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary shadow-glow">
            <Phone className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold neon-text">Call Us</h2>
          <p className="mt-1 text-sm text-muted-foreground">We're here to help — reach out anytime.</p>
        </div>

        <ContactCard
          icon={<MessageCircle className="h-6 w-6" />}
          label="WhatsApp"
          value={WHATSAPP_NUMBER}
          actionLabel="Chat on WhatsApp"
          actionHref={`https://wa.me/${WHATSAPP_INTL}`}
          tone="success"
        />

        <div className="h-3" />

        <ContactCard
          icon={<Phone className="h-6 w-6" />}
          label="Phone"
          value={PHONE_NUMBER}
          actionLabel="Call Now"
          actionHref={`tel:${PHONE_INTL}`}
          tone="primary"
        />
      </div>
    </div>
  );
}

function ContactCard({
  icon, label, value, actionLabel, actionHref, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  actionLabel: string;
  actionHref: string;
  tone: "primary" | "success";
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Number copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };
  const toneClasses =
    tone === "success"
      ? "bg-success/15 text-success"
      : "bg-primary/15 text-primary";
  const btnClasses =
    tone === "success"
      ? "bg-success text-success-foreground hover:opacity-90"
      : "bg-primary text-primary-foreground hover:opacity-90";
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-center gap-3">
        <div className={`grid h-12 w-12 place-items-center rounded-xl shadow-glow ${toneClasses}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-bold tabular-nums text-foreground">{value}</p>
        </div>
        <button
          onClick={copy}
          aria-label={`Copy ${label} number`}
          className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-background/50 text-muted-foreground transition hover:bg-accent/20 hover:text-foreground"
        >
          <Copy className={`h-4 w-4 ${copied ? "text-success" : ""}`} />
        </button>
      </div>
      <a
        href={actionHref}
        target={actionHref.startsWith("http") ? "_blank" : undefined}
        rel="noopener noreferrer"
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold shadow-glow transition ${btnClasses}`}
      >
        {actionLabel}
      </a>
    </div>
  );
}
