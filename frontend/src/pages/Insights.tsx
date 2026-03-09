import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { getAnalyticsOverview, getBudgetInsights } from "../services/api";
import type { AnalyticsOverview, BudgetInsights } from "../types/transaction";
import { inr } from "../utils/format";

export default function Insights() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [budgetInsights, setBudgetInsights] = useState<BudgetInsights | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [analyticsData, budgetData] = await Promise.all([getAnalyticsOverview(), getBudgetInsights()]);
        setAnalytics(analyticsData);
        setBudgetInsights(budgetData);
      } catch (error: any) {
        toast.error(error?.response?.data?.detail || "Failed to load insights.");
      }
    };
    void load();
  }, []);

  if (!analytics || !budgetInsights) {
    return <div className="panel">Loading insights...</div>;
  }

  return (
    <section className="space-y-6">
      <div className="panel panel-strong">
        <p className="text-xs uppercase tracking-[0.26em] text-slate-500">AI-generated summary</p>
        <h2 className="mt-2 text-2xl font-semibold">Spending intelligence</h2>
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {budgetInsights.insights.map((insight) => (
            <div key={insight} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 text-sm">
              {insight}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="panel">
          <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Forecast</p>
          <p className="mt-2 text-3xl font-semibold">{inr(budgetInsights.forecast.predicted_amount)}</p>
          <p className="mt-2 text-sm muted">Expected for {budgetInsights.forecast.month}</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Duplicates</p>
          <p className="mt-2 text-3xl font-semibold">{analytics.duplicates.length}</p>
          <p className="mt-2 text-sm muted">Potential duplicate transaction groups</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Subscriptions</p>
          <p className="mt-2 text-3xl font-semibold">{analytics.subscriptions.length}</p>
          <p className="mt-2 text-sm muted">Recurring merchants detected</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="panel">
          <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Budget pressure</p>
          <h3 className="mt-2 text-xl font-semibold">Alerts and overruns</h3>
          <div className="mt-5 space-y-3">
            {budgetInsights.alerts.length === 0 && <p className="text-sm muted">No budget alerts right now.</p>}
            {budgetInsights.alerts.map((alert) => (
              <div key={alert} className="rounded-[20px] border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-50">
                {alert}
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Recurring merchants</p>
          <h3 className="mt-2 text-xl font-semibold">Subscription watchlist</h3>
          <div className="mt-5 space-y-3">
            {analytics.subscriptions.length === 0 && <p className="text-sm muted">No subscriptions detected yet.</p>}
            {analytics.subscriptions.map((item) => (
              <div key={`${item.merchant}-${item.recurrence}`} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.merchant}</p>
                    <p className="mt-1 text-sm muted">{item.recurrence}</p>
                  </div>
                  <div className="text-sm font-medium">{inr(item.average_amount)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
