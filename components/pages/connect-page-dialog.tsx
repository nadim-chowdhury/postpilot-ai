"use client";

import { useState } from "react";
import { X, Globe, Check, Search, Cpu, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    pages: { metaPageId: string; name: string; topic: string; avatarUrl?: string }[],
  ) => void;
  onConnectManually?: (data: {
    metaPageId: string;
    accessToken: string;
    topic: string;
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
  const [selected, setSelected] = useState<
    Map<string, { topic: string }>
  >(new Map());
  const [searchQuery, setSearchQuery] = useState("");

  // Manual configuration form state
  const [manualPageId, setManualPageId] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [manualTopic, setManualTopic] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

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

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPageId.trim() || !manualToken.trim()) {
      alert("Please enter both Page ID and Page Access Token.");
      return;
    }
    if (!onConnectManually) return;

    setManualLoading(true);
    const success = await onConnectManually({
      metaPageId: manualPageId.trim(),
      accessToken: manualToken.trim(),
      topic: manualTopic.trim(),
    });
    setManualLoading(false);

    if (success) {
      // Clear form
      setManualPageId("");
      setManualToken("");
      setManualTopic("");
      onClose();
    }
  };

  const filteredPages = availablePages.filter(
    (page) =>
      page.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Connect Pages
            </h2>
            <p className="text-xs text-muted-foreground">
              Connect your Facebook Pages to publish content.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

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
            Facebook Account
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
            Manual Token
          </button>
        </div>

        {activeTab === "oauth" ? (
          <>
            {/* Search bar */}
            <div className="relative mb-4">
              <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Search pages by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-lg border border-border/50 bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/30"
              />
            </div>

            {/* Page list */}
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
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

              {/* Troubleshooting Section */}
              <div className="mt-4 rounded-lg bg-accent/40 p-3 border border-border/30 text-left">
                <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1">💡 Missing pages or Business Portfolio assets?</p>
                <ol className="list-decimal pl-4 text-[10.5px] text-muted-foreground space-y-1">
                  <li>
                    <strong>Assign yourself to the Page:</strong> In your 
                    <a href="https://business.facebook.com/" target="_blank" rel="noreferrer" className="text-brand hover:underline mx-1">Meta Business Suite</a> 
                    go to <strong>Settings</strong> &gt; <strong>Business Assets</strong> &gt; <strong>Pages</strong>, select your page, and make sure your profile is added under <strong>People</strong> with full permission.
                  </li>
                  <li>
                    <strong>Reset App Permissions:</strong> Go to Facebook &gt; <strong>Settings & Privacy</strong> &gt; <strong>Settings</strong> &gt; <strong>Business Integrations</strong>. Remove this app, then click "Connect Page" again and check all requested Page permissions.
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
                <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
                  onClick={handleConnect}
                  disabled={selected.size === 0 || loading}
                >
                  {loading && <Spinner size="sm" className="border-t-current" />}
                  {loading ? "Connecting…" : "Connect"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            {/* Meta Page ID */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Meta Page ID
              </label>
              <input
                type="text"
                placeholder="e.g. 1048203859203"
                value={manualPageId}
                onChange={(e) => setManualPageId(e.target.value)}
                required
                className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/30"
              />
            </div>

            {/* Page Access Token */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Page Access Token
              </label>
              <input
                type="password"
                placeholder="Paste EAAB... token here"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                required
                className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/30"
              />
            </div>

            {/* Topic */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Topic / Category
              </label>
              <input
                type="text"
                placeholder="e.g. Gaming, Tech News"
                value={manualTopic}
                onChange={(e) => setManualTopic(e.target.value)}
                className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/30"
              />
            </div>

            {/* Helper Info */}
            <div className="rounded-lg bg-accent/40 p-3 border border-border/30 text-left">
              <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Cpu className="h-3 w-3 text-brand" />
                How to get a Page Access Token:
              </p>
              <ol className="list-decimal pl-4 text-[10.5px] text-muted-foreground space-y-1">
                <li>
                  Go to the 
                  <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="text-brand hover:underline mx-1">Graph API Explorer</a>.
                </li>
                <li>Select your Meta App and choose <strong>Get User Access Token</strong> with the scopes: <code>pages_manage_posts</code> and <code>pages_show_list</code>.</li>
                <li>In the <strong>User or Page</strong> dropdown, choose your Page (e.g. <code>Gamerxlieo</code>). Facebook will swap your token for a Page token.</li>
                <li>Copy the Access Token and Page ID displayed at the top, and paste them here!</li>
              </ol>
            </div>

            {/* Footer */}
            <div className="mt-5 flex items-center justify-end gap-2 border-t border-border/50 pt-4">
              <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={manualLoading}>
                Cancel
              </Button>
              <Button
                size="sm"
                type="submit"
                className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
                disabled={manualLoading}
              >
                {manualLoading && <Spinner size="sm" className="border-t-current" />}
                {manualLoading ? "Connecting…" : "Connect Manually"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
