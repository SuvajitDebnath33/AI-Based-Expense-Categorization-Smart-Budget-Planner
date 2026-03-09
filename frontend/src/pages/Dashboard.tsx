import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { categorizeExpense, getAlerts, getAnalyticsOverview, getBudgetInsights, getMonthlyTrend, listNotifications, markNotificationRead } from "../services/api";
import type { AlertItem, AnalyticsOverview, AppNotification, BudgetInsights, CategorizeResult } from "../types/transaction";
import { inr, percent } from "../utils/format";

const COLORS = ["#68e1c2", "#56c8ff", "#f1c75b", "#ff7d6b", "#ae8cff", "#8de1a1"];

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [budgetInsights, setBudgetInsights] = useState<BudgetInsights | null>(null);
  const [trend, setTrend] = useState<{ month: string; income: number; expense: number }[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [checkingText, setCheckingText] = useState("Uber ride to office");
  const [prediction, setPrediction] = useState<CategorizeResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [analyticsData, budgetData, trendData, alertData, notificationData] = await Promise.all([
        getAnalyticsOverview(),
        getBudgetInsights(),
        getMonthlyTrend(),
        getAlerts(),
        listNotifications({ limit: 6 }),
      ]);
      setAnalytics(analyticsData);
      setBudgetInsights(budgetData);
      setTrend(trendData);
      setAlerts(alertData.alerts || []);
      setNotifications(notificationData);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCategorize = async () => {
    try {
      const result = await categorizeExpense(checkingText);
      setPrediction(result);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Prediction failed.");
    }
  };

  const handleMarkRead = async (id: number) => {
    await markNotificationRead(id, true);
    await load();
  };

  if (loading || !analytics || !budgetInsights) {
    return <div className="panel">Loading dashboard...</div>;
  }

  const overview = budgetInsights.overview;

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="kpi">
          <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Total spending</p>
          <p className="mt-4 text-3xl font-semibold">{inr(overview.total_spending)}</p>
          <p className="mt-2 text-sm muted">Current month {overview.month}</p>
        </div>
        <div className="kpi">
          <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Monthly budget</p>
          <p className="mt-4 text-3xl font-semibold">{inr(overview.monthly_budget)}</p>
          <p className="mt-2 text-sm muted">Configured category budgets</p>
        </div>
        <div className="kpi">
          <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Top category</p>
          <p className="mt-4 text-3xl font-semibold">{overview.top_category}</p>
          <p className="mt-2 text-sm muted">Largest expense bucket this month</p>
        </div>
        <div className="kpi">
          <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Remaining budget</p>
          <p className={`mt-4 text-3xl font-semibold ${overview.remaining_budget < 0 ? "text-rose-300" : ""}`}>
            {inr(overview.remaining_budget)}
          </p>
          <p className="mt-2 text-sm muted">Budget runway for the month</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="panel panel-strong">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Spending mix</p>
              <h2 className="text-xl font-semibold">Category distribution</h2>
            </div>
            <span className="pill">{analytics.overview.month}</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.category_distribution} dataKey="amount" nameKey="category" innerRadius={70} outerRadius={110}>
                  {analytics.category_distribution.map((entry, index) => (
                    <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => inr(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-slate-500">AI check</p>
            <h2 className="text-xl font-semibold">Categorize before import</h2>
          </div>
          <input className="field" value={checkingText} onChange={(event) => setCheckingText(event.target.value)} />
          <button className="button-primary w-full" onClick={handleCategorize}>
            Run categorizer
          </button>
          {prediction && (
            <div className="rounded-[22px] border border-emerald-300/15 bg-emerald-300/10 p-4">
              <p className="text-sm font-medium text-emerald-100">{prediction.predicted_category}</p>
              <p className="mt-1 text-sm muted">
                {prediction.merchant} • {percent(prediction.confidence)}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{prediction.model_source}</p>
            </div>
          )}
          <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-medium">Budget forecast</p>
            <p className="mt-2 text-2xl font-semibold">{inr(analytics.forecast.predicted_amount)}</p>
            <p className="mt-1 text-sm muted">Predicted for {analytics.forecast.month}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="panel">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Income vs expense</p>
            <h2 className="text-xl font-semibold">Monthly trend</h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <XAxis dataKey="month" stroke="#89a3ad" />
                <YAxis stroke="#89a3ad" />
                <Tooltip formatter={(value: number) => inr(value)} />
                <Legend />
                <Bar dataKey="income" fill="#56c8ff" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expense" fill="#68e1c2" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Trend signal</p>
            <h2 className="text-xl font-semibold">Expense momentum</h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <XAxis dataKey="month" stroke="#89a3ad" />
                <YAxis stroke="#89a3ad" />
                <Tooltip formatter={(value: number) => inr(value)} />
                <Line type="monotone" dataKey="expense" stroke="#f1c75b" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.26em] text-slate-500">AI insights</p>
            <h2 className="text-xl font-semibold">What changed this month</h2>
          </div>
          <div className="space-y-3">
            {budgetInsights.insights.map((insight) => (
              <div key={insight} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-sm">
                {insight}
              </div>
            ))}
          </div>
          {alerts.length > 0 && (
            <div className="mt-4 rounded-[22px] border border-amber-300/20 bg-amber-300/10 p-4">
              <p className="text-sm font-medium text-amber-100">Active alerts</p>
              <div className="mt-3 space-y-2 text-sm text-amber-50/90">
                {alerts.map((alert) => (
                  <div key={alert.message}>{alert.message}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Live queue</p>
            <h2 className="text-xl font-semibold">Notifications</h2>
          </div>
          <div className="space-y-3">
            {notifications.length === 0 && <p className="text-sm muted">No notifications yet.</p>}
            {notifications.map((notification) => (
              <div key={notification.id} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm">{notification.message}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{new Date(notification.created_at).toLocaleString()}</span>
                  {!notification.is_read && (
                    <button className="button-secondary px-3 py-2 text-xs" onClick={() => handleMarkRead(notification.id)}>
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
