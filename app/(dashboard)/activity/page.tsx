"use client";

import { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ActivityItem } from "@/components/activity/activity-item";
import { getActivities } from "@/actions/activity.actions";
import type { ActivityEntry } from "@/actions/activity.actions";

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");

  const fetchActivities = async (pageNum: number, typeFilter: string) => {
    setLoading(true);
    const result = await getActivities({
      page: pageNum,
      pageSize: 30,
      entityType: typeFilter || undefined,
    });
    if (result.success) {
      setActivities(result.data.items);
      setTotal(result.data.total);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities(page, entityType);
  }, [page, entityType]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Activity</h2>
          <p className="text-sm text-muted-foreground">
            Full audit trail of every action across your pages.
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded-lg border border-border/50 bg-background px-2.5 text-xs text-foreground focus:border-brand/50 focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="page">Pages</option>
            <option value="post">Posts</option>
            <option value="schedule">Schedules</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-brand" />
        </div>
      ) : activities.length > 0 ? (
        <div className="rounded-xl border border-border/50 bg-card">
          <div className="divide-y divide-border/50 px-5">
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
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
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description={
            entityType
              ? `No logs found matching category filter "${entityType}".`
              : "All actions — posts created, published, failed — will be logged here."
          }
        />
      )}
    </div>
  );
}
