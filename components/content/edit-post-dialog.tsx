"use client";

import { useState, useEffect } from "react";
import { Save, AlertCircle } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      // eslint-disable-next-line
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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg space-y-2">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
          <DialogDescription>Modify draft or scheduled post content.</DialogDescription>
        </DialogHeader>

        {/* Content fields */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Target Page */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Target Page
            </label>
            <Select value={fbPageId} onValueChange={(val) => setFbPageId(val as string)}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {fbPageId ? pages.find((p) => p.id === fbPageId)?.name : ""}
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

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Title <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title or headline"
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
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What do you want to share?"
              rows={5}
            />
          </div>

          {/* Optional Media attachment */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">
                Attachment Type
              </label>
              <Select value={mediaType} onValueChange={(val: "NONE" | "IMAGE" | "LINK") => setMediaType(val)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No Attachment</SelectItem>
                  <SelectItem value="IMAGE">Image</SelectItem>
                  <SelectItem value="LINK">Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mediaType !== "NONE" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">
                  Attachment URL
                </label>
                <Input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder={
                    mediaType === "IMAGE"
                      ? "https://example.com/image.jpg"
                      : "https://example.com"
                  }
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
        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
