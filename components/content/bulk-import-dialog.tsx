"use client";

import { useState } from "react";
import { X, Upload, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/shared/spinner";
import { bulkImportPosts } from "@/actions/post.actions";

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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [postsPerDay, setPostsPerDay] = useState(2);
  const [autoSchedule, setAutoSchedule] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; scheduled: number } | null>(null);

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

    if (autoSchedule && (!startDate || !endDate)) {
      setError("Please set both start and end dates for auto-scheduling.");
      return;
    }

    if (autoSchedule && new Date(startDate) >= new Date(endDate)) {
      setError("End date must be after start date.");
      return;
    }

    setLoading(true);

    const res = await bulkImportPosts({
      fbPageId,
      posts,
      autoSchedule,
      startDate: autoSchedule ? startDate : undefined,
      endDate: autoSchedule ? endDate : undefined,
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

  const parsedCount = (() => {
    try {
      const p = JSON.parse(jsonInput);
      return Array.isArray(p) ? p.length : 0;
    } catch {
      return 0;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border/50 bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Upload className="h-4 w-4 text-brand" />
              Bulk Import Posts
            </h2>
            <p className="text-xs text-muted-foreground">
              Paste AI-generated posts as JSON and auto-schedule them.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Page Selection */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Target Page
            </label>
            <select
              value={fbPageId}
              onChange={(e) => setFbPageId(e.target.value)}
              className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground focus:border-brand/50 focus:outline-none"
            >
              <option value="">Choose a page</option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* JSON Input */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                Posts JSON {parsedCount > 0 && (
                  <span className="ml-1 text-brand">({parsedCount} posts detected)</span>
                )}
              </label>
              <button
                onClick={() => setJsonInput(SAMPLE_JSON)}
                className="text-[10px] text-brand hover:underline"
              >
                Load sample
              </button>
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setError(null);
              }}
              placeholder='Paste your JSON array here. Each object needs at least a "body" field...'
              rows={8}
              className="w-full resize-y rounded-lg border border-border/50 bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/30"
            />
          </div>

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
                  Posts will be evenly distributed with randomized times (no two posts at the same time).
                </p>
              </div>
            </label>

            {autoSchedule && (
              <div className="grid gap-3 sm:grid-cols-3 pt-1">
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 w-full rounded-md border border-border/50 bg-background px-2 text-xs text-foreground focus:border-brand/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 w-full rounded-md border border-border/50 bg-background px-2 text-xs text-foreground focus:border-brand/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                    Posts per Day
                  </label>
                  <select
                    value={postsPerDay}
                    onChange={(e) => setPostsPerDay(Number(e.target.value))}
                    className="h-8 w-full rounded-md border border-border/50 bg-background px-2 text-xs text-foreground focus:border-brand/50 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} post{n > 1 ? "s" : ""} / day
                      </option>
                    ))}
                  </select>
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
                Successfully imported {result.imported} post{result.imported !== 1 ? "s" : ""}
                {result.scheduled > 0 && ` and scheduled ${result.scheduled}`}!
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4">
          <p className="text-xs text-muted-foreground">
            {parsedCount > 0 ? `${parsedCount} post${parsedCount !== 1 ? "s" : ""} ready` : "Paste JSON above"}
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
      </div>
    </div>
  );
}
