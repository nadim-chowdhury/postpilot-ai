"use client";

import { useState } from "react";
import { Globe, Check, Search, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/shared/spinner";

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
    pages: {
      metaPageId: string;
      name: string;
      topic: string;
      avatarUrl?: string;
    }[],
  ) => void;
  onConnectManually?: (data: {
    metaPageId: string;
    accessToken: string;
    topic: string;
    platform?: "FACEBOOK" | "TWITTER" | "LINKEDIN";
    name?: string;
    tokenSecret?: string;
  }) => Promise<boolean>;
  loading?: boolean;
}

export function ConnectPageDialog({
  open,
  onClose,
  availablePages,
  onConnect,
  onConnectManually,
  loading,
}: ConnectPageDialogProps) {
  const [activeTab, setActiveTab] = useState<"oauth" | "manual">("oauth");
  const [selected, setSelected] = useState<Map<string, { topic: string }>>(
    new Map(),
  );
  const [searchQuery, setSearchQuery] = useState("");



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



  const filteredPages = availablePages.filter(
    (page) =>
      page.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader className="mb-2">
          <DialogTitle>Connect Channels</DialogTitle>
          <DialogDescription>
            Connect your Facebook pages, Twitter/X accounts, or LinkedIn
            channels to publish content.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs Control */}
        <div className="mb-4 flex rounded-lg bg-muted p-1">
          <button
            onClick={() => setActiveTab("oauth")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
              activeTab === "oauth"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            Facebook Pages
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
              activeTab === "manual"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            Other Platforms
          </button>
        </div>

        {activeTab === "oauth" ? (
          <>
            {/* Search bar */}
            <div className="relative mb-4">
              <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                type="text"
                placeholder="Search pages by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Page list */}
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1 pb-2">
              {filteredPages.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {availablePages.length === 0
                    ? "No pages found. Make sure your Facebook account manages at least one page."
                    : "No matching pages found."}
                </p>
              )}

              {filteredPages.map((page) => {
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
                          // eslint-disable-next-line @next/next/no-img-element
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
                        <Input
                          type="text"
                          value={selected.get(page.id)?.topic ?? ""}
                          onChange={(e) => setTopic(page.id, e.target.value)}
                          placeholder={`Topic (default: ${page.category})`}
                          className="h-8"
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Troubleshooting Section */}
              <div className="mt-4 rounded-lg bg-accent/40 p-3 border border-border/30 text-left">
                <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1">
                  💡 Missing pages or Business Portfolio assets?
                </p>
                <ol className="list-decimal pl-4 text-[10.5px] text-muted-foreground space-y-1">
                  <li>
                    <strong>Assign yourself to the Page:</strong> In your
                    <a
                      href="https://business.facebook.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand hover:underline mx-1"
                    >
                      Meta Business Suite
                    </a>
                    go to <strong>Settings</strong> &gt;{" "}
                    <strong>Business Assets</strong> &gt; <strong>Pages</strong>
                    , select your page, and make sure your profile is added
                    under <strong>People</strong> with full permission.
                  </li>
                  <li>
                    <strong>Reset App Permissions:</strong> Go to Facebook &gt;{" "}
                    <strong>Settings & Privacy</strong> &gt;{" "}
                    <strong>Settings</strong> &gt;{" "}
                    <strong>Business Integrations</strong>. Remove this app,
                    then click &quot;Connect Page&quot; again and check all
                    requested Page permissions.
                  </li>
                </ol>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4">
              <p className="text-xs text-muted-foreground">
                {selected.size} page{selected.size !== 1 ? "s" : ""} selected
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
                  onClick={handleConnect}
                  disabled={selected.size === 0 || loading}
                >
                  {loading && (
                    <Spinner size="sm" className="border-t-current" />
                  )}
                  {loading ? "Connecting…" : "Connect"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-5">
            {/* Quick platform OAuth connection buttons */}
            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 block">
                Automatic Account Logins
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.location.href = "/api/auth/twitter";
                  }}
                  className="gap-2 text-xs border-border/50 hover:bg-muted/40 cursor-pointer"
                >
                  Login with Twitter / X
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.location.href = "/api/auth/linkedin";
                  }}
                  className="gap-2 text-xs border-border/50 hover:bg-muted/40 cursor-pointer"
                >
                  Login with LinkedIn
                </Button>
              </div>
            </div>
            {/* Footer with cancel button */}
            <div className="mt-6 flex items-center justify-end border-t border-border/50 pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
