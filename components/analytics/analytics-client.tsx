"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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
  AnalyticsSummary,
} from "@/actions/analytics.actions";
import {
  RefreshCw,
  ThumbsUp,
  MessageCircle,
  Share2,
  LineChart as LineChartIcon,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function AnalyticsClient({ pages }: { pages: any[] }) {
  const [selectedPage, setSelectedPage] = useState<string>(pages[0]?.id || "");
  const [data, setData] = useState<AnalyticsSummary[]>([]);
  const [topPost, setTopPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string>("");

  useEffect(() => {
    if (selectedPage) {
      loadData(selectedPage);
    }
  }, [selectedPage]);

  async function loadData(pageId: string) {
    setLoading(true);
    setAiSuggestion("");
    try {
      const res = await getDashboardAnalytics(pageId);
      if (res.success && res.data) {
        setData(res.data.data);
        setTopPost(res.data.topPost);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSync = async () => {
    if (!selectedPage) return;
    setSyncing(true);
    try {
      await syncPostInsights(selectedPage);
      await loadData(selectedPage);
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
      const pageName =
        pages.find((p) => p.id === selectedPage)?.name || "Unknown";
      const res = await generateAnalyticsSuggestions(
        pageName,
        topPost.body,
        topPost.likesCount || 0,
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

  return (
    <div className="space-y-6">
      {/* Consistent Filter/Action Bar */}
      <div className="rounded-xl border border-border/40 bg-card p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end justify-between">
          <div className="flex-1 max-w-sm space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Select Facebook Page
            </label>
            <Select
              value={selectedPage}
              onValueChange={(val) => {
                if (val) setSelectedPage(val);
              }}
            >
              <SelectTrigger className="h-9 w-full mb-0">
                <SelectValue placeholder="Select Facebook Page">
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
            Sync Latest Data from Meta
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="md" />
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={LineChartIcon}
          title="No analytics data available"
          description="We couldn't find any post activity for this page in the last 30 days. Try creating some posts or triggering a Sync to pull latest insights."
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
              <CardTitle>Engagement Overview (Last 30 Days)</CardTitle>
              <CardDescription>
                Likes, comments, and shares over time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data}
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
      )}
    </div>
  );
}
