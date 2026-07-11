"use client";

import { useState } from "react";
import { X, Sparkles, AlertCircle, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateSinglePost } from "@/actions/ai.actions";
import { createPost } from "@/actions/post.actions";
import type { GeneratedPostType } from "@/lib/services/ai.service";

interface AiGenerateDialogProps {
  open: boolean;
  onClose: () => void;
  pages: { id: string; name: string }[];
  onSaved: () => void;
}

export function AiGenerateDialog({
  open,
  onClose,
  pages,
  onSaved,
}: AiGenerateDialogProps) {
  const [fbPageId, setFbPageId] = useState(pages[0]?.id ?? "");
  const [tone, setTone] = useState<"educational" | "inspirational" | "conversational" | "humorous">("educational");
  const [customInstructions, setCustomInstructions] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<GeneratedPostType | null>(null);

  // Editable preview fields
  const [editedTitle, setEditedTitle] = useState("");
  const [editedBody, setEditedBody] = useState("");

  if (!open) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setPreview(null);

    const result = await generateSinglePost(fbPageId, tone, customInstructions);

    if (result.success) {
      setPreview(result.data);
      setEditedTitle(result.data.title);
      setEditedBody(result.data.body);
    } else {
      setError(result.error || "Failed to generate content");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!preview) return;
    setLoading(true);

    const result = await createPost({
      fbPageId,
      title: editedTitle || undefined,
      body: editedBody,
      mediaUrl: preview.imagePrompt || undefined,
      mediaType: preview.suggestImage ? "IMAGE" : "NONE",
    });

    if (result.success) {
      onSaved();
      onClose();
      setPreview(null);
    } else {
      setError(result.error || "Failed to save draft");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog card */}
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border/50 bg-card p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2 text-brand">
            <Sparkles className="h-5 w-5" />
            <h2 className="text-base font-semibold text-foreground">
              Generate Post with AI
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!preview ? (
          // Input Form View
          <div className="space-y-4">
            {/* Page selector */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">
                Target Page
              </label>
              <select
                value={fbPageId}
                onChange={(e) => setFbPageId(e.target.value)}
                className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground focus:border-brand/50 focus:outline-none"
              >
                <option value="" disabled>
                  Select a page…
                </option>
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tone selector */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">
                Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as any)}
                className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground focus:border-brand/50 focus:outline-none"
              >
                <option value="educational">Educational</option>
                <option value="inspirational">Inspirational</option>
                <option value="conversational">Conversational</option>
                <option value="humorous">Humorous</option>
              </select>
            </div>

            {/* Custom instruction */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">
                Custom Instructions{" "}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="E.g., Focus on React 19 compiler benefits, keep it concise, ask a question at the end."
                rows={4}
                className="w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/30"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 border-t border-border/50 pt-3">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-brand text-brand-foreground hover:bg-brand/90 gap-1.5"
                onClick={handleGenerate}
                disabled={!fbPageId || loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          // AI Post Preview & Edit View
          <div className="space-y-4">
            {/* Title preview */}
            <div>
              <label className="mb-1 block text-[10px] uppercase font-semibold text-muted-foreground">
                Draft Title
              </label>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="h-8 w-full rounded-md border border-border/50 bg-background px-2.5 text-xs text-foreground focus:border-brand/50 focus:outline-none"
              />
            </div>

            {/* Body textarea preview */}
            <div>
              <label className="mb-1 block text-[10px] uppercase font-semibold text-muted-foreground">
                Draft Body Text
              </label>
              <textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={6}
                className="w-full resize-none rounded-md border border-border/50 bg-background px-3 py-2 text-xs leading-relaxed text-foreground focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/30"
              />
            </div>

            {/* Image recommendation info */}
            {preview.suggestImage && preview.imagePrompt && (
              <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider block">
                  Suggested Graphic Prompt (DALL-E 3)
                </span>
                <p className="text-[10px] text-muted-foreground italic leading-normal">
                  {preview.imagePrompt}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center border-t border-border/50 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreview(null)}
                disabled={loading}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Regenerate
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  disabled={loading}
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  className="bg-brand text-brand-foreground hover:bg-brand/90 gap-1.5"
                  onClick={handleSave}
                  disabled={!editedBody.trim() || loading}
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Draft
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
