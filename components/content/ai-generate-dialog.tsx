"use client";

import { useState } from "react";
import { Sparkles, AlertCircle, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/shared/spinner";
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
  const [tone, setTone] = useState<
    "educational" | "inspirational" | "conversational" | "humorous"
  >("educational");
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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="mb-2">
          <DialogTitle className="flex items-center gap-2 text-brand">
            <Sparkles className="h-5 w-5" />
            Generate Post with AI
          </DialogTitle>
          <DialogDescription className="sr-only">
            Generate content for your post using AI.
          </DialogDescription>
        </DialogHeader>

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
              <Select
                value={fbPageId}
                onValueChange={(val) => setFbPageId(val as string)}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select a page…">
                    {fbPageId
                      ? pages.find((p) => p.id === fbPageId)?.name
                      : "Select a page…"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {pages.map((page) => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tone selector */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">
                Tone
              </label>
              <Select
                value={tone}
                onValueChange={(val) => val && setTone(val as any)}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="educational">Educational</SelectItem>
                  <SelectItem value="inspirational">Inspirational</SelectItem>
                  <SelectItem value="conversational">Conversational</SelectItem>
                  <SelectItem value="humorous">Humorous</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom instruction */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">
                Custom Instructions{" "}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="E.g., Focus on React 19 compiler benefits, keep it concise, ask a question at the end."
                rows={4}
              />
            </div>

            {/* Actions */}
            <DialogFooter className="mt-4 border-t-0 bg-transparent p-0 sm:justify-end border-t border-border/50 pt-3">
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
                    <Spinner size="sm" className="border-t-brand-foreground" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // AI Post Preview & Edit View
          <div className="space-y-4">
            {/* Title preview */}
            <div>
              <label className="mb-1 block text-[10px] uppercase font-semibold text-muted-foreground">
                Draft Title
              </label>
              <Input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
              />
            </div>

            {/* Body textarea preview */}
            <div>
              <label className="mb-1 block text-[10px] uppercase font-semibold text-muted-foreground">
                Draft Body Text
              </label>
              <Textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={6}
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
            <DialogFooter className="flex-row items-center justify-between mt-4 border-t-0 bg-transparent p-0 sm:justify-between border-t border-border/50 pt-3">
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
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
