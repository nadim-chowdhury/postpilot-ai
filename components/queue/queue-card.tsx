"use client";

import { Clock, Send, Ban, RefreshCw, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ScheduleSummary } from "@/types/schedule.types";

interface QueueCardProps {
  item: ScheduleSummary;
  isEditing: boolean;
  isLoading: boolean;
  rescheduleTime: string;
  onRescheduleTimeChange: (val: string) => void;
  onStartEdit: (id: string, scheduledAt: Date) => void;
  onCancelEdit: () => void;
  onRescheduleSubmit: (id: string) => void;
  onForcePublish: (scheduleId: string, postId: string) => void;
  onCancel: (scheduleId: string) => void;
}

export function QueueCard({
  item,
  isEditing,
  isLoading,
  rescheduleTime,
  onRescheduleTimeChange,
  onStartEdit,
  onCancelEdit,
  onRescheduleSubmit,
  onForcePublish,
  onCancel,
}: QueueCardProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 transition-all duration-200 hover:border-border hover:shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/50 overflow-hidden">
            {item.pageAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.pageAvatarUrl}
                alt={item.pageName}
                className="h-full w-full object-cover"
              />
            ) : (
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
          <span className="text-xs font-semibold text-foreground">
            {item.pageName}
          </span>
        </div>
        <StatusBadge
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status={item.status.toLowerCase() as any}
          className="py-0 h-4 text-[9px]"
        />
      </div>

      {/* Schedule Time */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
        <Clock className="h-3 w-3 text-brand" />
        {new Date(item.scheduledAt).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>

      {/* Title + Body */}
      {item.postTitle && (
        <h4 className="text-xs font-bold text-foreground mb-1">
          {item.postTitle}
        </h4>
      )}
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-3 flex-1">
        {item.postBody}
      </p>

      {/* Actions */}
      {item.status !== "COMPLETED" && (
        <div className="mt-auto pt-3 border-t border-border/40">
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <input
                type="datetime-local"
                value={rescheduleTime}
                onChange={(e) => onRescheduleTimeChange(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-xs text-foreground transition-colors outline-none focus-visible:border-brand/50 focus-visible:ring-1 focus-visible:ring-brand/30"
              />
              <div className="flex items-center gap-1.5">
                <Button
                  size="xs"
                  onClick={() => onRescheduleSubmit(item.id)}
                  disabled={!rescheduleTime || isLoading}
                  className="bg-brand text-brand-foreground hover:bg-brand/90 flex-1"
                >
                  Save
                </Button>
                <Button variant="ghost" size="xs" onClick={onCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant="outline"
                size="xs"
                className="gap-1"
                onClick={() => onStartEdit(item.id, item.scheduledAt)}
                disabled={isLoading}
              >
                <RefreshCw className="h-3 w-3" /> Reschedule
              </Button>
              <Button
                variant="outline"
                size="xs"
                className="gap-1 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/5"
                onClick={() => onForcePublish(item.id, item.postId)}
                disabled={isLoading}
              >
                <Send className="h-3 w-3" /> Publish
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-destructive hover:text-destructive ml-auto"
                onClick={() => onCancel(item.id)}
                disabled={isLoading}
                title="Cancel Schedule"
              >
                <Ban className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
