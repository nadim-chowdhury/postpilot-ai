import { FileText, Globe, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import type { PostSummary } from "@/types/post.types";

interface PostCardProps {
  post: PostSummary;
  onPublish?: (postId: string) => void;
  onDelete?: (postId: string) => void;
}

export function PostCard({ post, onPublish, onDelete }: PostCardProps) {
  const statusVariant = post.status.toLowerCase() as
    | "draft"
    | "approved"
    | "scheduled"
    | "publishing"
    | "posted"
    | "failed"
    | "archived";

  const canPublish = post.status === "DRAFT" || post.status === "APPROVED";

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 transition-all duration-200 hover:border-border hover:shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/50">
            {post.pageAvatarUrl ? (
              <img
                src={post.pageAvatarUrl}
                alt={post.pageName}
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {post.pageName}
          </span>
        </div>
        <StatusBadge status={statusVariant} />
      </div>

      {/* Title */}
      {post.title && (
        <h4 className="mb-1.5 text-sm font-semibold text-foreground">
          {post.title}
        </h4>
      )}

      {/* Body preview */}
      <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {post.body}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60">
        {post.aiGenerated && (
          <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-violet-400">
            AI
          </span>
        )}
        <span>
          {new Date(post.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {post.publishedAt && (
          <span>
            Published{" "}
            {new Date(post.publishedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>

      {/* Actions */}
      {(canPublish || onDelete) && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-border/50 pt-3">
          {canPublish && onPublish && (
            <Button
              size="xs"
              className="gap-1 bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={() => onPublish(post.id)}
            >
              <FileText className="h-3 w-3" />
              Publish Now
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="ml-auto text-destructive hover:text-destructive"
              onClick={() => onDelete(post.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
