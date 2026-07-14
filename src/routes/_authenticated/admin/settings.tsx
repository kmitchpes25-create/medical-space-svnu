import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [telegramLink, setTelegramLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings" as any).select("value").eq("key", "telegram_channel_link").maybeSingle();
      setTelegramLink((data as any)?.value || "");
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const value = telegramLink.trim();
      const { error } = await supabase.from("app_settings" as any).upsert({ key: "telegram_channel_link", value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure integrations that appear in the app.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Send className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold">Telegram Settings</h2>
            <p className="text-xs text-muted-foreground">Link shown in the sidebar for all students.</p>
          </div>
        </div>

        {loading ? (
          <div className="grid h-24 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Telegram Channel Link</label>
              <input
                value={telegramLink}
                onChange={(e) => setTelegramLink(e.target.value)}
                placeholder="https://t.me/your_channel"
                className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
