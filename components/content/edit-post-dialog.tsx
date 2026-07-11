"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/shared/spinner";
import { updatePost } from "@/actions/post.actions";
import type { PostSummary } from "@/types/post.types";

interface EditPostDialogProps {
  post: PostSummary | null;
  open: boolean;
  onClose: () => void;
  pages: { id: string; name: string }[];
  onSaved: () => void;
}

export function EditPostDialog({
  post,
  open,
  onClose,
  pages,
  onSaved,
}: EditPostDialogProps) {
  const [fbPageId, setFbPageId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"NONE" | "IMAGE" | "LINK">("NONE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form fields when post changes
  useEffect(() => {
    if (post) {
      setFbPageId(post.fbPageId);
      setTitle(post.title || "");
      setBody(post.body || "");
      setMediaType(post.mediaType === "VIDEO" ? "NONE" : post.mediaType);
      setMediaUrl(""); // URL isn't present in summary, but user can add if needed
      setError(null);
    }
  }, [post]);

  if (!open || !post) return null;

  const handleSave = async () => {
    setError(null);
    if (!body.trim()) {
      setError("Post body content cannot be empty.");
      return;
    }

    setLoading(true);

    const res = await updatePost(post.id, {
      fbPageId,
      title,
      body,
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaUrl ? mediaType : "NONE",
    });

    if (res.success) {
      onSaved();
      onClose();
    } else {
      setError(res.error || "Failed to update post.");
    }

    setLoading(true);
    setLoading(false);
  };

  const charCount = body.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog container */}
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border/50 bg-card p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Edit Post</h3>
            <p className="text-xs text-muted-foreground">Modify draft or scheduled post content.</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content fields */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Target Page */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Target Page
            </label>
            <select
              value={fbPageId}
              onChange={(e) => setFbPageId(e.target.value)}
              className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/30"
            >
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Title <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title or headline"
              className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/30"
            />
          </div>

          {/* Body */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-foreground">
              <span>Content</span>
              <span className="font-normal text-muted-foreground">
                {charCount} characters
              </span>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What do you want to share?"
              rows={5}
              className="w-full resize-y rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/30"
            />
          </div>

          {/* Optional Media attachment */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">
                Attachment Type
              </label>
              <select
                value={mediaType}
                onChange={(e) =>
                  setMediaType(e.target.value as "NONE" | "IMAGE" | "LINK")
                }
                className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand/30"
              >
                <option value="NONE">No Attachment</option>
                <option value="IMAGE">Image</option>
                <option value="LINK">Link</option>
              </select>
            </div>
            {mediaType !== "NONE" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">
                  Attachment URL
                </label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder={
                    mediaType === "IMAGE"
                      ? "https://example.com/image.jpg"
                      : "https://example.com"
                  }
                  className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand/30"
                />
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-2 border-t border-border/40 pt-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={loading || !body.trim()}
            className="bg-brand text-brand-foreground hover:bg-brand/90 gap-1.5"
          >
            {loading ? (
              <>
                <Spinner size="sm" className="border-t-brand-foreground" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
