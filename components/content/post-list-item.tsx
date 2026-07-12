"use client";

import { FileText, Globe, Trash2, Calendar, Edit2 } from "lucide-react";
import { Twitter, Linkedin } from "@/components/shared/social-icons";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import type { PostSummary } from "@/types/post.types";

interface PostListItemProps {
  post: PostSummary;
  onPublish?: (postId: string) => void;
  onSchedule?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onEdit?: (post: PostSummary) => void;
}

export function PostListItem({
  post,
  onPublish,
  onSchedule,
  onDelete,
  onEdit,
}: PostListItemProps) {
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
    <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card px-4 py-3.5 transition-all duration-200 hover:border-border hover:shadow-sm">
      {/* Page Avatar */}
      <div className="relative shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand overflow-hidden">
          {post.pageAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.pageAvatarUrl}
              alt={post.pageName}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : post.platform === "TWITTER" ? (
            <Twitter className="h-4.5 w-4.5 text-sky-500" />
          ) : post.platform === "LINKEDIN" ? (
            <Linkedin className="h-4.5 w-4.5 text-blue-600" />
          ) : (
            <Globe className="h-4.5 w-4.5" />
          )}
        </div>
        <div className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-card border border-border shadow-xs">
          {post.platform === "TWITTER" ? (
            <Twitter className="h-2.5 w-2.5 text-sky-500 fill-sky-500" />
          ) : post.platform === "LINKEDIN" ? (
            <Linkedin className="h-2.5 w-2.5 text-blue-600 fill-blue-600" />
          ) : (
            <Globe className="h-2.5 w-2.5 text-brand" />
          )}
        </div>
      </div>

      {/* Page name */}
      <div className="w-28 shrink-0 hidden sm:block">
        <span className="text-xs font-medium text-muted-foreground truncate block">
          {post.pageName}
        </span>
      </div>

      {/* Status */}
      <div className="shrink-0">
        <StatusBadge status={statusVariant} />
      </div>

      {/* Title + Body */}
      <div className="min-w-0 flex-1">
        {post.title && (
          <h4 className="text-sm font-semibold text-foreground truncate">
            {post.title}
          </h4>
        )}
        <p className="text-xs text-muted-foreground truncate leading-relaxed">
          {post.body}
        </p>
      </div>

      {/* Meta badges */}
      <div className="hidden lg:flex items-center gap-2 shrink-0 text-[11px] text-muted-foreground/60">
        {post.aiGenerated && (
          <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-violet-400">
            AI
          </span>
        )}
        <span>
          {new Date(post.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 ml-auto">
        {canPublish && onPublish && (
          <Button
            size="xs"
            className="gap-1 bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={() => onPublish(post.id)}
          >
            <FileText className="h-3 w-3" />
            Publish
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
        {post.status !== "POSTED" && post.status !== "PUBLISHING" && onEdit && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(post)}
            title="Edit"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(post.id)}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
