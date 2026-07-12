"use client";

import { useState, useEffect } from "react";
import { ListChecks, Clock, Send, Ban, RefreshCw, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  ViewModeToggle,
  type ViewMode,
} from "@/components/shared/view-mode-toggle";
import { QueueCard } from "@/components/queue/queue-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  getSchedules,
  cancelSchedule,
  reschedulePost,
  triggerQueueSweeper,
  forcePublishSchedule,
} from "@/actions/schedule.actions";
import { getPages } from "@/actions/page.actions";
import type { ScheduleSummary } from "@/types/schedule.types";

export default function QueuePage() {
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const [pages, setPages] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [sweeperLoading, setSweeperLoading] = useState(false);

  const handleRunSweeper = async () => {
    setSweeperLoading(true);
    const result = await triggerQueueSweeper();
    setSweeperLoading(false);
    if (result.success) {
      alert(
        `Queue sweeper ran successfully! Processed/Published ${result.data.processed} overdue post(s).`,
      );
      await fetchQueue();
    } else {
      alert(result.error || "Failed to execute queue sweeper");
    }
  };

  // Filters State
  const [filterPageId, setFilterPageId] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("PENDING");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const fetchQueue = async () => {
    const result = await getSchedules({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: filterStatus as any,
      fbPageId: filterPageId !== "ALL" ? filterPageId : undefined,
      startDate: filterStartDate || undefined,
      endDate: filterEndDate || undefined,
      search: filterSearch || undefined,
      pageSize: 50,
    });
    if (result.success) {
      setSchedules(result.data.items);
    }
  };

  const fetchData = async () => {
    const [queueResult, pagesResult] = await Promise.all([
      getSchedules({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: filterStatus as any,
        fbPageId: filterPageId !== "ALL" ? filterPageId : undefined,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
        search: filterSearch || undefined,
        pageSize: 50,
      }),
      getPages(),
    ]);

    if (queueResult.success) {
      setSchedules(queueResult.data.items);
    }
    if (pagesResult.success) {
      setPages(pagesResult.data.map((p) => ({ id: p.id, name: p.name })));
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filterPageId,
    filterStatus,
    filterStartDate,
    filterEndDate,
    filterSearch,
  ]);

  const handleForcePublish = async (scheduleId: string) => {
    if (!confirm("Are you sure you want to force publish this post right now?"))
      return;
    setActionLoading(scheduleId);

    // Call the dedicated force publish action which handles pending/failed/cancelled states
    const result = await forcePublishSchedule(scheduleId);
    if (result.success) {
      await fetchQueue();
    } else {
      alert(result.error || "Failed to publish post immediately");
    }
    setActionLoading(null);
  };

  const handleCancel = async (scheduleId: string) => {
    if (!confirm("Cancel scheduling for this post and return it to drafts?"))
      return;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Queue</h2>
          <p className="text-sm text-muted-foreground">
            Review, reschedule, or cancel posts before they go live on Facebook.
          </p>
        </div>
        <Button
          onClick={handleRunSweeper}
          disabled={sweeperLoading}
          className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
        >
          {sweeperLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-brand" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Run Queue Sweeper
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-border/40 bg-card p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5 items-end">
          {/* Search */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Search Queue
            </label>
            <Input
              type="text"
              placeholder="Search title, body..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </div>

          {/* Page Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Filter by Page
            </label>
            <Select
              value={filterPageId}
              onValueChange={(val) => setFilterPageId(val as string)}
            >
              <SelectTrigger className="h-9 w-full mb-0">
                <SelectValue placeholder="All Pages">
                  {filterPageId === "ALL"
                    ? "All Pages"
                    : pages.find((p) => p.id === filterPageId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Pages</SelectItem>
                {pages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Queue Status
            </label>
            <Select
              value={filterStatus}
              onValueChange={(val) => setFilterStatus(val as string)}
            >
              <SelectTrigger className="h-9 w-full mb-0">
                <SelectValue placeholder="All Statuses">
                  {filterStatus === "ALL"
                    ? "All Statuses"
                    : filterStatus === "IN_PROGRESS"
                      ? "Publishing"
                      : filterStatus.charAt(0) +
                        filterStatus.slice(1).toLowerCase()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending (Scheduled)</SelectItem>
                <SelectItem value="IN_PROGRESS">Publishing</SelectItem>
                <SelectItem value="COMPLETED">Completed (Posted)</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              From Date
            </label>
            <DatePicker
              value={filterStartDate}
              onChange={setFilterStartDate}
              placeholder="Pick a date"
            />
          </div>

          {/* End Date & Reset */}
          <div className="space-y-1.5 flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                To Date
              </label>
              <DatePicker
                value={filterEndDate}
                onChange={setFilterEndDate}
                placeholder="Pick a date"
              />
            </div>
            {(filterPageId !== "ALL" ||
              filterStatus !== "PENDING" ||
              filterStartDate ||
              filterEndDate ||
              filterSearch) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFilterPageId("ALL");
                  setFilterStatus("PENDING");
                  setFilterStartDate("");
                  setFilterEndDate("");
                  setFilterSearch("");
                }}
                className="h-9 text-xs px-2 hover:bg-accent/80 hover:text-foreground text-muted-foreground"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
        <div className="flex justify-end pt-3">
          <ViewModeToggle mode={viewMode} onModeChange={setViewMode} />
        </div>
      </div>

      {/* Queue items */}
      {schedules.length > 0 ? (
        viewMode === "list" ? (
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
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/50 overflow-hidden">
                      {item.pageAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.pageAvatarUrl}
                          alt={item.pageName}
                          className="h-full w-full object-cover"
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
                        <span className="text-muted-foreground text-[10px]">
                          •
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3 text-brand" />{" "}
                          {new Date(item.scheduledAt).toLocaleString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <StatusBadge
                          status={item.status.toLowerCase() as any}
                          className="py-0 h-4 text-[9px]"
                        />
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
                        <Input
                          type="datetime-local"
                          value={rescheduleTime}
                          onChange={(e) => setRescheduleTime(e.target.value)}
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
                        {item.status !== "COMPLETED" && (
                          <>
                            <Button
                              variant="outline"
                              size="xs"
                              className="gap-1"
                              onClick={() => {
                                setEditingId(item.id);
                                const localIso = new Date(item.scheduledAt)
                                  .toISOString()
                                  .substring(0, 16);
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
                              onClick={() => handleForcePublish(item.id)}
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
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {schedules.map((item) => (
              <QueueCard
                key={item.id}
                item={item}
                isEditing={editingId === item.id}
                isLoading={actionLoading === item.id}
                rescheduleTime={rescheduleTime}
                onRescheduleTimeChange={setRescheduleTime}
                onStartEdit={(id, scheduledAt) => {
                  setEditingId(id);
                  const localIso = new Date(scheduledAt)
                    .toISOString()
                    .substring(0, 16);
                  setRescheduleTime(localIso);
                }}
                onCancelEdit={() => setEditingId(null)}
                onRescheduleSubmit={handleRescheduleSubmit}
                onForcePublish={handleForcePublish}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )
      ) : (
        <EmptyState
          icon={ListChecks}
          title={
            filterPageId !== "ALL" ||
            filterStatus !== "PENDING" ||
            filterStartDate ||
            filterEndDate ||
            filterSearch
              ? "No matching queue items"
              : "Queue is empty"
          }
          description={
            filterPageId !== "ALL" ||
            filterStatus !== "PENDING" ||
            filterStartDate ||
            filterEndDate ||
            filterSearch
              ? "Try adjusting your filter settings above to view other items."
              : "Posts scheduled for future times will appear here. Head over to Content to schedule a post."
          }
        />
      )}
    </div>
  );
}
