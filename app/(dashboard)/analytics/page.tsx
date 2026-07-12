"use client";

import { useState, useEffect } from "react";
import { LineChart as LineChartIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/shared/spinner";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPages } from "@/actions/page.actions";
import AnalyticsClient from "@/components/analytics/analytics-client";

export default function AnalyticsPage() {
  const [pages, setPages] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const pagesRes = await getPages();
      if (pagesRes.success) {
        setPages(pagesRes.data.map((p: any) => ({ id: p.id, name: p.name })));
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
