"use client";

import { useState, useEffect } from "react";
import { Globe, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageCard } from "@/components/pages/page-card";
import { ConnectPageDialog } from "@/components/pages/connect-page-dialog";
import { EditPageDialog } from "@/components/pages/edit-page-dialog";
import { getPages, togglePageStatus, disconnectPage, updatePage, fetchAvailablePages, connectPages } from "@/actions/page.actions";
import type { PageSummary } from "@/types/page.types";

export default function PagesPage() {
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectOpen, setConnectOpen] = useState(false);
  const [availablePages, setAvailablePages] = useState<any[]>([]);
  const [fetchingAvailable, setFetchingAvailable] = useState(false);
  const [editPage, setEditPage] = useState<PageSummary | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPages = pages.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.topic?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const fetchPages = async () => {
    setLoading(true);
    const result = await getPages();
    if (result.success) {
      setPages(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleOpenConnect = async () => {
    setConnectOpen(true);
    setFetchingAvailable(true);
    const result = await fetchAvailablePages();
    if (result.success) {
      setAvailablePages(result.data);
    } else {
      alert(result.error || "Failed to load pages from Facebook. Make sure you are logged in.");
      setConnectOpen(false);
    }
    setFetchingAvailable(false);
  };

  const handleConnectPages = async (
    selectedPages: { metaPageId: string; name: string; topic: string; avatarUrl?: string }[],
  ) => {
    setActionLoading(true);
    const result = await connectPages(selectedPages);

    if (result.success) {
      setConnectOpen(false);
      await fetchPages();
    } else {
      alert(result.error || "Failed to connect pages");
    }
    setActionLoading(false);
  };

  const handleToggleStatus = async (pageId: string) => {
    setActionLoading(true);
    const result = await togglePageStatus(pageId);
    if (result.success) {
      await fetchPages();
    }
    setActionLoading(false);
  };

  const handleDisconnect = async (pageId: string) => {
    if (!confirm("Are you sure you want to disconnect this page?")) return;
    setActionLoading(true);
    const result = await disconnectPage(pageId);
    if (result.success) {
      await fetchPages();
    }
    setActionLoading(false);
  };

  const handleSaveEdit = async (
    pageId: string,
    data: { topic: string; personaPrompt: string },
  ) => {
    setActionLoading(true);
    const result = await updatePage(pageId, data);
    if (result.success) {
      setEditPage(null);
      await fetchPages();
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Pages</h2>
          <p className="text-sm text-muted-foreground">
            Manage your connected Facebook Pages.
          </p>
        </div>
        <Button
          className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={handleOpenConnect}
        >
          <Plus className="h-4 w-4" />
          Connect Page
        </Button>
      </div>

      {/* Search Bar */}
      {pages.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card p-4 shadow-sm">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Search Pages
            </label>
            <input
              type="text"
              placeholder="Search by page name or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full max-w-md rounded-lg border border-border/50 bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/45 focus:border-brand/50 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Page grid */}
      {filteredPages.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPages.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              onEdit={setEditPage}
              onToggleStatus={handleToggleStatus}
              onDisconnect={handleDisconnect}
            />
          ))}
        </div>
      ) : pages.length > 0 && searchQuery ? (
        <EmptyState
          icon={Globe}
          title="No pages match your search"
          description={`No pages found matching "${searchQuery}". Try a different search term.`}
        />
      ) : (
        <EmptyState
          icon={Globe}
          title="No pages connected"
          description="Connect your Facebook Pages to start automating content publishing."
          action={
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleOpenConnect}
            >
              <Globe className="h-3.5 w-3.5" />
              Connect your first page
            </Button>
          }
        />
      )}

      {/* Connect dialog */}
      <ConnectPageDialog
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        availablePages={availablePages}
        onConnect={handleConnectPages}
        loading={actionLoading || fetchingAvailable}
      />

      {/* Edit dialog */}
      <EditPageDialog
        open={!!editPage}
        page={editPage}
        onClose={() => setEditPage(null)}
        onSave={handleSaveEdit}
        loading={actionLoading}
      />
    </div>
  );
}
