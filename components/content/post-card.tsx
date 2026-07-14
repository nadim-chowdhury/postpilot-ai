import { FileText, Globe, Trash2, Calendar, Edit2 } from "lucide-react";
import { Twitter, Linkedin } from "@/components/shared/social-icons";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import type { PostSummary } from "@/types/post.types";

interface PostCardProps {
  post: PostSummary;
  onPublish?: (postId: string) => void;
  onSchedule?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onEdit?: (post: PostSummary) => void;
}

export function PostCard({
  post,
  onPublish,
  onSchedule,
  onDelete,
  onEdit,
}: PostCardProps) {
  const statusVariant = post.status.toLowerCase() as
    | "draft"
    | "approved"
    | "scheduled"
    | "publishing"
    | "posted"
    | "failed"
    | "archived";

  const canPublish =
    post.status === "DRAFT" ||
    post.status === "APPROVED" ||
    post.status === "FAILED";

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 transition-all duration-200 hover:border-border hover:shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="relative shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/50 overflow-hidden">
              {post.pageAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.pageAvatarUrl}
                  alt={post.pageName}
                  className="h-full w-full object-cover"
                />
              ) : post.platform === "TWITTER" ? (
                <Twitter className="h-3.5 w-3.5 text-sky-500" />
              ) : post.platform === "LINKEDIN" ? (
                <Linkedin className="h-3.5 w-3.5 text-blue-600" />
              ) : (
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-card border border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              {post.platform === "TWITTER" ? (
                <Twitter className="h-1.5 w-1.5 text-sky-500 fill-sky-500" />
              ) : post.platform === "LINKEDIN" ? (
                <Linkedin className="h-1.5 w-1.5 text-blue-600 fill-blue-600" />
              ) : (
                <Globe className="h-1.5 w-1.5 text-brand" />
              )}
            </div>
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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/60">
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
        {post.scheduledAt && (
          <span className="flex items-center gap-1 text-amber-400">
            <Calendar className="h-3 w-3" />
            {new Date(post.scheduledAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
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
          {canPublish && onSchedule && (
            <Button
              variant="outline"
              size="xs"
              className="gap-1"
              onClick={() => onSchedule(post.id)}
            >
              <Calendar className="h-3 w-3" />
              Schedule
            </Button>
          )}
          {post.status !== "POSTED" &&
            post.status !== "PUBLISHING" &&
            onEdit && (
              <Button
                variant="outline"
                size="xs"
                className="gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(post)}
              >
                <Edit2 className="h-3 w-3" />
                Edit
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
