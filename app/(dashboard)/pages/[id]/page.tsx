"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/shared/spinner";
import { getPage } from "@/actions/page.actions";
import { getPageDetailedStats } from "@/actions/analytics.actions";
import { PageDetailStats } from "@/components/pages/page-detail-stats";
import type { PageDetail } from "@/types/page.types";
import type { PageDetailedStats } from "@/actions/analytics.actions";

export default function PageStatsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [page, setPage] = useState<PageDetail | null>(null);
  const [stats, setStats] = useState<PageDetailedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      const [pageRes, statsRes] = await Promise.all([
        getPage(params.id),
        getPageDetailedStats(params.id),
      ]);

      if (!pageRes.success) {
        setError(pageRes.error);
        setLoading(false);
        return;
      }

      setPage(pageRes.data);

      if (statsRes.success) {
        setStats(statsRes.data);
      }

      setLoading(false);
    };

    loadData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground"
          onClick={() => router.push("/pages")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pages
        </Button>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-destructive font-medium">
            {error || "Page not found"}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => router.push("/pages")}
          >
            Go to Pages
          </Button>
        </div>
      </div>
    );
  }

  return <PageDetailStats page={page} stats={stats} />;
}
