"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Calendar as CalendarIcon,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Twitter, Linkedin } from "@/components/shared/social-icons";
import { cn } from "@/lib/utils";
import type { ScheduleSummary } from "@/types/schedule.types";

interface CalendarViewProps {
  schedules: ScheduleSummary[];
  onCancelSchedule?: (scheduleId: string) => void;
  onReschedule?: (scheduleId: string, newDate: Date) => void;
}

export function CalendarView({
  schedules,
  onCancelSchedule,
  onReschedule,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState<ScheduleSummary | null>(
    null,
  );
  const [selectedDayInfo, setSelectedDayInfo] = useState<{
    day: number;
    schedules: ScheduleSummary[];
  } | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get date information for rendering the grid
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonthDays = Array.from(
    { length: firstDayOfMonth },
    (_, i) => daysInPrevMonth - firstDayOfMonth + 1 + i,
  );

  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Grid total slots (must be multiple of 7, usually 35 or 42)
  const totalSlots = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;
  const nextMonthDays = Array.from(
    { length: totalSlots - (prevMonthDays.length + currentMonthDays.length) },
    (_, i) => i + 1,
  );

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Filter schedules that fall on a specific calendar day
  const getSchedulesForDay = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return [];
    return schedules.filter((s) => {
      const sDate = new Date(s.scheduledAt);
      return (
        sDate.getFullYear() === year &&
        sDate.getMonth() === month &&
        sDate.getDate() === day
      );
    });
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const handleRescheduleSubmit = async () => {
    if (!selectedPost || !rescheduleTime || !onReschedule) return;
    setActionLoading(true);
    await onReschedule(selectedPost.id, new Date(rescheduleTime));
    setSelectedPost(null);
    setRescheduleTime("");
    setActionLoading(false);
  };

  const handleCancelClick = async () => {
    if (!selectedPost || !onCancelSchedule) return;
    setActionLoading(true);
    await onCancelSchedule(selectedPost.id);
    setSelectedPost(null);
    setActionLoading(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Calendar Grid Section */}
      <div className="lg:col-span-2 space-y-4">
        {/* Header navigation */}
        <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            {monthNames[month]} {year}
          </h3>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon-sm" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Month grid */}
        <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
          {/* Day labels */}
          <div className="grid grid-cols-7 border-b border-border/50 bg-muted/30 text-center text-xs font-semibold text-muted-foreground py-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Grid cells */}
          <div className="grid grid-cols-7 gap-[1px] bg-border/40 text-sm">
            {/* Prev month fill */}
            {prevMonthDays.map((day) => (
              <div
                key={`prev-${day}`}
                className="min-h-28 bg-muted/10 p-2 text-muted-foreground/40 select-none"
              >
                {day}
              </div>
            ))}

            {/* Current month days */}
            {currentMonthDays.map((day) => {
              const daySchedules = getSchedulesForDay(day, true);
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <div
                  key={`curr-${day}`}
                  onClick={() => {
                    if (daySchedules.length > 0) {
                      setSelectedDayInfo({ day, schedules: daySchedules });
                      setSelectedPost(null);
                    } else {
                      setSelectedDayInfo(null);
                      setSelectedPost(null);
                    }
                  }}
                  className={cn(
                    "min-h-28 p-2 bg-background transition-colors hover:bg-muted/5 flex flex-col justify-between cursor-pointer",
                    isToday && "bg-brand/5",
                    selectedDayInfo?.day === day && "ring-1 ring-brand/40 bg-brand/5"
                  )}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${
                        isToday
                          ? "bg-brand text-brand-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {day}
                    </span>
                  </div>

                  {/* Day events */}
                  <div className="space-y-1 overflow-hidden flex-1 flex flex-col justify-start">
                    {daySchedules.slice(0, 2).map((s) => (
                      <button
                        key={s.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPost(s);
                          setSelectedDayInfo(null);
                        }}
                        className={`w-full text-left truncate rounded px-1 py-0.5 text-[9px] font-medium border flex items-center gap-1 cursor-pointer transition-all ${
                          s.status === "PENDING"
                            ? "bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20"
                            : s.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                        }`}
                      >
                        {s.platform === "TWITTER" ? (
                          <Twitter className="h-2.5 w-2.5 text-sky-500 fill-sky-500 shrink-0" />
                        ) : s.platform === "LINKEDIN" ? (
                          <Linkedin className="h-2.5 w-2.5 text-blue-600 fill-blue-600 shrink-0" />
                        ) : (
                          <Globe className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate">
                          {s.postTitle || s.postBody}
                        </span>
                      </button>
                    ))}
                    {daySchedules.length > 2 && (
                      <div className="text-[9px] font-semibold text-brand px-1 mt-0.5">
                        +{daySchedules.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Next month fill */}
            {nextMonthDays.map((day) => (
              <div
                key={`next-${day}`}
                className="min-h-28 bg-muted/10 p-2 text-muted-foreground/40 select-none"
              >
                {day}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Schedule Detail Panel */}
      <div className="space-y-4">
        {selectedPost ? (
          <div className="rounded-xl border border-border/50 bg-card p-5 space-y-5 animate-in fade-in slide-in-from-right-3 duration-200">
            {/* Header info */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="relative shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 overflow-hidden">
                    {selectedPost.pageAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedPost.pageAvatarUrl}
                        alt={selectedPost.pageName}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : selectedPost.platform === "TWITTER" ? (
                      <Twitter className="h-4 w-4 text-sky-500" />
                    ) : selectedPost.platform === "LINKEDIN" ? (
                      <Linkedin className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-card border border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                    {selectedPost.platform === "TWITTER" ? (
                      <Twitter className="h-1.5 w-1.5 text-sky-500 fill-sky-500" />
                    ) : selectedPost.platform === "LINKEDIN" ? (
                      <Linkedin className="h-1.5 w-1.5 text-blue-600 fill-blue-600" />
                    ) : (
                      <Globe className="h-1.5 w-1.5 text-brand" />
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground leading-none">
                    {selectedPost.pageName}
                  </h4>
                  <span className="text-[10px] text-muted-foreground">
                    Target Page
                  </span>
                </div>
              </div>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <StatusBadge status={selectedPost.status.toLowerCase() as any} />
            </div>

            {/* Post text */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Post Text
              </span>
              <p className="rounded-lg bg-muted/30 p-3 text-xs leading-relaxed text-foreground max-h-40 overflow-y-auto">
                {selectedPost.postBody}
              </p>
            </div>

            {/* Schedule metadata */}
            <div className="grid grid-cols-2 gap-3 border-t border-b border-border/50 py-3.5 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" /> Scheduled Date
                </span>
                <p className="font-medium text-foreground">
                  {new Date(selectedPost.scheduledAt).toLocaleDateString()}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Scheduled Time
                </span>
                <p className="font-medium text-foreground">
                  {new Date(selectedPost.scheduledAt).toLocaleTimeString(
                    undefined,
                    { hour: "2-digit", minute: "2-digit" },
                  )}
                </p>
              </div>
            </div>

            {/* Reschedule forms */}
            {(selectedPost.status === "PENDING" ||
              selectedPost.status === "FAILED" ||
              selectedPost.status === "CANCELLED") &&
              onReschedule && (
                <div className="space-y-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 block">
                    Reschedule Post
                  </span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="datetime-local"
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="h-8 flex-1 text-xs"
                    />
                    <Button
                      size="xs"
                      onClick={handleRescheduleSubmit}
                      disabled={!rescheduleTime || actionLoading}
                      className="bg-brand text-brand-foreground hover:bg-brand/90 gap-1 shrink-0"
                    >
                      <RefreshCw className="h-3 w-3" /> Save
                    </Button>
                  </div>
                </div>
              )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-2">
              {(selectedPost.status === "PENDING" ||
                selectedPost.status === "FAILED") &&
                onCancelSchedule && (
                  <Button
                    variant="destructive"
                    size="xs"
                    onClick={handleCancelClick}
                    disabled={actionLoading}
                    className="w-full"
                  >
                    Cancel Schedule
                  </Button>
                )}
              {selectedDayInfo && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setSelectedPost(null)}
                  className="w-full gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-3 w-3" /> Back to Day List
                </Button>
              )}
            </div>
          </div>
        ) : selectedDayInfo ? (
          <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div>
                <h3 className="text-xs font-semibold text-foreground">
                  {monthNames[month]} {selectedDayInfo.day}, {year}
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  {selectedDayInfo.schedules.length} scheduled posts
                </p>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setSelectedDayInfo(null)}
                className="h-7 text-[10px] px-2 text-muted-foreground hover:text-foreground"
              >
                Clear Selection
              </Button>
            </div>
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {selectedDayInfo.schedules.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedPost(s)}
                  className="w-full text-left p-2.5 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-all space-y-2 flex flex-col cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(s.scheduledAt).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className={`text-[8px] font-semibold px-1.5 py-0.25 rounded-full border ${
                      s.status === "PENDING"
                        ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                        : s.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <p className="text-xs text-foreground font-medium truncate w-full group-hover:text-brand transition-colors">
                    {s.postTitle || s.postBody}
                  </p>
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground w-full">
                    <span className="truncate max-w-[120px]">{s.pageName}</span>
                    <span className="capitalize">{s.platform?.toLowerCase()}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-xs text-muted-foreground bg-card/30 flex flex-col items-center justify-center min-h-[300px]">
            <CalendarIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p>
              Select a day or scheduled post in the calendar to view detail settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
