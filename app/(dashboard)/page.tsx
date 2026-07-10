import { Globe, FileText, CalendarDays, Activity } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";

export default function DashboardPage() {
  // TODO: Replace with real data from Prisma queries
  const stats = [
    {
      label: "Connected Pages",
      value: 0,
      subtitle: "0 active, 0 paused",
      icon: Globe,
    },
    {
      label: "Total Posts",
      value: 0,
      subtitle: "0 published this week",
      icon: FileText,
    },
    {
      label: "Scheduled",
      value: 0,
      subtitle: "Next: —",
      icon: CalendarDays,
    },
    {
      label: "Success Rate",
      value: "—",
      subtitle: "No data yet",
      icon: Activity,
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
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            subtitle={stat.subtitle}
            icon={stat.icon}
          />
        ))}
      </div>

      {/* Placeholder sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Recent Activity
          </h3>
          <p className="text-sm text-muted-foreground">
            No activity yet. Connect a page to get started.
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Upcoming Posts
          </h3>
          <p className="text-sm text-muted-foreground">
            No scheduled posts. Create content and schedule it.
          </p>
        </div>
      </div>
    </div>
  );
}
