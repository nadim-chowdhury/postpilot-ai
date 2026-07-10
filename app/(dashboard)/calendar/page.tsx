import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Calendar</h2>
        <p className="text-sm text-muted-foreground">
          Visualize your publishing schedule across all pages.
        </p>
      </div>

      <EmptyState
        icon={CalendarDays}
        title="No scheduled posts"
        description="Schedule posts from the content pool to see them here on the calendar."
      />
    </div>
  );
}
