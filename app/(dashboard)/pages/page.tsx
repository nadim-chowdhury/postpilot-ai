import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function PagesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Pages</h2>
          <p className="text-sm text-muted-foreground">
            Manage your connected Facebook Pages.
          </p>
        </div>
        <Button className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90">
          <Globe className="h-4 w-4" />
          Connect Page
        </Button>
      </div>

      <EmptyState
        icon={Globe}
        title="No pages connected"
        description="Connect your Facebook Pages to start automating content publishing."
        action={
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Globe className="h-3.5 w-3.5" />
            Connect your first page
          </Button>
        }
      />
    </div>
  );
}
