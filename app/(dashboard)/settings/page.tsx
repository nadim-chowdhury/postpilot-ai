"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPages, updatePage } from "@/actions/page.actions";
import { Spinner } from "@/components/shared/spinner";
import type { PageSummary } from "@/types/page.types";

export default function SettingsPage() {
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState<string | null>(null);
  
  // Settings Form States indexed by page.id
  const [topics, setTopics] = useState<Record<string, string>>({});
  const [personas, setPersonas] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  // Message notifications
  const [notification, setNotification] = useState<{
    pageId: string;
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadPageSettings = async () => {
    setLoading(true);
    const result = await getPages();
    if (result.success && result.data) {
      setPages(result.data);
      
      // Initialize form values
      const initialTopics: Record<string, string> = {};
      const initialPersonas: Record<string, string> = {};
      const initialStatuses: Record<string, string> = {};
      
      result.data.forEach((p) => {
        initialTopics[p.id] = p.topic || "";
        initialPersonas[p.id] = p.personaPrompt || "";
        initialStatuses[p.id] = p.status || "ACTIVE";
      });
      
      setTopics(initialTopics);
      setPersonas(initialPersonas);
      setStatuses(initialStatuses);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPageSettings();
  }, []);

  const handleSavePageSettings = async (pageId: string) => {
    setSaveLoading(pageId);
    setNotification(null);
    
    const result = await updatePage(pageId, {
      topic: topics[pageId],
      personaPrompt: personas[pageId],
      status: statuses[pageId],
    });

    if (result.success) {
      setNotification({
        pageId,
        type: "success",
        message: "Settings saved successfully!",
      });
    } else {
      setNotification({
        pageId,
        type: "error",
        message: result.error || "Failed to save settings.",
      });
    }
    setSaveLoading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure AI preferences, publishing status, and target topics for each connected Facebook Page.
        </p>
      </div>

      {pages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 bg-card p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
          <Settings className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm font-medium text-foreground mb-1">No pages connected yet</p>
          <p className="text-xs text-muted-foreground max-w-sm mb-4">
            Connect your first Facebook Page to configure AI personas, tones, and topics.
          </p>
          <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => window.location.href = "/pages"}>
            Connect Pages
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {pages.map((page) => {
            const pageId = page.id;
            const isSaving = saveLoading === pageId;
            const pageNotif = notification?.pageId === pageId ? notification : null;

            return (
              <div key={pageId} className="rounded-xl border border-border/50 bg-card p-6 space-y-6">
                {/* Page Header */}
                <div className="flex items-center justify-between border-b border-border/50 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/50 overflow-hidden">
                      {page.avatarUrl ? (
                        <img src={page.avatarUrl} alt={page.name} className="h-10 w-10 object-cover" />
                      ) : (
                        <Settings className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{page.name}</h3>
                      <p className="text-xs text-muted-foreground">Page Configuration Settings</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status Toggle */}
                    <select
                      value={statuses[pageId] || "ACTIVE"}
                      onChange={(e) => setStatuses({ ...statuses, [pageId]: e.target.value })}
                      className="h-8 rounded-lg border border-border/50 bg-background px-2.5 text-xs text-foreground focus:border-brand/50 focus:outline-none"
                    >
                      <option value="ACTIVE">Active (Publishing Enabled)</option>
                      <option value="PAUSED">Paused (No Queue Publishing)</option>
                      <option value="TOKEN_EXPIRING">Token Expiring Warning</option>
                      <option value="DISCONNECTED">Disconnected (Requires Reconnect)</option>
                    </select>

                    <Button
                      size="sm"
                      className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
                      onClick={() => handleSavePageSettings(pageId)}
                      disabled={isSaving}
                    >
                      <Save className="h-3.5 w-3.5" />
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>

                {/* Settings Input Grid */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Topic Configuration */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-foreground">
                      Target Topic/Niche
                    </label>
                    <input
                      type="text"
                      value={topics[pageId] || ""}
                      onChange={(e) => setTopics({ ...topics, [pageId]: e.target.value })}
                      placeholder="e.g., Tactical football analysis, Indie gaming"
                      className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/30"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      This is parsed by the AI Content generator to construct contextual copy and hashtags.
                    </p>
                  </div>

                  {/* Persona Prompt */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-brand" />
                      <label className="block text-xs font-medium text-foreground">
                        AI Copywriter Persona / Instructions
                      </label>
                    </div>
                    <textarea
                      value={personas[pageId] || ""}
                      onChange={(e) => setPersonas({ ...personas, [pageId]: e.target.value })}
                      placeholder="e.g., Sarcastic tactical analyst. Use dry humor and statistical comparisons."
                      rows={3}
                      className="w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/30"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Define the copywriting personality, tone styles, banned phrases, or custom guidelines.
                    </p>
                  </div>
                </div>

                {/* Notifications Alert */}
                {pageNotif && (
                  <div
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                      pageNotif.type === "success"
                        ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                        : "border-red-500/20 bg-red-500/5 text-red-400"
                    }`}
                  >
                    {pageNotif.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span>{pageNotif.message}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
