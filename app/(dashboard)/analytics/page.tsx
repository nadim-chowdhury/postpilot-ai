import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getPages } from "@/actions/page.actions";
import AnalyticsClient from "../../../components/analytics/analytics-client";

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  const pagesRes = await getPages();
  const pages = pagesRes.success ? pagesRes.data || [] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Track engagement metrics and get AI content suggestions.
          </p>
        </div>
      </div>
      <AnalyticsClient pages={pages} />
    </div>
  );
}
