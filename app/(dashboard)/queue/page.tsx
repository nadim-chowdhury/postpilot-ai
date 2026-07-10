import { ListChecks } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default function QueuePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Queue</h2>
        <p className="text-sm text-muted-foreground">
          Review, approve, or reject posts before they go live.
        </p>
      </div>

      <EmptyState
        icon={ListChecks}
        title="Queue is empty"
        description="Posts awaiting review will appear here. Generate content with AI to populate the queue."
      />
    </div>
  );
}
