import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Upload, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/upload")({
  component: UploadPage,
});

function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const path = `uploads/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("uploads").upload(path, file);
      if (error) throw error;
      toast.success("File uploaded successfully. AI-powered question extraction will be available in a future update.");
      setFile(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <AdminShell>
      <h1 className="mb-2 text-3xl font-bold">Uploads</h1>
      <p className="mb-8 text-sm text-muted-foreground">Upload PDF / DOCX / TXT to store the file. Automatic AI-powered question extraction is coming in phase two.</p>

      <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 font-semibold">Pick a file to upload</h3>
        <p className="text-xs text-muted-foreground">PDF, DOCX, TXT, JSON</p>
        <input
          type="file"
          accept=".pdf,.docx,.txt,.json"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mt-4 mx-auto block text-sm"
        />
        {file && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
            <FileText className="h-4 w-4" /> {file.name}
          </div>
        )}
        <div className="mt-6">
          <button
            disabled={!file || uploading}
            onClick={upload}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload file"}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
        <div className="flex items-center gap-2 font-semibold text-primary">
          <Sparkles className="h-4 w-4" /> AI-powered question extraction
        </div>
        <p className="mt-1 text-muted-foreground">
          Automatic extraction of questions from PDF/DOCX files using AI is coming in phase two. For now, you can add questions manually from the <strong>Questions</strong> page.
        </p>
      </div>
    </AdminShell>
  );
}
