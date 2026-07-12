"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Save,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Gamepad2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPages, updatePage } from "@/actions/page.actions";
import { Spinner } from "@/components/shared/spinner";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PageSummary } from "@/types/page.types";

export default function SettingsPage() {
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState<string | null>(null);

  // Settings Form States indexed by page.id
  const [topics, setTopics] = useState<Record<string, string>>({});
  const [personas, setPersonas] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [games, setGames] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPages = pages.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.game?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
      const initialGames: Record<string, string> = {};

      result.data.forEach((p) => {
        initialTopics[p.id] = p.topic || "";
        initialPersonas[p.id] = p.personaPrompt || "";
        initialStatuses[p.id] = p.status || "ACTIVE";
        initialGames[p.id] = p.game || "";
      });

      setTopics(initialTopics);
      setPersonas(initialPersonas);
      setStatuses(initialStatuses);
      setGames(initialGames);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line
    loadPageSettings();
  }, []);

  const handleSavePageSettings = async (pageId: string) => {
    setSaveLoading(pageId);
    setNotification(null);

    const result = await updatePage(pageId, {
      topic: topics[pageId],
      personaPrompt: personas[pageId],
      status: statuses[pageId],
      game: games[pageId] || null,
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
          Configure AI preferences, publishing status, and target topics for
          each connected Facebook Page.
        </p>
      </div>

      {pages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 bg-card p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
          <Settings className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm font-medium text-foreground mb-1">
            No pages connected yet
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mb-4">
            Connect your first Facebook Page to configure AI personas, tones,
            and topics.
          </p>
          <Button
            size="sm"
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={() => (window.location.href = "/pages")}
          >
            Connect Pages
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="rounded-xl border border-border/40 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Search Settings
              </label>
              <input
                type="text"
                placeholder="Search by page name, topic, or game..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full max-w-md rounded-lg border border-border/50 bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/45 focus:border-brand/50 focus:outline-none"
              />
            </div>
          </div>

          {filteredPages.length > 0 ? (
            <div className="space-y-6">
              {filteredPages.map((page) => {
                const pageId = page.id;
                const isSaving = saveLoading === pageId;
                const pageNotif =
                  notification?.pageId === pageId ? notification : null;

                return (
                  <div
                    key={pageId}
                    className="rounded-xl border border-border/50 bg-card p-6 space-y-6"
                  >
                    {/* Page Header */}
                    <div className="flex items-center justify-between border-b border-border/50 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/50 overflow-hidden">
                          {page.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={page.avatarUrl}
                              alt={page.name}
                              className="h-10 w-10 object-cover"
                            />
                          ) : (
                            <Settings className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">
                            {page.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Facebook Page Settings
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Status Toggle */}
                        <Select
                          value={statuses[pageId] || "ACTIVE"}
                          onValueChange={(val) =>
                            setStatuses({
                              ...statuses,
                              [pageId]: val as string,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-[240px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE">
                              Active (Publishing Enabled)
                            </SelectItem>
                            <SelectItem value="PAUSED">
                              Paused (No Queue Publishing)
                            </SelectItem>
                            <SelectItem value="TOKEN_EXPIRING">
                              Token Expiring Warning
                            </SelectItem>
                            <SelectItem value="DISCONNECTED">
                              Disconnected (Requires Reconnect)
                            </SelectItem>
                          </SelectContent>
                        </Select>

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
                        <textarea
                          value={topics[pageId] || ""}
                          onChange={(e) =>
                            setTopics({ ...topics, [pageId]: e.target.value })
                          }
                          placeholder="e.g., Tactical football analysis, Indie gaming"
                          rows={8}
                          className="w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/30"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          This is parsed by the AI Content generator to
                          construct contextual copy and hashtags.
                        </p>
                      </div>

                      {/* Persona Prompt */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-brand" />
                          <label className="block text-xs font-medium text-foreground">
                            Description (AI Copywriter Persona / Instructions)
                          </label>
                        </div>
                        <textarea
                          value={personas[pageId] || ""}
                          onChange={(e) =>
                            setPersonas({
                              ...personas,
                              [pageId]: e.target.value,
                            })
                          }
                          placeholder="e.g., Sarcastic tactical analyst. Use dry humor and statistical comparisons."
                          rows={3}
                          className="w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/30"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Define the copywriting personality, tone styles,
                          banned phrases, or custom guidelines.
                        </p>
                      </div>
                    </div>

                    {/* Game Assignment */}
                    <div className="space-y-2 border-t border-border/40 pt-5">
                      <div className="flex items-center gap-1.5">
                        <Gamepad2 className="h-3.5 w-3.5 text-brand" />
                        <label className="block text-xs font-medium text-foreground">
                          Assigned Game
                        </label>
                      </div>
                      <Select
                        value={games[pageId] || ""}
                        onValueChange={(val) =>
                          setGames({ ...games, [pageId]: val as string })
                        }
                      >
                        <SelectTrigger className="h-9 w-full max-w-sm">
                          <SelectValue placeholder="— No Game Assigned —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">— No Game Assigned —</SelectItem>
                          <SelectItem value="Among Us">Among Us</SelectItem>
                          <SelectItem value="Apex Legends">
                            Apex Legends
                          </SelectItem>
                          <option value="ARK: Survival Ascended">
                            ARK: Survival Ascended
                          </option>
                          <SelectItem value="Assassin's Creed">
                            Assassin&apos;s Creed
                          </SelectItem>
                          <SelectItem value="Assetto Corsa">
                            Assetto Corsa
                          </SelectItem>
                          <SelectItem value="Baldur's Gate 3">
                            Baldur&apos;s Gate 3
                          </SelectItem>
                          <SelectItem value="BGMI">BGMI</SelectItem>
                          <option value="Call of Duty Mobile">
                            Call of Duty Mobile
                          </option>
                          <option value="Call of Duty: Warzone">
                            Call of Duty: Warzone
                          </option>
                          <SelectItem value="Counter-Strike 2">
                            Counter-Strike 2
                          </SelectItem>
                          <SelectItem value="Cyberpunk 2077">
                            Cyberpunk 2077
                          </SelectItem>
                          <SelectItem value="DayZ">DayZ</SelectItem>
                          <SelectItem value="Dead by Daylight">
                            Dead by Daylight
                          </SelectItem>
                          <SelectItem value="Dota 2">Dota 2</SelectItem>
                          <SelectItem value="EA Sports FC">
                            EA Sports FC
                          </SelectItem>
                          <SelectItem value="eFootball">eFootball</SelectItem>
                          <SelectItem value="Elden Ring">Elden Ring</SelectItem>
                          <option value="Euro Truck Simulator 2">
                            Euro Truck Simulator 2
                          </option>
                          <SelectItem value="Fall Guys">Fall Guys</SelectItem>
                          <SelectItem value="Fortnite">Fortnite</SelectItem>
                          <SelectItem value="Forza Horizon 4">
                            Forza Horizon 4
                          </SelectItem>
                          <SelectItem value="Forza Horizon 5">
                            Forza Horizon 5
                          </SelectItem>
                          <SelectItem value="Forza Horizon 6">
                            Forza Horizon 6
                          </SelectItem>
                          <SelectItem value="Free Fire">Free Fire</SelectItem>
                          <SelectItem value="Free Fire MAX">
                            Free Fire MAX
                          </SelectItem>
                          <SelectItem value="Genshin Impact">
                            Genshin Impact
                          </SelectItem>
                          <SelectItem value="Ghost of Tsushima">
                            Ghost of Tsushima
                          </SelectItem>
                          <option value="God of War Ragnarök">
                            God of War Ragnarök
                          </option>
                          <SelectItem value="Gran Turismo">
                            Gran Turismo
                          </SelectItem>
                          <SelectItem value="GTA III">GTA III</SelectItem>
                          <SelectItem value="GTA IV">GTA IV</SelectItem>
                          <SelectItem value="GTA Online">GTA Online</SelectItem>
                          <SelectItem value="GTA San Andreas">
                            GTA San Andreas
                          </SelectItem>
                          <SelectItem value="GTA V">GTA V</SelectItem>
                          <SelectItem value="GTA VI">GTA VI</SelectItem>
                          <SelectItem value="GTA Vice City">
                            GTA Vice City
                          </SelectItem>
                          <SelectItem value="Hogwarts Legacy">
                            Hogwarts Legacy
                          </SelectItem>
                          <SelectItem value="Honkai: Star Rail">
                            Honkai: Star Rail
                          </SelectItem>
                          <SelectItem value="League of Legends">
                            League of Legends
                          </SelectItem>
                          <SelectItem value="Lethal Company">
                            Lethal Company
                          </SelectItem>
                          <option value="Marvel's Spider-Man">
                            Marvel&apos;s Spider-Man
                          </option>
                          <SelectItem value="Minecraft">Minecraft</SelectItem>
                          <SelectItem value="Mobile Legends">
                            Mobile Legends
                          </SelectItem>
                          <SelectItem value="NBA 2K">NBA 2K</SelectItem>
                          <SelectItem value="Need for Speed">
                            Need for Speed
                          </SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                          <SelectItem value="Overwatch 2">
                            Overwatch 2
                          </SelectItem>
                          <SelectItem value="Palworld">Palworld</SelectItem>
                          <SelectItem value="Phasmophobia">
                            Phasmophobia
                          </SelectItem>
                          <SelectItem value="PUBG Mobile">
                            PUBG Mobile
                          </SelectItem>
                          <option value="PUBG: Battlegrounds">
                            PUBG: Battlegrounds
                          </option>
                          <SelectItem value="Rainbow Six Siege">
                            Rainbow Six Siege
                          </SelectItem>
                          <option value="Red Dead Redemption 2">
                            Red Dead Redemption 2
                          </option>
                          <SelectItem value="Resident Evil">
                            Resident Evil
                          </SelectItem>
                          <SelectItem value="Roblox">Roblox</SelectItem>
                          <SelectItem value="Rust">Rust</SelectItem>
                          <SelectItem value="Silent Hill">
                            Silent Hill
                          </SelectItem>
                          <SelectItem value="Stardew Valley">
                            Stardew Valley
                          </SelectItem>
                          <SelectItem value="Terraria">Terraria</SelectItem>
                          <option value="The Elder Scrolls V: Skyrim">
                            The Elder Scrolls V: Skyrim
                          </option>
                          <SelectItem value="The Witcher 3">
                            The Witcher 3
                          </SelectItem>
                          <SelectItem value="Valorant">Valorant</SelectItem>
                          <SelectItem value="Wuthering Waves">
                            Wuthering Waves
                          </SelectItem>
                          <SelectItem value="WWE 2K">WWE 2K</SelectItem>
                          <SelectItem value="Zenless Zone Zero">
                            Zenless Zone Zero
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Assign a game for visibility. This label is displayed on
                        the page card for easy identification.
                      </p>
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
          ) : (
            <EmptyState
              icon={Settings}
              title="No settings match your search"
              description={`No settings found matching "${searchQuery}". Try a different search term.`}
            />
          )}
        </div>
      )}
    </div>
  );
}
