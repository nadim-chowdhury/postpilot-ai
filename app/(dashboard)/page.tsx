"use client";

import { useState, useEffect } from "react";
import {
  Globe,
  FileText,
  CalendarDays,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ActivityItem } from "@/components/activity/activity-item";
import { getDashboardStats } from "@/actions/dashboard.actions";
import { Spinner } from "@/components/shared/spinner";
import type { DashboardStats } from "@/actions/dashboard.actions";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      const result = await getDashboardStats();
      if (result.success) {
        setStats(result.data);
      }
      setLoading(false);
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="md" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Connected Pages",
      value: stats?.pagesCount ?? 0,
      subtitle: "Active page channels",
      icon: Globe,
    },
    {
      label: "Scheduled Posts",
      value: stats?.scheduledCount ?? 0,
      subtitle: "Pending in queue",
      icon: CalendarDays,
    },
    {
      label: "Successful Posts",
      value: stats?.publishedCount ?? 0,
      subtitle: "Posted to Facebook",
      icon: FileText,
    },
    {
      label: "Failed Posts",
      value: stats?.failedCount ?? 0,
      subtitle: "Publishing errors",
      icon: AlertTriangle,
      className:
        stats?.failedCount && stats.failedCount > 0 ? "text-destructive" : "",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Overview</h2>
        <p className="text-sm text-muted-foreground">
          Monitor your pages, content, and publishing health at a glance.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            subtitle={stat.subtitle}
            icon={stat.icon}
          />
        ))}
      </div>

      {/* Main dashboard columns */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="rounded-xl border border-border/50 bg-card p-6 flex flex-col">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Recent Activity
          </h3>
          {stats?.recentActivities && stats.recentActivities.length > 0 ? (
            <div className="divide-y divide-border/50 flex-1 max-h-[380px] overflow-y-auto pr-1.5">
              {stats.recentActivities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 flex-1 text-center">
              <p className="text-xs text-muted-foreground">
                No activity logged yet. Connect a page to start.
              </p>
            </div>
          )}
        </div>

        {/* Upcoming Posts */}
        <div className="rounded-xl border border-border/50 bg-card p-6 flex flex-col">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Upcoming Queue
          </h3>
          {stats?.upcomingSchedules && stats.upcomingSchedules.length > 0 ? (
            <div className="space-y-3 flex-1 max-h-[380px] overflow-y-auto pr-1.5">
              {stats.upcomingSchedules.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border/50 bg-background p-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/50">
                      {item.pageAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.pageAvatarUrl}
                          alt={item.pageName}
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {item.pageName}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.postBody}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3 text-brand" />
                    {new Date(item.scheduledAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 flex-1 text-center">
              <p className="text-xs text-muted-foreground">
                No scheduled posts in the upcoming queue.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
