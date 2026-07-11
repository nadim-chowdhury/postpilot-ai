"use client";

import { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ViewModeToggle, type ViewMode } from "@/components/shared/view-mode-toggle";
import { ActivityItem } from "@/components/activity/activity-item";
import { ActivityCard } from "@/components/activity/activity-card";
import { getActivities } from "@/actions/activity.actions";
import { Spinner } from "@/components/shared/spinner";
import { ActivityDetailModal } from "@/components/activity/activity-detail-modal";
import type { ActivityEntry } from "@/actions/activity.actions";

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedActivity, setSelectedActivity] = useState<ActivityEntry | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const fetchActivities = async (pageNum: number) => {
    setLoading(true);
    const result = await getActivities({
      page: pageNum,
      pageSize: 30,
      entityType: filterCategory || undefined,
      action: filterAction || undefined,
      startDate: filterStartDate || undefined,
      endDate: filterEndDate || undefined,
    });
    if (result.success) {
      setActivities(result.data.items);
      setTotal(result.data.total);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities(page);
  }, [page]);

  // Re-fetch when filters change (reset to page 1)
  useEffect(() => {
    setPage(1);
    fetchActivities(1);
  }, [filterCategory, filterAction, filterStartDate, filterEndDate]);

  const hasActiveFilters =
    filterCategory || filterAction || filterStartDate || filterEndDate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Activity</h2>
        <p className="text-sm text-muted-foreground">
          Full audit trail of every action across your pages.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-border/40 bg-card p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 items-end">
          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-xs text-foreground focus:border-brand/50 focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="page">Pages</option>
              <option value="post">Posts</option>
              <option value="schedule">Schedules</option>
            </select>
          </div>

          {/* Action search */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Search Action
            </label>
            <input
              type="text"
              placeholder="e.g. created, published..."
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/45 focus:border-brand/50 focus:outline-none"
            />
          </div>

          {/* From Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              From Date
            </label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-xs text-foreground focus:border-brand/50 focus:outline-none"
            />
          </div>

          {/* To Date & Reset */}
          <div className="space-y-1.5 flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                To Date
              </label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-xs text-foreground focus:border-brand/50 focus:outline-none"
              />
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFilterCategory("");
                  setFilterAction("");
                  setFilterStartDate("");
                  setFilterEndDate("");
                }}
                className="h-9 text-xs px-2 hover:bg-accent/80 hover:text-foreground text-muted-foreground"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
        <div className="flex justify-end pt-3 border-t border-border/30">
          <ViewModeToggle mode={viewMode} onModeChange={setViewMode} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="md" />
        </div>
      ) : activities.length > 0 ? (
        viewMode === "list" ? (
          <div className="rounded-xl border border-border/50 bg-card">
            <div className="divide-y divide-border/50 px-5">
              {activities.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  onClick={() => setSelectedActivity(activity)}
                />
              ))}
            </div>

            {/* Pagination */}
            {total > 30 && (
              <div className="flex items-center justify-between border-t border-border/50 px-5 py-3">
                <p className="text-xs text-muted-foreground">
                  Showing {(page - 1) * 30 + 1}–
                  {Math.min(page * 30, total)} of {total}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page * 30 >= total}
                    className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onClick={() => setSelectedActivity(activity)}
                />
              ))}
            </div>

            {/* Pagination */}
            {total > 30 && (
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card px-5 py-3">
                <p className="text-xs text-muted-foreground">
                  Showing {(page - 1) * 30 + 1}–
                  {Math.min(page * 30, total)} of {total}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page * 30 >= total}
                    className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )
      ) : (
        <EmptyState
          icon={Activity}
          title={hasActiveFilters ? "No matching activity" : "No activity yet"}
          description={
            hasActiveFilters
              ? "Try adjusting your filter settings above to view other activity."
              : "All actions — posts created, published, failed — will be logged here."
          }
        />
      )}

      {/* Detail Modal */}
      <ActivityDetailModal
        activity={selectedActivity}
        open={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </div>
  );
}
