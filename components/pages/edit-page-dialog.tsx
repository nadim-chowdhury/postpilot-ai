"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PageSummary } from "@/types/page.types";

interface EditPageDialogProps {
  open: boolean;
  page: PageSummary | null;
  onClose: () => void;
  onSave: (
    pageId: string,
    data: { topic: string; personaPrompt: string },
  ) => void;
  loading?: boolean;
}

export function EditPageDialog({
  open,
  page,
  onClose,
  onSave,
  loading,
}: EditPageDialogProps) {
  const [topic, setTopic] = useState("");
  const [personaPrompt, setPersonaPrompt] = useState("");

  useEffect(() => {
    if (page) {
      // eslint-disable-next-line
      setTopic(page.topic ?? "");
      setPersonaPrompt(page.personaPrompt ?? "");
    }
  }, [page]);

  if (!open || !page) return null;

  const handleSave = () => {
    onSave(page.id, { topic, personaPrompt });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border/50 bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Edit Page
            </h2>
            <p className="text-xs text-muted-foreground">{page.name}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Web Development, Fitness Tips"
              className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/30"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              AI Persona Prompt
              <span className="ml-1 text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={personaPrompt}
              onChange={(e) => setPersonaPrompt(e.target.value)}
              placeholder="Describe the tone and style for AI-generated posts. E.g., 'Write as a friendly expert sharing practical tips.'"
              rows={4}
              className="w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/30"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end gap-2 border-t border-border/50 pt-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={handleSave}
            disabled={!topic.trim() || loading}
          >
            {loading ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
