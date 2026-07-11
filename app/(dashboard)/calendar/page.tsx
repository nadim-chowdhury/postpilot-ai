"use client";

import { useState, useEffect } from "react";
import { getSchedules, cancelSchedule, reschedulePost } from "@/actions/schedule.actions";
import { CalendarView } from "@/components/calendar/calendar-view";
import type { ScheduleSummary } from "@/types/schedule.types";

export default function CalendarPage() {
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = async () => {
    setLoading(true);
    const result = await getSchedules({ pageSize: 100 }); // load a healthy size for monthly view
    if (result.success) {
      setSchedules(result.data.items);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleCancel = async (scheduleId: string) => {
    if (!confirm("Are you sure you want to cancel this scheduled post?")) return;
    const result = await cancelSchedule(scheduleId);
    if (result.success) {
      await fetchSchedules();
    } else {
      alert(result.error || "Failed to cancel schedule");
    }
  };

  const handleReschedule = async (scheduleId: string, newDate: Date) => {
    const result = await reschedulePost(scheduleId, newDate);
    if (result.success) {
      await fetchSchedules();
    } else {
      alert(result.error || "Failed to reschedule post");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Calendar</h2>
        <p className="text-sm text-muted-foreground">
          Visualize your publishing schedule across all pages.
        </p>
      </div>

      {/* Monthly View Grid */}
      <CalendarView
        schedules={schedules}
        onCancelSchedule={handleCancel}
        onReschedule={handleReschedule}
      />
    </div>
  );
}
