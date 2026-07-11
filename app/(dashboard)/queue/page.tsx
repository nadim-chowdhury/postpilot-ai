"use client";

import { useState, useEffect } from "react";
import { ListChecks, Clock, Send, Ban, RefreshCw, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { getSchedules, cancelSchedule, reschedulePost } from "@/actions/schedule.actions";
import { publishPostNow } from "@/actions/post.actions";
import type { ScheduleSummary } from "@/types/schedule.types";

export default function QueuePage() {
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState("");

  const fetchQueue = async () => {
    setLoading(true);
    // Fetch only PENDING schedules for the publishing queue
    const result = await getSchedules({ status: "PENDING", pageSize: 50 });
    if (result.success) {
      setSchedules(result.data.items);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleForcePublish = async (scheduleId: string, postId: string) => {
    if (!confirm("Are you sure you want to force publish this post right now?")) return;
    setActionLoading(scheduleId);
    
    // First cancel the QStash schedule
    const cancelResult = await cancelSchedule(scheduleId);
    if (cancelResult.success) {
      // Then publish immediately
      const publishResult = await publishPostNow(postId);
      if (publishResult.success) {
        await fetchQueue();
      } else {
        alert(publishResult.error || "Failed to publish post immediately");
      }
    } else {
      alert(cancelResult.error || "Failed to cancel scheduled queue item");
    }
    setActionLoading(null);
  };

  const handleCancel = async (scheduleId: string) => {
    if (!confirm("Cancel scheduling for this post and return it to drafts?")) return;
    setActionLoading(scheduleId);
    const result = await cancelSchedule(scheduleId);
    if (result.success) {
      await fetchQueue();
    } else {
      alert(result.error || "Failed to cancel schedule");
    }
    setActionLoading(null);
  };

  const handleRescheduleSubmit = async (scheduleId: string) => {
    if (!rescheduleTime) return;
    setActionLoading(scheduleId);
    const result = await reschedulePost(scheduleId, new Date(rescheduleTime));
    if (result.success) {
      setEditingId(null);
      setRescheduleTime("");
      await fetchQueue();
    } else {
      alert(result.error || "Failed to reschedule post");
    }
    setActionLoading(null);
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
      <div>
        <h2 className="text-lg font-semibold text-foreground">Queue</h2>
        <p className="text-sm text-muted-foreground">
          Review, reschedule, or cancel posts before they go live on Facebook.
        </p>
      </div>

      {/* Queue items */}
      {schedules.length > 0 ? (
        <div className="space-y-4">
          {schedules.map((item) => {
            const isEditing = editingId === item.id;
            const isLoading = actionLoading === item.id;

            return (
              <div
                key={item.id}
                className="group relative rounded-xl border border-border/50 bg-card p-5 transition-all duration-150 hover:border-border hover:shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left side: Post and Page Info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Page avatar */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/50">
                    {item.pageAvatarUrl ? (
                      <img
                        src={item.pageAvatarUrl}
                        alt={item.pageName}
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <Globe className="h-4.5 w-4.5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-foreground">
                        {item.pageName}
                      </span>
                      <span className="text-muted-foreground text-[10px]">•</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 text-brand" />{" "}
                        {new Date(item.scheduledAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <StatusBadge status="pending" className="py-0 h-4 text-[9px]" />
                    </div>

                    {item.postTitle && (
                      <h4 className="text-xs font-bold text-foreground">
                        {item.postTitle}
                      </h4>
                    )}
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 pr-4">
                      {item.postBody}
                    </p>
                  </div>
                </div>

                {/* Right side: Actions / Edit input */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="datetime-local"
                        value={rescheduleTime}
                        onChange={(e) => setRescheduleTime(e.target.value)}
                        className="h-8 rounded-md border border-border/50 bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand/30"
                      />
                      <Button
                        size="xs"
                        onClick={() => handleRescheduleSubmit(item.id)}
                        disabled={!rescheduleTime || isLoading}
                        className="bg-brand text-brand-foreground hover:bg-brand/90"
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="xs"
                        className="gap-1"
                        onClick={() => {
                          setEditingId(item.id);
                          // Initialize with local time string for input
                          const localIso = new Date(item.scheduledAt).toISOString().substring(0, 16);
                          setRescheduleTime(localIso);
                        }}
                        disabled={isLoading}
                      >
                        <RefreshCw className="h-3 w-3" /> Reschedule
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        className="gap-1 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/5"
                        onClick={() => handleForcePublish(item.id, item.postId)}
                        disabled={isLoading}
                      >
                        <Send className="h-3 w-3" /> Publish Now
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleCancel(item.id)}
                        disabled={isLoading}
                        title="Cancel Schedule"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={ListChecks}
          title="Queue is empty"
          description="Posts scheduled for future times will appear here. Head over to Content to schedule a post."
        />
      )}
    </div>
  );
}
