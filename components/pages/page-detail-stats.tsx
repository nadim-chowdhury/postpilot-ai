"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { Spinner } from "@/components/shared/spinner";
import {
  ArrowLeft,
  FileText,
  ThumbsUp,
  MessageCircle,
  Share2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  PenTool,
  TrendingUp,
  BarChart3,
  CalendarCheck,
  Globe,
  Gamepad2,
  RefreshCw,
} from "lucide-react";
import { Twitter, Linkedin } from "@/components/shared/social-icons";
import { cn } from "@/lib/utils";
import type { PageDetail } from "@/types/page.types";
import {
  getPageDetailedStats,
  syncPostInsights,
  type PageDetailedStats as PageDetailedStatsType,
} from "@/actions/analytics.actions";

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface PageDetailStatsProps {
  page: PageDetail;
  stats: PageDetailedStatsType | null;
}

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function PageDetailStats({ page, stats: initialStats }: PageDetailStatsProps) {
  const router = useRouter();
  const [stats, setStats] = useState<PageDetailedStatsType | null>(initialStats);
  const [datePreset, setDatePreset] = useState<string>("30d");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    const res = await syncPostInsights(page.id);
    if (res.success) {
      await fetchStats(datePreset, startDate, endDate);
    }
    setSyncing(false);
  };

  const fetchStats = async (preset: string, start?: string, end?: string) => {
    setLoading(true);
    let resolvedStart = start;
    let resolvedEnd = end;

    if (preset !== "custom") {
      const days = preset === "7d" ? 7 : preset === "14d" ? 14 : preset === "90d" ? 90 : 30;
      const d = new Date();
      d.setDate(d.getDate() - days);
      resolvedStart = d.toISOString().split("T")[0];
      resolvedEnd = new Date().toISOString().split("T")[0];
      
      setStartDate(resolvedStart);
      setEndDate(resolvedEnd);
    }

    const res = await getPageDetailedStats(page.id, {
      startDate: resolvedStart,
      endDate: resolvedEnd,
    });

    if (res.success && res.data) {
      setStats(res.data);
    }
    setLoading(false);
  };

  const statusVariant = page.status.toLowerCase() as
    | "active"
    | "paused"
    | "disconnected";

  // Post status distribution data for bar chart
  const statusDistribution = stats
    ? [
        { name: "Draft", value: stats.postStatusCounts.draft, fill: "var(--color-muted-foreground)" },
        { name: "Approved", value: stats.postStatusCounts.approved, fill: "var(--color-brand)" },
        { name: "Scheduled", value: stats.postStatusCounts.scheduled, fill: "var(--color-chart-2)" },
        { name: "Posted", value: stats.postStatusCounts.posted, fill: "oklch(0.65 0.17 145)" },
        { name: "Failed", value: stats.postStatusCounts.failed, fill: "var(--color-destructive)" },
      ].filter((s) => s.value > 0)
    : [];

  // AI vs Manual data
  const contentSourceData = stats
    ? [
        { name: "AI Generated", value: stats.aiGeneratedCount, fill: "var(--color-brand)" },
        { name: "Manual", value: stats.manualCount, fill: "var(--color-chart-2)" },
      ]
    : [];

  const maxGridEngagement = stats?.bestPostingTimes
    ? Math.max(...stats.bestPostingTimes.map((t) => t.engagement))
    : 0;

  return (
    <div className="space-y-6">
      {/* ── Back + Page Header ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
            onClick={() => router.push("/pages")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Pages
          </Button>

          {loading && <Spinner size="sm" />}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-border/40 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-brand animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Analysis Period</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Preset Buttons */}
            <div className="flex items-center rounded-lg bg-muted p-1">
              {["7d", "14d", "30d", "90d", "custom"].map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setDatePreset(preset);
                    if (preset !== "custom") {
                      fetchStats(preset);
                    }
                  }}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                    datePreset === preset
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {preset === "custom" ? "Custom" : preset.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs */}
            {datePreset === "custom" && (
              <div className="flex items-center gap-2 animate-in fade-in duration-200">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 rounded-lg border border-border/50 bg-background px-2 text-xs text-foreground focus:border-brand/50 focus:outline-none"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 rounded-lg border border-border/50 bg-background px-2 text-xs text-foreground focus:border-brand/50 focus:outline-none"
                />
                <Button
                  size="sm"
                  onClick={() => fetchStats("custom", startDate, endDate)}
                  className="h-8 text-xs bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  Apply
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-xl border border-border/40 bg-card p-5 shadow-sm">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand overflow-hidden">
              {page.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={page.avatarUrl}
                  alt={page.name}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : page.platform === "TWITTER" ? (
                <Twitter className="h-6 w-6 text-sky-500" />
              ) : page.platform === "LINKEDIN" ? (
                <Linkedin className="h-6 w-6 text-blue-600" />
              ) : (
                <Globe className="h-6 w-6" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-card border border-border shadow-xs">
              {page.platform === "TWITTER" ? (
                <Twitter className="h-3 w-3 text-sky-500 fill-sky-500" />
              ) : page.platform === "LINKEDIN" ? (
                <Linkedin className="h-3 w-3 text-blue-600 fill-blue-600" />
              ) : (
                <Globe className="h-3 w-3 text-brand" />
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-foreground truncate">
                {page.name}
              </h2>
              <StatusBadge status={statusVariant} />
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">
              {page.game ? (
                <span className="inline-flex items-center gap-1">
                  <Gamepad2 className="h-3 w-3" />
                  {page.game}
                </span>
              ) : page.platform === "TWITTER" ? (
                "Twitter Account"
              ) : page.platform === "LINKEDIN" ? (
                "LinkedIn Channel"
              ) : (
                "Facebook Page"
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              <span className="font-semibold text-foreground/80">Topic:</span>{" "}
              {page.topic}
            </p>
          </div>

          {/* Meta info */}
          <div className="flex flex-col items-end gap-2.5 shrink-0">
            <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-muted-foreground">
              <span>
                Connected{" "}
                {new Date(page.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span>
                Last post:{" "}
                {page.lastPostedAt
                  ? new Date(page.lastPostedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  : "Never"}
              </span>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={syncing || loading}
              className="h-8 text-xs gap-1.5 border-border/50 hover:bg-muted/40 cursor-pointer"
            >
              {syncing ? (
                <Spinner size="sm" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 text-brand" />
              )}
              {syncing ? "Syncing..." : "Sync Page Feed"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Show empty state if no stats ── */}
      {!stats ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-xl border border-border/45 p-8 shadow-xs">
          <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-semibold text-foreground">
            No stats available for this period
          </p>
          <p className="text-xs text-muted-foreground/80 mt-1 max-w-md mb-4 leading-relaxed">
            If you have published content directly on this page (outside of this app) in the selected range, click below to import your feed posts and metrics.
          </p>
          <Button
            onClick={handleSync}
            disabled={syncing || loading}
            className="bg-brand text-brand-foreground hover:bg-brand/90 gap-2 text-xs h-9 shrink-0"
          >
            {syncing ? (
              <Spinner size="sm" className="border-t-brand-foreground" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {syncing ? "Importing Feed..." : "Import Page Feed & Insights"}
          </Button>
        </div>
      ) : (
        <>
          {/* ── KPI Row ── */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label="Total Posts"
              value={stats.totalPosts}
              subtitle={`${stats.postStatusCounts.posted} published`}
              icon={FileText}
            />
            <StatCard
              label="Total Likes"
              value={stats.totalLikes.toLocaleString()}
              icon={ThumbsUp}
            />
            <StatCard
              label="Total Comments"
              value={stats.totalComments.toLocaleString()}
              icon={MessageCircle}
            />
            <StatCard
              label="Total Shares"
              value={stats.totalShares.toLocaleString()}
              icon={Share2}
            />
            <StatCard
              label="Avg. Engagement"
              value={stats.avgEngagementPerPost.toLocaleString()}
              subtitle="Per published post"
              icon={TrendingUp}
            />
            <StatCard
              label="AI Generated"
              value={`${stats.aiRatio}%`}
              subtitle={`${stats.aiGeneratedCount} of ${stats.totalPosts}`}
              icon={Sparkles}
            />
          </div>

          {/* ── Charts Row ── */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            {/* Engagement Timeline */}
            <Card className="lg:col-span-2 rounded-xl border border-border/50 hover:border-border hover:shadow-sm ring-0">
              <CardHeader>
                <CardTitle>Engagement Over Time</CardTitle>
                <CardDescription>
                  Likes, comments, and shares — selected range
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.engagementTimeline.length > 0 ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={stats.engagementTimeline}
                        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
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
                        <Line
                          type="monotone"
                          dataKey="likes"
                          stroke="var(--color-brand)"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="comments"
                          stroke="var(--color-chart-2)"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="shares"
                          stroke="var(--color-chart-3)"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-xs text-muted-foreground">
                    No engagement data in the selected range
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Post Status Distribution */}
            <Card className="rounded-xl border border-border/50 hover:border-border hover:shadow-sm ring-0">
              <CardHeader>
                <CardTitle>Post Status Breakdown</CardTitle>
                <CardDescription>
                  Distribution of posts by status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statusDistribution.length > 0 ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={statusDistribution}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={false}
                          stroke="var(--color-border)"
                          opacity={0.5}
                        />
                        <XAxis
                          type="number"
                          stroke="var(--color-muted-foreground)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          stroke="var(--color-muted-foreground)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          width={70}
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
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                          {statusDistribution.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-xs text-muted-foreground">
                    No posts yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Publishing Frequency + AI vs Manual + Schedule Health ── */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
            {/* Publishing Frequency */}
            <Card className="rounded-xl border border-border/50 hover:border-border hover:shadow-sm ring-0">
              <CardHeader>
                <CardTitle className="text-base">Publishing Activity</CardTitle>
                <CardDescription>Posts per day — selected range</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.publishingFrequency.length > 0 ? (
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats.publishingFrequency}
                        margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
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
                          fontSize={10}
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
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
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
                          dataKey="count"
                          fill="var(--color-brand)"
                          radius={[4, 4, 0, 0]}
                          barSize={16}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[180px] text-xs text-muted-foreground">
                    No posts published recently
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI vs Manual */}
            <Card className="rounded-xl border border-border/50 hover:border-border hover:shadow-sm ring-0">
              <CardHeader>
                <CardTitle className="text-base">Content Source</CardTitle>
                <CardDescription>AI vs manually created posts</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.totalPosts > 0 ? (
                  <div className="space-y-4">
                    {contentSourceData.map((item) => (
                      <div key={item.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-medium text-foreground">
                            {item.name === "AI Generated" ? (
                              <Sparkles className="h-3.5 w-3.5 text-brand" />
                            ) : (
                              <PenTool className="h-3.5 w-3.5 text-chart-2" />
                            )}
                            {item.name}
                          </span>
                          <span className="text-muted-foreground font-semibold">
                            {item.value}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${stats.totalPosts > 0 ? (item.value / stats.totalPosts) * 100 : 0}%`,
                              backgroundColor: item.fill,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                      {stats.aiRatio}% of your content is AI-generated
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[180px] text-xs text-muted-foreground">
                    No posts yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Schedule Health */}
            <Card className="rounded-xl border border-border/50 hover:border-border hover:shadow-sm ring-0">
              <CardHeader>
                <CardTitle className="text-base">Schedule Health</CardTitle>
                <CardDescription>Scheduling success metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.scheduleHealth.total > 0 ? (
                  <div className="space-y-3">
                    {/* Success Rate Ring */}
                    <div className="flex items-center gap-4">
                      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                        <svg
                          className="h-20 w-20 -rotate-90"
                          viewBox="0 0 36 36"
                        >
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="var(--color-muted)"
                            strokeWidth="3"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke={
                              stats.scheduleHealth.successRate >= 80
                                ? "oklch(0.65 0.17 145)"
                                : stats.scheduleHealth.successRate >= 50
                                  ? "oklch(0.75 0.15 85)"
                                  : "var(--color-destructive)"
                            }
                            strokeWidth="3"
                            strokeDasharray={`${stats.scheduleHealth.successRate}, 100`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute text-sm font-bold text-foreground">
                          {stats.scheduleHealth.successRate}%
                        </span>
                      </div>
                      <div className="text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 text-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "oklch(0.65 0.17 145)" }} />
                          <span>{stats.scheduleHealth.completed} completed</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-foreground">
                          <Clock className="h-3.5 w-3.5 text-brand" />
                          <span>{stats.scheduleHealth.pending} pending</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-foreground">
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                          <span>{stats.scheduleHealth.failed} failed</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                      {stats.scheduleHealth.total} total schedules
                      {stats.scheduleHealth.cancelled > 0 && (
                        <span> · {stats.scheduleHealth.cancelled} cancelled</span>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[180px] text-xs text-muted-foreground">
                    <div className="text-center">
                      <CalendarCheck className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      No schedules yet
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Best Posting Time Heatmap */}
          {stats.bestPostingTimes && stats.bestPostingTimes.length > 0 && (
            <Card className="rounded-xl border border-border/50 hover:border-border hover:shadow-sm ring-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-brand" />
                  Best Posting Times Heatmap
                </CardTitle>
                <CardDescription>
                  Average engagement score grouped by day of the week and hour blocks. Darker blocks represent higher engagement.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="min-w-[800px] space-y-4">
                  <div className="grid grid-cols-9 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/40 font-mono">
                    <div>Day</div>
                    <div>12a - 3a</div>
                    <div>3a - 6a</div>
                    <div>6a - 9a</div>
                    <div>9a - 12p</div>
                    <div>12p - 3p</div>
                    <div>3p - 6p</div>
                    <div>6p - 9p</div>
                    <div>9p - 12a</div>
                  </div>

                  <div className="space-y-1">
                    {DAYS_OF_WEEK.map((dayName, dayIndex) => (
                      <div key={dayName} className="grid grid-cols-9 gap-1 items-center">
                        <div className="text-left text-xs font-semibold text-muted-foreground pr-2 truncate">
                          {dayName}
                        </div>
                        {Array.from({ length: 8 }).map((_, hourBlock) => {
                          const cell = stats.bestPostingTimes.find(
                            (t) => t.day === dayIndex && t.hourBlock === hourBlock
                          );
                          const engagement = cell?.engagement ?? 0;
                          const count = cell?.count ?? 0;
                          const opacity = maxGridEngagement > 0 ? engagement / maxGridEngagement : 0;

                          return (
                            <div
                              key={hourBlock}
                              className={cn(
                                "h-10 rounded-md flex flex-col items-center justify-center transition-all duration-200 border border-transparent hover:border-foreground/20 hover:scale-[1.02]",
                                count === 0 ? "bg-muted/20 text-muted-foreground/30 font-medium" : "text-brand-foreground"
                              )}
                              style={
                                count > 0
                                  ? {
                                      backgroundColor: `oklch(0.55 0.19 250 / ${0.1 + opacity * 0.9})`,
                                      color: opacity > 0.45 ? "white" : "var(--color-foreground)",
                                    }
                                  : undefined
                              }
                              title={
                                count > 0
                                  ? `${engagement} engagement (${count} posts)`
                                  : "No posts published in this block"
                              }
                            >
                              {count > 0 ? (
                                <>
                                  <span className="text-xs font-bold">{engagement}</span>
                                  <span className="text-[8px] opacity-75 font-semibold uppercase">{count}p</span>
                                </>
                              ) : (
                                <span className="text-[9px]">-</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Heatmap Legend */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground font-semibold uppercase">
                    <span>Less Engaged</span>
                    <div className="flex h-3 gap-0.5">
                      <div className="w-4 rounded bg-brand/10" />
                      <div className="w-4 rounded bg-brand/35" />
                      <div className="w-4 rounded bg-brand/60" />
                      <div className="w-4 rounded bg-brand/85" />
                    </div>
                    <span>More Engaged</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Top Posts + Recent Posts ── */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Top Performing Posts */}
            <Card className="rounded-xl border border-border/50 hover:border-border hover:shadow-sm ring-0">
              <CardHeader>
                <CardTitle>Top Performing Posts</CardTitle>
                <CardDescription>
                  Ranked by engagement score (likes + 2×comments + 3×shares)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.topPosts.length > 0 ? (
                  <div className="space-y-3">
                    {stats.topPosts.map((post, idx) => (
                      <div
                        key={post.id}
                        className="rounded-lg border border-border/40 bg-background p-3 space-y-2"
                      >
                        <div className="flex items-start gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-bold text-brand">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                              {post.body}
                            </p>
                          </div>
                          {post.aiGenerated && (
                            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-brand bg-brand/10 px-1.5 py-0.5 rounded">
                              AI
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground pl-7">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3 text-brand" />
                            {post.likesCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3 text-chart-2" />
                            {post.commentsCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Share2 className="h-3 w-3 text-chart-3" />
                            {post.sharesCount}
                          </span>
                          <span className="ml-auto font-semibold text-foreground/70">
                            Score: {post.engagementScore}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
                    No published posts yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Posts */}
            <Card className="rounded-xl border border-border/50 hover:border-border hover:shadow-sm ring-0">
              <CardHeader>
                <CardTitle>Recent Posts</CardTitle>
                <CardDescription>Latest 10 posts for this page</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.recentPosts.length > 0 ? (
                  <div className="space-y-2">
                    {stats.recentPosts.map((post) => {
                      const postStatusVariant = post.status.toLowerCase() as
                        | "draft"
                        | "approved"
                        | "scheduled"
                        | "publishing"
                        | "posted"
                        | "failed"
                        | "archived";
                      return (
                        <div
                          key={post.id}
                          className="flex items-center gap-3 rounded-lg border border-border/40 bg-background px-3 py-2.5 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-foreground truncate font-medium">
                              {post.title || post.body.slice(0, 60)}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(post.createdAt).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                              {post.aiGenerated && (
                                <span className="ml-1.5 text-brand font-semibold">
                                  · AI
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {post.status === "POSTED" && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <ThumbsUp className="h-2.5 w-2.5" />
                                {post.likesCount}
                              </span>
                            )}
                            <StatusBadge status={postStatusVariant} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
                    No posts yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
