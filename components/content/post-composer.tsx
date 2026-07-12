"use client";

import { useState } from "react";
import { Send, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PostComposerProps {
  pages: { id: string; name: string }[];
  onSaveDraft: (data: {
    fbPageId: string;
    title: string;
    body: string;
    mediaUrl: string;
    mediaType: "NONE" | "IMAGE" | "LINK";
  }) => void;
  onPublishNow: (data: {
    fbPageId: string;
    title: string;
    body: string;
    mediaUrl: string;
    mediaType: "NONE" | "IMAGE" | "LINK";
  }) => void;
  loading?: boolean;
}

export function PostComposer({
  pages,
  onSaveDraft,
  onPublishNow,
  loading,
}: PostComposerProps) {
  const [fbPageId, setFbPageId] = useState(pages[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"NONE" | "IMAGE" | "LINK">("NONE");

  const isValid = fbPageId && body.trim().length > 0;
  const charCount = body.length;

  const getData = () => ({
    fbPageId,
    title,
    body,
    mediaUrl,
    mediaType: mediaUrl ? mediaType : ("NONE" as const),
  });

  return (
    <div className="rounded-xl border border-border/50 bg-card">
      {/* Header */}
      <div className="border-b border-border/50 px-5 py-3">
        <h3 className="text-sm font-semibold text-foreground">New Post</h3>
      </div>

      {/* Body */}
      <div className="space-y-4 p-5">
        {/* Page selector */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground">
            Target Page
          </label>
          <Select value={fbPageId} onValueChange={(val) => setFbPageId(val as string)}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select a page…">
                {fbPageId ? pages.find((p) => p.id === fbPageId)?.name : "Select a page…"}
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
          <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-foreground">
            <span>Content</span>
            <span className="font-normal text-muted-foreground">
              {charCount} characters
            </span>
          </label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your post content here..."
            rows={6}
          />
        </div>

        {/* Media */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Media URL{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              type="url"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          {mediaUrl && (
            <div className="w-32">
              <label className="mb-1.5 block text-xs font-medium text-foreground">
                Type
              </label>
              <Select value={mediaType} onValueChange={(val: "NONE" | "IMAGE" | "LINK") => setMediaType(val)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMAGE">Image</SelectItem>
                  <SelectItem value="LINK">Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-border/50 px-5 py-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onSaveDraft(getData())}
          disabled={!isValid || loading}
        >
          <Save className="h-3.5 w-3.5" />
          Save Draft
        </Button>
        <Button
          size="sm"
          className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={() => onPublishNow(getData())}
          disabled={!isValid || loading}
        >
          <Send className="h-3.5 w-3.5" />
          {loading ? "Publishing…" : "Post Now"}
        </Button>
      </div>
    </div>
  );
}
