"use client";

import { useState, useEffect } from "react";
import { LineChart as LineChartIcon } from "lucide-react";
import { Spinner } from "@/components/shared/spinner";
import { EmptyState } from "@/components/shared/empty-state";
import { getPages } from "@/actions/page.actions";
import AnalyticsClient from "@/components/analytics/analytics-client";
import type { PageSummary } from "@/types/page.types";

export default function AnalyticsPage() {
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const pagesRes = await getPages();
      if (pagesRes.success) {
        setPages(
          pagesRes.data
            .filter((p: PageSummary) => p.status !== "DISCONNECTED")
            .sort((a: PageSummary, b: PageSummary) => a.name.localeCompare(b.name))
        );
      }
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Track engagement metrics and get AI content suggestions.
        </p>
      </div>

      {pages.length === 0 ? (
        <EmptyState
          icon={LineChartIcon}
          title="No pages connected"
          description="Connect a Facebook Page first to start tracking analytics and engagement metrics."
        />
      ) : (
        <AnalyticsClient pages={pages} />
      )}
    </div>
  );
}
