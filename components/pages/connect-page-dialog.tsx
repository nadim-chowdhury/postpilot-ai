"use client";

import { useState } from "react";
import { X, Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AvailablePage {
  id: string;
  name: string;
  category: string;
  avatarUrl: string | null;
}

interface ConnectPageDialogProps {
  open: boolean;
  onClose: () => void;
  availablePages: AvailablePage[];
  onConnect: (
    pages: { metaPageId: string; name: string; topic: string; avatarUrl?: string }[],
  ) => void;
  loading?: boolean;
}

export function ConnectPageDialog({
  open,
  onClose,
  availablePages,
  onConnect,
  loading,
}: ConnectPageDialogProps) {
  const [selected, setSelected] = useState<
    Map<string, { topic: string }>
  >(new Map());

  if (!open) return null;

  const togglePage = (pageId: string) => {
    const newSelected = new Map(selected);
    if (newSelected.has(pageId)) {
      newSelected.delete(pageId);
    } else {
      newSelected.set(pageId, { topic: "" });
    }
    setSelected(newSelected);
  };

  const setTopic = (pageId: string, topic: string) => {
    const newSelected = new Map(selected);
    newSelected.set(pageId, { topic });
    setSelected(newSelected);
  };

  const handleConnect = () => {
    const pages = availablePages
      .filter((p) => selected.has(p.id))
      .map((p) => ({
        metaPageId: p.id,
        name: p.name,
        topic: selected.get(p.id)!.topic || p.category,
        avatarUrl: p.avatarUrl ?? undefined,
      }));

    onConnect(pages);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border/50 bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Connect Pages
            </h2>
            <p className="text-xs text-muted-foreground">
              Select pages to connect and assign topics.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Page list */}
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {availablePages.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No pages found. Make sure your Facebook account manages at least
              one page.
            </p>
          )}

          {availablePages.map((page) => {
            const isSelected = selected.has(page.id);
            return (
              <div
                key={page.id}
                className={`rounded-lg border p-3 transition-colors ${
                  isSelected
                    ? "border-brand/40 bg-brand/5"
                    : "border-border/50 bg-background hover:border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => togglePage(page.id)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                      isSelected
                        ? "border-brand bg-brand text-brand-foreground"
                        : "border-border bg-background"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </button>

                  {/* Avatar */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/50">
                    {page.avatarUrl ? (
                      <img
                        src={page.avatarUrl}
                        alt={page.name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {page.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {page.category}
                    </p>
                  </div>
                </div>

                {/* Topic input */}
                {isSelected && (
                  <div className="mt-2 ml-8">
                    <input
                      type="text"
                      value={selected.get(page.id)?.topic ?? ""}
                      onChange={(e) => setTopic(page.id, e.target.value)}
                      placeholder={`Topic (default: ${page.category})`}
                      className="h-8 w-full rounded-md border border-border/50 bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/30"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4">
          <p className="text-xs text-muted-foreground">
            {selected.size} page{selected.size !== 1 ? "s" : ""} selected
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={handleConnect}
              disabled={selected.size === 0 || loading}
            >
              {loading ? "Connecting…" : "Connect"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
