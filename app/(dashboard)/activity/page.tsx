import { Activity } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Activity</h2>
        <p className="text-sm text-muted-foreground">
          Full audit trail of every action across your pages.
        </p>
      </div>

      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="All actions — posts created, published, failed — will be logged here."
      />
    </div>
  );
}
