import { useEffect, useState } from "react";

import IncomeExpenseBar from "../components/Charts/BarChart";
import TrendLineChart from "../components/Charts/LineChart";
import {
  getCategoryDistribution,
  getIncomeVsExpense,
  getMonthlySummary,
  getSavingsRate,
  getSummary,
} from "../services/api";

export default function Analytics() {
  const [trend, setTrend] = useState<{ month: string; income: number; expense: number }[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [monthlySummary, setMonthlySummary] = useState<any[]>([]);
  const [distribution, setDistribution] = useState<any>({ month: null, distribution: [] });
  const [savingsRate, setSavingsRate] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [t, s, ms, d, sr] = await Promise.all([
        getIncomeVsExpense(),
        getSummary(),
        getMonthlySummary(),
        getCategoryDistribution(),
        getSavingsRate(),
      ]);
      setTrend(t);
      setSummary(s);
      setMonthlySummary(ms);
      setDistribution(d);
      setSavingsRate(sr);
    };
    load();
  }, []);

  if (!summary) {
    return <div className="card">Loading analytics...</div>;
  }

  return (
    <section className="space-y-4">
      <div className="card text-sm text-slate-300">
        Largest transaction: {summary.largest_transaction?.description || "N/A"} (INR {summary.largest_transaction?.amount_inr || 0})
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <TrendLineChart data={trend} />
        <IncomeExpenseBar data={trend} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card">
          <h3 className="mb-2 text-sm text-slate-400">Category Distribution ({distribution.month || "N/A"})</h3>
          <ul className="space-y-1 text-sm">
            {(distribution.distribution || []).map((item: { category: string; amount: number }) => (
              <li key={item.category} className="rounded-md border border-slate-800 p-2">
                {item.category}: INR {item.amount.toFixed(2)}
              </li>
            ))}
            {(!distribution.distribution || distribution.distribution.length === 0) && (
              <li className="text-slate-400">No category data.</li>
            )}
          </ul>
        </div>

        <div className="card">
          <h3 className="mb-2 text-sm text-slate-400">Savings Rate Trend</h3>
          <ul className="space-y-1 text-sm">
            {savingsRate.map((row) => (
              <li key={row.month} className="rounded-md border border-slate-800 p-2">
                {row.month}: {row.savings_rate.toFixed(2)}%
              </li>
            ))}
            {savingsRate.length === 0 && <li className="text-slate-400">No savings rate data.</li>}
          </ul>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-2 text-sm text-slate-400">Monthly Summary</h3>
        <ul className="space-y-1 text-sm">
          {monthlySummary.map((row) => (
            <li key={row.month} className="rounded-md border border-slate-800 p-2">
              {row.month}: Income INR {row.total_income.toFixed(2)}, Expense INR {row.total_expense.toFixed(2)}, Savings INR{" "}
              {row.net_savings.toFixed(2)}
            </li>
          ))}
          {monthlySummary.length === 0 && <li className="text-slate-400">No monthly summary data.</li>}
        </ul>
      </div>

      <div className="card">
        <h3 className="mb-2 text-sm text-slate-400">Top Merchants</h3>
        <ul className="space-y-1 text-sm">
          {(summary.top_merchants || []).map((m: { merchant: string; count: number }) => (
            <li key={m.merchant} className="rounded-md border border-slate-800 p-2">
              {m.merchant} - {m.count} txns
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
