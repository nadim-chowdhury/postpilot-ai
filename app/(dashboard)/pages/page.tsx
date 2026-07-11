"use client";

import { useState, useEffect } from "react";
import { Globe, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageCard } from "@/components/pages/page-card";
import { ConnectPageDialog } from "@/components/pages/connect-page-dialog";
import { EditPageDialog } from "@/components/pages/edit-page-dialog";
import { getPages, togglePageStatus, disconnectPage, updatePage } from "@/actions/page.actions";
import type { PageSummary } from "@/types/page.types";

export default function PagesPage() {
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectOpen, setConnectOpen] = useState(false);
  const [editPage, setEditPage] = useState<PageSummary | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
          onClick={() => setConnectOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Connect Page
        </Button>
      </div>

      {/* Page grid */}
      {pages.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              onEdit={setEditPage}
              onToggleStatus={handleToggleStatus}
              onDisconnect={handleDisconnect}
            />
          ))}
        </div>
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
              onClick={() => setConnectOpen(true)}
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
        availablePages={[]}
        onConnect={async () => {
          // TODO: Wire up OAuth flow to populate availablePages
          setConnectOpen(false);
          await fetchPages();
        }}
        loading={actionLoading}
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
