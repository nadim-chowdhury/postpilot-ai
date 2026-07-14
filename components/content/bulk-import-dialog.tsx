"use client";

import { useState } from "react";
import { Upload, Calendar, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { DatePicker } from "@/components/ui/date-picker";
import { Spinner } from "@/components/shared/spinner";
import { bulkImportPosts } from "@/actions/post.actions";
import { convertMarkdownToUnicode } from "@/lib/utils";

interface BulkImportDialogProps {
  open: boolean;
  onClose: () => void;
  pages: { id: string; name: string }[];
  onImported: () => void;
}

const SAMPLE_JSON = `[
  {
    "title": "Match Day Madness 🔥",
    "body": "When your team concedes in the 90th minute... 😭⚽\\n\\nEvery football fan knows that pain. Drop a 💔 if you've been there.\\n\\n#Football #MatchDay #Pain"
  },
  {
    "title": "Transfer Window Drama 💰",
    "body": "Breaking: A player liked an Instagram post from another club. Media: HERE WE GO! 🚨\\n\\n#TransferNews #Football"
  }
]`;

export function BulkImportDialog({
  open,
  onClose,
  pages,
  onImported,
}: BulkImportDialogProps) {
  const [fbPageId, setFbPageId] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"CUSTOM" | "APPEND">(
    "APPEND",
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [postsPerDay, setPostsPerDay] = useState(2);
  const [autoSchedule, setAutoSchedule] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    imported: number;
    scheduled: number;
  } | null>(null);
  const [convertRichText, setConvertRichText] = useState(true);

  if (!open) return null;

  const validateJson = (): { title?: string; body: string }[] | null => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        setError("JSON must be an array of post objects.");
        return null;
      }
      for (let i = 0; i < parsed.length; i++) {
        if (!parsed[i].body || typeof parsed[i].body !== "string") {
          setError(`Post #${i + 1} is missing a "body" field.`);
          return null;
        }
      }
      return parsed;
    } catch {
      setError("Invalid JSON format. Please check your input.");
      return null;
    }
  };

  const handleImport = async () => {
    setError(null);
    setResult(null);

    if (!fbPageId) {
      setError("Please select a page.");
      return;
    }

    const posts = validateJson();
    if (!posts) return;

    if (posts.length === 0) {
      setError("No posts found in JSON.");
      return;
    }

    const processedPosts = convertRichText
      ? posts.map((post) => ({
          ...post,
          body: convertMarkdownToUnicode(post.body || ""),
        }))
      : posts;

    if (autoSchedule && scheduleMode === "CUSTOM") {
      if (!startDate || !endDate) {
        setError("Please set both start and end dates for auto-scheduling.");
        return;
      }
      if (new Date(startDate) >= new Date(endDate)) {
        setError("End date must be after start date.");
        return;
      }
    }

    setLoading(true);

    const res = await bulkImportPosts({
      fbPageId,
      posts: processedPosts,
      autoSchedule,
      scheduleMode: autoSchedule ? scheduleMode : undefined,
      startDate:
        autoSchedule && scheduleMode === "CUSTOM" ? startDate : undefined,
      endDate: autoSchedule && scheduleMode === "CUSTOM" ? endDate : undefined,
      postsPerDay: autoSchedule ? postsPerDay : undefined,
    });

    if (res.success) {
      setResult(res.data);
      onImported();
      setTimeout(() => {
        onClose();
        // Reset state after closing
        setResult(null);
        setJsonInput("");
      }, 1500);
    } else {
      setError(res.error || "Failed to import posts.");
    }

    setLoading(false);
  };

  const parsedPosts = (() => {
    try {
      const p = JSON.parse(jsonInput);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  })();

  const parsedCount = parsedPosts.length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 space-y-0">
        <DialogHeader className="mb-5 border-b border-border/40 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-brand" />
            Bulk Import Posts
          </DialogTitle>
          <DialogDescription>
            Paste AI-generated posts as JSON and auto-schedule them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-2 pb-2">
          {/* Page Selection */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Target Page
            </label>
            <Select
              value={fbPageId}
              onValueChange={(val) => setFbPageId(val as string)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Choose a page">
                  {fbPageId
                    ? pages.find((p) => p.id === fbPageId)?.name
                    : "Choose a page"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {[...pages]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* JSON Input */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                Posts JSON{" "}
                {parsedCount > 0 && (
                  <span className="ml-1 text-brand">
                    ({parsedCount} posts detected)
                  </span>
                )}
              </label>
              <button
                onClick={() => setJsonInput(SAMPLE_JSON)}
                className="text-[10px] text-brand hover:underline"
              >
                Load sample
              </button>
            </div>
            <Textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setError(null);
              }}
              placeholder='Paste your JSON array here. Each object needs at least a "body" field...'
              rows={8}
              className="font-mono"
            />
          </div>

          {/* Rich Text Format Option */}
          <div className="rounded-lg border border-border/50 bg-muted/10 p-4 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={convertRichText}
                onChange={(e) => setConvertRichText(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-brand"
              />
              <div>
                <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-brand" />
                  Convert Markdown to Unicode Rich Text
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Automatically convert **bold**, *italic*, ***bold-italic***, and `monospace` tags to Facebook-friendly Unicode glyphs.
                </p>
              </div>
            </label>
          </div>

          {/* Real-time Preview */}
          {parsedPosts.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground block">
                Post Preview ({parsedPosts.length} post{parsedPosts.length !== 1 ? "s" : ""})
              </label>
              <div className="max-h-48 overflow-y-auto space-y-3 rounded-lg border border-border/50 bg-muted/5 p-3.5">
                {parsedPosts.map((post: { title?: string; body: string }, idx: number) => {
                  const previewBody = convertRichText
                    ? convertMarkdownToUnicode(post.body || "")
                    : (post.body || "");
                  return (
                    <div
                      key={idx}
                      className="border-b border-border/30 last:border-0 pb-3 last:pb-0"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-semibold text-brand bg-brand/10 px-1.5 py-0.5 rounded">
                          Post #{idx + 1}
                        </span>
                        {post.title && (
                          <span className="text-[11px] font-medium text-foreground truncate max-w-[200px]">
                            {post.title}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                        {previewBody}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Auto-Schedule Toggle */}
          <div className="rounded-lg border border-border/50 bg-muted/10 p-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSchedule}
                onChange={(e) => setAutoSchedule(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-brand"
              />
              <div>
                <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-brand" />
                  Auto-schedule posts across a date range
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Posts will be spaced at least 4 hours apart with randomized
                  gaps for a natural posting rhythm.
                </p>
              </div>
            </label>

            {autoSchedule && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                    Scheduling Mode
                  </label>
                  <Select
                    value={scheduleMode}
                    onValueChange={(val) =>
                      setScheduleMode(val as "CUSTOM" | "APPEND")
                    }
                  >
                    <SelectTrigger className="h-8 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CUSTOM">
                        Across custom date range
                      </SelectItem>
                      <SelectItem value="APPEND">
                        Queue after latest scheduled post
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {scheduleMode === "CUSTOM" && (
                    <>
                      <div>
                        <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                          Start Date
                        </label>
                        <DatePicker
                          value={startDate}
                          onChange={setStartDate}
                          placeholder="Pick start date"
                          className="h-8 w-full"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                          End Date
                        </label>
                        <DatePicker
                          value={endDate}
                          onChange={setEndDate}
                          placeholder="Pick end date"
                          className="h-8 w-full"
                        />
                      </div>
                    </>
                  )}
                  <div
                    className={scheduleMode === "APPEND" ? "col-span-3" : ""}
                  >
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                      Posts per Day
                    </label>
                    <Select
                      value={postsPerDay.toString()}
                      onValueChange={(val) =>
                        setPostsPerDay(Number(val as string))
                      }
                    >
                      <SelectTrigger className="h-8 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n} post{n > 1 ? "s" : ""} / day
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {result && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Successfully imported {result.imported} post
                {result.imported !== 1 ? "s" : ""}
                {result.scheduled > 0 && ` and scheduled ${result.scheduled}`}!
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-4">
          <p className="text-xs text-muted-foreground">
            {parsedCount > 0
              ? `${parsedCount} post${parsedCount !== 1 ? "s" : ""} ready`
              : "Paste JSON above"}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              {result ? "Done" : "Cancel"}
            </Button>
            {!result && (
              <Button
                size="sm"
                className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
                onClick={handleImport}
                disabled={loading || parsedCount === 0 || !fbPageId}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="border-t-brand-foreground" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    Import {parsedCount > 0 ? `${parsedCount} Posts` : ""}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
