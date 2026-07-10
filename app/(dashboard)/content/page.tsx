import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function ContentPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Content</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage your content pool.
          </p>
        </div>
        <Button className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90">
          <FileText className="h-4 w-4" />
          Create Post
        </Button>
      </div>

      <EmptyState
        icon={FileText}
        title="No content yet"
        description="Create posts manually or use AI to generate content for your pages."
        action={
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="h-3.5 w-3.5" />
            Create your first post
          </Button>
        }
      />
    </div>
  );
}
