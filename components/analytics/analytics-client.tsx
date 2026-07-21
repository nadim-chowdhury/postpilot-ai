"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/shared/spinner";
import { EmptyState } from "@/components/shared/empty-state";
import {
  syncPostInsights,
  getDashboardAnalytics,
  generateAnalyticsSuggestions,
  getMultiPageComparisonStats,
  AnalyticsSummary,
  MultiPageComparisonData,
} from "@/actions/analytics.actions";
import {
  RefreshCw,
  ThumbsUp,
  MessageCircle,
  Share2,
  LineChart as LineChartIcon,
  Sparkles,
  CalendarCheck,
  Globe,
  GitCompare,
  Check,
  Layers,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import type { PageSummary } from "@/types/page.types";

interface TopPost {
  id: string;
  title: string | null;
  body: string;
  publishedAt: Date | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  engagementScore: number;
  aiGenerated: boolean;
}

// Recharts line chart colors for comparing up to 8 pages
const COMPARISON_COLORS = [
  "var(--color-brand)", // Page 1
  "oklch(0.65 0.17 145)", // Emerald/Green Page 2
  "oklch(0.65 0.22 330)", // Pink Page 3
  "oklch(0.55 0.21 280)", // Purple Page 4
  "oklch(0.7 0.18 50)",   // Orange Page 5
  "oklch(0.6 0.15 200)",  // Teal Page 6
  "oklch(0.75 0.15 85)",  // Yellow Page 7
  "oklch(0.5 0.1 20)",    // Dark Red Page 8
];

export default function AnalyticsClient({ pages }: { pages: PageSummary[] }) {
  const [activeTab, setActiveTab] = useState<"single" | "compare">("single");
  const [selectedPage, setSelectedPage] = useState<string>(pages[0]?.id || "");
  const [singleData, setSingleData] = useState<AnalyticsSummary[]>([]);
  const [topPost, setTopPost] = useState<TopPost | null>(null);
  
  // Date Range State
  const [datePreset, setDatePreset] = useState<string>("30d");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Comparison State
  const [selectedComparePages, setSelectedComparePages] = useState<string[]>(
    pages.slice(0, 3).map((p) => p.id)
  );
  const [comparisonData, setComparisonData] = useState<MultiPageComparisonData | null>(null);

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string>("");

  // Resolves start/end dates based on presets
  const getDateRange = useCallback((preset: string, start?: string, end?: string) => {
    let resolvedStart = start || startDate;
    let resolvedEnd = end || endDate;

    if (preset !== "custom") {
      const days = preset === "7d" ? 7 : preset === "14d" ? 14 : preset === "90d" ? 90 : 30;
      const d = new Date();
      d.setDate(d.getDate() - days);
      resolvedStart = d.toISOString().split("T")[0];
      resolvedEnd = new Date().toISOString().split("T")[0];
    }
    return { start: resolvedStart, end: resolvedEnd };
  }, [startDate, endDate]);

  const loadSingleData = useCallback(async (pageId: string, preset: string, start?: string, end?: string) => {
    setLoading(true);
    setAiSuggestion("");
    const range = getDateRange(preset, start, end);
    try {
      // Re-using the single page stats endpoint with custom date range
      const res = await getMultiPageComparisonStats([pageId], {
        startDate: range.start,
        endDate: range.end,
      });
      if (res.success && res.data) {
        // Map comparison timeline format to AnalyticsSummary format
        const formattedTimeline = res.data.timeline.map((entry) => ({
          date: entry.date,
          likes: (entry[`${pageId}_likes`] as number) || 0,
          comments: (entry[`${pageId}_comments`] as number) || 0,
          shares: (entry[`${pageId}_shares`] as number) || 0,
          totalPosts: (entry[`${pageId}_posts`] as number) || 0,
        }));
        setSingleData(formattedTimeline);

        // Fetch top post from dashboard analytics for now, or fall back
        const rawDashboardRes = await getDashboardAnalytics(pageId);
        if (rawDashboardRes.success && rawDashboardRes.data) {
          setTopPost(rawDashboardRes.data.topPost);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  const loadComparisonData = useCallback(async (pageIds: string[], preset: string, start?: string, end?: string) => {
    setLoading(true);
    const range = getDateRange(preset, start, end);
    try {
      const res = await getMultiPageComparisonStats(pageIds, {
        startDate: range.start,
        endDate: range.end,
      });
      if (res.success && res.data) {
        setComparisonData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    if (activeTab === "single" && selectedPage) {
      const timer = setTimeout(() => {
        loadSingleData(selectedPage, datePreset, startDate, endDate);
      }, 0);
      return () => clearTimeout(timer);
    } else if (activeTab === "compare" && selectedComparePages.length > 0) {
      const timer = setTimeout(() => {
        loadComparisonData(selectedComparePages, datePreset, startDate, endDate);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [
    selectedPage,
    activeTab,
    selectedComparePages,
    datePreset,
    startDate,
    endDate,
    loadSingleData,
    loadComparisonData,
  ]);

  const handleSync = async () => {
    if (!selectedPage) return;
    setSyncing(true);
    try {
      await syncPostInsights(selectedPage);
      await loadSingleData(selectedPage, datePreset, startDate, endDate);
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!selectedPage || !topPost) return;
    setAiLoading(true);
    try {
      const pageName = pages.find((p) => p.id === selectedPage)?.name || "Unknown";
      const res = await generateAnalyticsSuggestions(
        pageName,
        topPost.body,
        topPost.likesCount || 0
      );
      if (res.success && res.data) {
        setAiSuggestion(res.data.suggestion);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const toggleComparePage = (pageId: string) => {
    setSelectedComparePages((prev) => {
      if (prev.includes(pageId)) {
        if (prev.length <= 1) return prev; // Keep at least one selected
        return prev.filter((id) => id !== pageId);
      }
      return [...prev, pageId];
    });
  };

  const applyCustomDates = () => {
    if (activeTab === "single") {
      loadSingleData(selectedPage, "custom", startDate, endDate);
    } else {
      loadComparisonData(selectedComparePages, "custom", startDate, endDate);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Tabs Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center rounded-xl bg-card border border-border/40 p-1 shadow-xs shrink-0">
          <button
            onClick={() => setActiveTab("single")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
              activeTab === "single"
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LineChartIcon className="h-4 w-4" />
            Single Channel Analysis
          </button>
          <button
            onClick={() => setActiveTab("compare")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
              activeTab === "compare"
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GitCompare className="h-4 w-4" />
            Compare Channels
          </button>
        </div>

        {/* Dynamic Period Control */}
        <div className="flex items-center rounded-xl bg-card border border-border/40 p-1.5 shadow-xs flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground px-2">
            <CalendarCheck className="h-4 w-4 text-brand" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">Range:</span>
          </div>
          <div className="flex items-center rounded-lg bg-muted p-0.5">
            {["7d", "14d", "30d", "90d", "custom"].map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setDatePreset(preset);
                  if (preset !== "custom") {
                    const range = getDateRange(preset);
                    if (activeTab === "single") {
                      loadSingleData(selectedPage, preset, range.start, range.end);
                    } else {
                      loadComparisonData(selectedComparePages, preset, range.start, range.end);
                    }
                  }
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all",
                  datePreset === preset
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {preset.toUpperCase()}
              </button>
            ))}
          </div>

          {datePreset === "custom" && (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-7 rounded-md border border-border/50 bg-background px-1.5 text-xs text-foreground focus:outline-none"
              />
              <span className="text-muted-foreground text-[10px]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-7 rounded-md border border-border/50 bg-background px-1.5 text-xs text-foreground focus:outline-none"
              />
              <Button
                size="sm"
                onClick={applyCustomDates}
                className="h-7 text-[10px] bg-brand text-brand-foreground hover:bg-brand/90 px-2"
              >
                Go
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── SINGLE MODE CONTROLS ── */}
      {activeTab === "single" && (
        <div className="rounded-xl border border-border/40 bg-card p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end justify-between">
            <div className="flex-1 max-w-sm space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Select Channel
              </label>
              <Select
                value={selectedPage}
                onValueChange={(val) => {
                  if (val) setSelectedPage(val);
                }}
              >
                <SelectTrigger className="h-9 w-full mb-0">
                  <SelectValue placeholder="Select Channel">
                    {pages.find((p) => p.id === selectedPage)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {pages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSync}
              disabled={syncing || !selectedPage}
              className="h-9 bg-brand text-brand-foreground hover:bg-brand/90 gap-2 shrink-0 self-stretch sm:self-auto"
            >
              {syncing ? (
                <Spinner size="sm" className="border-t-brand-foreground" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync Latest Insights
            </Button>
          </div>
        </div>
      )}

      {/* ── COMPARE MODE CONTROLS ── */}
      {activeTab === "compare" && (
        <div className="rounded-xl border border-border/40 bg-card p-4 shadow-sm space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Select Channels to Compare (Check to add)
            </label>
            <div className="flex flex-wrap gap-2">
              {pages.map((p) => {
                const isSelected = selectedComparePages.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleComparePage(p.id)}
                    className={cn(
                      "flex items-center gap-2 border rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                      isSelected
                        ? "bg-brand/10 border-brand text-brand"
                        : "bg-background border-border/50 text-muted-foreground hover:border-border"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 shrink-0" />}
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── loading state ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="md" />
        </div>
      ) : activeTab === "single" ? (
        /* ── SINGLE PAGE ANALYSIS LAYOUT ── */
        singleData.length === 0 ? (
          <EmptyState
            icon={LineChartIcon}
            title="No analytics data available"
            description="We couldn't find any post activity for this page in the selected date range."
            action={
              <Button
                onClick={handleSync}
                disabled={syncing}
                variant="outline"
                className="mt-2"
              >
                {syncing && <Spinner size="sm" className="mr-2" />}
                Sync Meta Data
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Main Chart */}
            <Card className="md:col-span-2 rounded-xl border border-border/50 hover:border-border hover:shadow-sm ring-0">
              <CardHeader>
                <CardTitle>Engagement Timeline</CardTitle>
                <CardDescription>
                  Likes, comments, and shares over the selected period.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={singleData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--color-border)"
                        opacity={0.5}
                      />
                      <XAxis
                        dataKey="date"
                        stroke="var(--color-muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) =>
                          new Date(value).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        }
                      />
                      <YAxis
                        stroke="var(--color-muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid var(--color-border)",
                          backgroundColor: "var(--color-background)",
                          color: "var(--color-foreground)",
                          fontSize: "12px",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="likes"
                        stroke="var(--color-brand)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="comments"
                        stroke="var(--color-chart-2)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="shares"
                        stroke="var(--color-chart-3)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Post & AI Suggestions */}
            <div className="space-y-6">
              {topPost && (
                <Card className="rounded-xl border border-border/50 hover:border-border hover:shadow-sm ring-0">
                  <CardHeader>
                    <CardTitle className="text-lg">Top Performing Post</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg bg-muted/50 p-4 mb-4 text-sm line-clamp-4 text-foreground/90 border border-border/40">
                      {topPost.body}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground font-medium">
                      <div className="flex items-center">
                        <ThumbsUp className="w-4 h-4 mr-1.5 text-brand" />{" "}
                        {topPost.likesCount || 0}
                      </div>
                      <div className="flex items-center">
                        <MessageCircle className="w-4 h-4 mr-1.5 text-chart-2" />{" "}
                        {topPost.commentsCount || 0}
                      </div>
                      <div className="flex items-center">
                        <Share2 className="w-4 h-4 mr-1.5 text-chart-3" />{" "}
                        {topPost.sharesCount || 0}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-xl hover:shadow-sm relative overflow-hidden ring-0 border border-border/50 hover:border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center text-foreground gap-2">
                    <Sparkles className="h-5 w-5 text-brand animate-pulse" />
                    AI Content Strategist
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!aiSuggestion ? (
                    <Button
                      onClick={handleGenerateAI}
                      disabled={aiLoading || !topPost}
                      className="w-full bg-brand text-brand-foreground hover:bg-brand/90 gap-2"
                      size="sm"
                    >
                      {aiLoading && (
                        <Spinner
                          size="sm"
                          className="border-t-brand-foreground"
                        />
                      )}
                      Analyze & Suggest Content
                    </Button>
                  ) : (
                    <div className="text-sm space-y-3 [&>h3]:font-semibold [&>h3]:text-foreground [&>h3]:mt-4 [&>p]:text-muted-foreground [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:ml-4 [&>ul]:text-muted-foreground [&>ul]:space-y-1.5 [&>ul]:my-2 [&>strong]:text-foreground">
                      <ReactMarkdown>{aiSuggestion}</ReactMarkdown>
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateAI}
                          disabled={aiLoading}
                          className="w-full text-xs h-8 mt-2 gap-2"
                        >
                          {aiLoading ? (
                            <Spinner size="sm" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Regenerate Strategy
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )
      ) : (
        /* ── COMPARATIVE ANALYSIS LAYOUT ── */
        !comparisonData || comparisonData.pagePerformance.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-xl border border-border/40 shadow-xs">
            <Globe className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-semibold text-foreground">Select channels to start comparing</p>
            <p className="text-xs text-muted-foreground/75 mt-1">Select one or more active social channels above.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards Row */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="rounded-xl border border-border/50 p-4 hover:shadow-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Top Performing Channel</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="h-8 w-8 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold">
                    🏆
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground truncate max-w-[150px]">
                      {
                        comparisonData.pagePerformance.reduce((prev, current) =>
                          (prev.totalEngagement > current.totalEngagement) ? prev : current
                        ).name
                      }
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      {comparisonData.pagePerformance.reduce((prev, current) =>
                        (prev.totalEngagement > current.totalEngagement) ? prev : current
                      ).totalEngagement.toLocaleString()} total engagement
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-xl border border-border/50 p-4 hover:shadow-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Most Active Channel</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                    ✍️
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground truncate max-w-[150px]">
                      {
                        comparisonData.pagePerformance.reduce((prev, current) =>
                          (prev.totalPosts > current.totalPosts) ? prev : current
                        ).name
                      }
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      {comparisonData.pagePerformance.reduce((prev, current) =>
                        (prev.totalPosts > current.totalPosts) ? prev : current
                      ).totalPosts} posts published
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-xl border border-border/50 p-4 hover:shadow-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">AI Automation Leader</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="h-8 w-8 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold">
                    🤖
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground truncate max-w-[150px]">
                      {
                        comparisonData.pagePerformance.reduce((prev, current) =>
                          (prev.aiRatio > current.aiRatio) ? prev : current
                        ).name
                      }
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      {comparisonData.pagePerformance.reduce((prev, current) =>
                        (prev.aiRatio > current.aiRatio) ? prev : current
                      ).aiRatio}% AI-generated ratio
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-xl border border-border/50 p-4 hover:shadow-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Highest Efficiency Rate</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="h-8 w-8 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
                    ⚡
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground truncate max-w-[150px]">
                      {
                        comparisonData.pagePerformance.reduce((prev, current) => {
                          const prevRate = prev.postedCount > 0 ? prev.totalEngagement / prev.postedCount : 0;
                          const currRate = current.postedCount > 0 ? current.totalEngagement / current.postedCount : 0;
                          return prevRate > currRate ? prev : current;
                        }).name
                      }
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      {Math.round(
                        comparisonData.pagePerformance.reduce((prev, current) => {
                          const prevRate = prev.postedCount > 0 ? prev.totalEngagement / prev.postedCount : 0;
                          const currRate = current.postedCount > 0 ? current.totalEngagement / current.postedCount : 0;
                          return prevRate > currRate ? prev : current;
                        }).totalEngagement / Math.max(1, comparisonData.pagePerformance.reduce((prev, current) => {
                          const prevRate = prev.postedCount > 0 ? prev.totalEngagement / prev.postedCount : 0;
                          const currRate = current.postedCount > 0 ? current.totalEngagement / current.postedCount : 0;
                          return prevRate > currRate ? prev : current;
                        }).postedCount)
                      )} avg engagement/post
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Comparison Charts */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              {/* Comparative Timeline */}
              <Card className="lg:col-span-2 rounded-xl border border-border/50 hover:border-border hover:shadow-sm ring-0">
                <CardHeader>
                  <CardTitle>Comparative Engagement Timeline</CardTitle>
                  <CardDescription>
                    Total Engagement Score comparison per channel over date range.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {comparisonData.timeline.length > 0 ? (
                    <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={comparisonData.timeline}
                          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="var(--color-border)"
                            opacity={0.5}
                          />
                          <XAxis
                            dataKey="date"
                            stroke="var(--color-muted-foreground)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) =>
                              new Date(value).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })
                            }
                          />
                          <YAxis
                            stroke="var(--color-muted-foreground)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: "8px",
                              border: "1px solid var(--color-border)",
                              backgroundColor: "var(--color-background)",
                              color: "var(--color-foreground)",
                              fontSize: "12px",
                            }}
                          />
                          <Legend />
                          {selectedComparePages.map((pageId, idx) => {
                            const name = comparisonData.pages[pageId]?.name || "Channel";
                            return (
                              <Line
                                key={pageId}
                                type="monotone"
                                dataKey={`${pageId}_engagement`}
                                name={name}
                                stroke={COMPARISON_COLORS[idx % COMPARISON_COLORS.length]}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[320px] text-xs text-muted-foreground">
                      No comparative engagement data found for selected period
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Engagement Share Bar */}
              <Card className="rounded-xl border border-border/50 hover:border-border hover:shadow-sm ring-0">
                <CardHeader>
                  <CardTitle>Engagement Share</CardTitle>
                  <CardDescription>
                    Total Engagement Share per channel.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={comparisonData.pagePerformance}
                        margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="var(--color-border)"
                          opacity={0.5}
                        />
                        <XAxis
                          dataKey="name"
                          stroke="var(--color-muted-foreground)"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) =>
                            value.length > 10 ? `${value.slice(0, 10)}...` : value
                          }
                        />
                        <YAxis
                          stroke="var(--color-muted-foreground)"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid var(--color-border)",
                            backgroundColor: "var(--color-background)",
                            color: "var(--color-foreground)",
                            fontSize: "11px",
                          }}
                        />
                        <Bar
                          dataKey="totalEngagement"
                          name="Total Engagement"
                          radius={[6, 6, 0, 0]}
                          barSize={30}
                        >
                          {comparisonData.pagePerformance.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COMPARISON_COLORS[index % COMPARISON_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Comparative Performance Grid */}
            <Card className="rounded-xl border border-border/50 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-5 w-5 text-brand" />
                  Comparative Channel Datagrid
                </CardTitle>
                <CardDescription>
                  Side-by-side performance statistics for all compared channels.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs text-foreground/90">
                  <thead>
                    <tr className="border-b border-border/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Channel Name</th>
                      <th className="px-4 py-3">Platform</th>
                      <th className="px-4 py-3 text-center">Total Posts</th>
                      <th className="px-4 py-3 text-center">Posted</th>
                      <th className="px-4 py-3 text-center">Scheduled</th>
                      <th className="px-4 py-3 text-center">Failed</th>
                      <th className="px-4 py-3 text-right">Likes</th>
                      <th className="px-4 py-3 text-right">Comments</th>
                      <th className="px-4 py-3 text-right">Shares</th>
                      <th className="px-4 py-3 text-right font-bold text-foreground">Total Engagement</th>
                      <th className="px-4 py-3 text-center">AI Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {comparisonData.pagePerformance.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold flex items-center gap-2 min-w-[150px]">
                          <span
                            className="h-2.5 w-2.5 rounded-full inline-block shrink-0"
                            style={{
                              backgroundColor: COMPARISON_COLORS[idx % COMPARISON_COLORS.length],
                            }}
                          />
                          {item.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.avatarUrl}
                              alt={item.name}
                              className="h-5 w-5 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="truncate">{item.name}</span>
                        </td>
                        <td className="px-4 py-3 capitalize">
                          {item.platform.toLowerCase()}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">
                          {item.totalPosts}
                        </td>
                        <td className="px-4 py-3 text-center text-emerald-500 font-medium">
                          {item.postedCount}
                        </td>
                        <td className="px-4 py-3 text-center text-brand font-medium">
                          {item.scheduledCount}
                        </td>
                        <td className="px-4 py-3 text-center text-destructive font-medium">
                          {item.failedCount}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.totalLikes.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.totalComments.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.totalShares.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">
                          {item.totalEngagement.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-brand/10 text-brand px-1.5 py-0.5 rounded font-bold text-[10px]">
                            {item.aiRatio}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )
      )}
    </div>
  );
}
