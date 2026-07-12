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
import {
  syncPostInsights,
  getDashboardAnalytics,
  generateAnalyticsSuggestions,
  AnalyticsSummary,
} from "@/actions/analytics.actions";
import {
  Loader2,
  RefreshCw,
  ThumbsUp,
  MessageCircle,
  Share2,
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
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Select
          value={selectedPage}
          onValueChange={(val) => {
            if (val) setSelectedPage(val);
          }}
        >
          <SelectTrigger className="min-w-[280px]">
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

        <Button
          onClick={handleSync}
          disabled={syncing || !selectedPage}
          variant="outline"
          className="bg-brand text-brand-foreground hover:bg-brand/90"
        >
          {syncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync Latest Data from Meta
        </Button>
      </div>

      {loading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data.length === 0 ? (
        <Card className="ring-0 rounded-xl border border-border/50 hover:border-border hover:shadow-sm">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-muted-foreground mb-4">
              No data available for the last 30 days.
            </p>
            <p className="text-sm text-muted-foreground">
              Make sure you have published posts and click Sync.
            </p>
          </CardContent>
        </Card>
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
              {/* <div className="absolute top-0 left-0 w-1 h-full bg-brand" /> */}
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-foreground">
                  AI Content Strategist
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!aiSuggestion ? (
                  <Button
                    onClick={handleGenerateAI}
                    disabled={aiLoading || !topPost}
                    className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                    size="sm"
                  >
                    {aiLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
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
                        className="w-full text-xs h-8 mt-2"
                      >
                        {aiLoading ? (
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-3 w-3" />
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
