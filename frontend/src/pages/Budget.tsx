import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  createBudget,
  createSavingsGoal,
  getBudgetRecommendations,
  getForecastAdvanced,
  listBudgets,
  listSavingsGoals,
  updateSavingsGoalProgress,
} from "../services/api";
import type { Budget as BudgetItem, SavingsGoal } from "../types/transaction";

export default function Budget() {
  const [recommendations, setRecommendations] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);

  const now = useMemo(() => new Date(), []);
  const [category, setCategory] = useState("Food");
  const [monthlyLimit, setMonthlyLimit] = useState<number>(5000);
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());

  const [targetAmount, setTargetAmount] = useState<number>(50000);
  const [targetDate, setTargetDate] = useState<string>(`${now.getFullYear()}-12-31`);
  const [currentSaved, setCurrentSaved] = useState<number>(0);

  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [r, f, b, g] = await Promise.all([
      getBudgetRecommendations(),
      getForecastAdvanced(),
      listBudgets(),
      listSavingsGoals(),
    ]);
    setRecommendations(r);
    setForecast(f);
    setBudgets(b);
    setGoals(g);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateBudget = async () => {
    setLoading(true);
    try {
      await createBudget({
        category,
        monthly_limit: Number(monthlyLimit),
        month: Number(month),
        year: Number(year),
      });
      toast.success("Budget created.");
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to create budget.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    setLoading(true);
    try {
      await createSavingsGoal({
        target_amount: Number(targetAmount),
        target_date: targetDate,
        current_saved: Number(currentSaved),
      });
      toast.success("Savings goal created.");
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to create savings goal.");
    } finally {
      setLoading(false);
    }
  };

  const handleProgressUpdate = async (goalId: number, nextSaved: number) => {
    setLoading(true);
    try {
      await updateSavingsGoalProgress(goalId, nextSaved);
      toast.success("Savings progress updated.");
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to update progress.");
    } finally {
      setLoading(false);
    }
  };

  if (!recommendations || !forecast) {
    return <div className="card">Loading budget engine...</div>;
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <p className="text-sm text-slate-400">Projected Next Month Spend</p>
          <p className="mt-2 text-2xl font-semibold text-cyan-300">INR {Number(forecast.predicted_amount || 0).toFixed(2)}</p>
          <p className="text-xs text-slate-500">Forecast month: {forecast.month}</p>
          {forecast.confidence_interval && (
            <p className="text-xs text-slate-500">
              95% CI: INR {forecast.confidence_interval[0]} - INR {forecast.confidence_interval[1]}
            </p>
          )}
        </div>
        <div className="card">
          <p className="text-sm text-slate-400">Projected Savings If Optimized</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">INR {recommendations.projected_savings.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card space-y-3">
          <h3 className="text-sm text-slate-400">Create Monthly Budget</h3>
          <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-800 p-2 text-sm" placeholder="Category" />
          <input type="number" value={monthlyLimit} onChange={(e) => setMonthlyLimit(Number(e.target.value))} className="w-full rounded-md border border-slate-700 bg-slate-800 p-2 text-sm" placeholder="Monthly limit" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={month} min={1} max={12} onChange={(e) => setMonth(Number(e.target.value))} className="rounded-md border border-slate-700 bg-slate-800 p-2 text-sm" placeholder="Month" />
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-md border border-slate-700 bg-slate-800 p-2 text-sm" placeholder="Year" />
          </div>
          <button disabled={loading} onClick={handleCreateBudget} className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60">
            Save Budget
          </button>
        </div>

        <div className="card space-y-3">
          <h3 className="text-sm text-slate-400">Create Savings Goal</h3>
          <input type="number" value={targetAmount} onChange={(e) => setTargetAmount(Number(e.target.value))} className="w-full rounded-md border border-slate-700 bg-slate-800 p-2 text-sm" placeholder="Target amount" />
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-800 p-2 text-sm" />
          <input type="number" value={currentSaved} onChange={(e) => setCurrentSaved(Number(e.target.value))} className="w-full rounded-md border border-slate-700 bg-slate-800 p-2 text-sm" placeholder="Current saved" />
          <button disabled={loading} onClick={handleCreateGoal} className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60">
            Save Goal
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-3 text-sm text-slate-400">Budget Utilization</h3>
        <div className="space-y-2">
          {budgets.map((b) => (
            <div key={b.id} className="rounded-lg border border-slate-800 p-3 text-sm">
              <p className="font-semibold text-cyan-300">
                {b.category} ({String(b.month).padStart(2, "0")}/{b.year})
              </p>
              <p>
                Spent INR {b.total_spent_per_category.toFixed(2)} / Limit INR {b.monthly_limit.toFixed(2)}
              </p>
              <p>
                Remaining: INR {b.remaining_budget.toFixed(2)} • Used: {b.percentage_used.toFixed(1)}%
              </p>
              {b.overspending_flag && <p className="text-amber-300">Warning: usage above 90%.</p>}
            </div>
          ))}
          {budgets.length === 0 && <p className="text-sm text-slate-400">No budgets created yet.</p>}
        </div>
      </div>

      <div className="card">
        <h3 className="mb-3 text-sm text-slate-400">Savings Goals</h3>
        <div className="space-y-2">
          {goals.map((g) => (
            <div key={g.id} className="rounded-lg border border-slate-800 p-3 text-sm">
              <p className="font-semibold text-emerald-300">
                Goal #{g.id}: INR {g.target_amount.toFixed(2)} by {g.target_date}
              </p>
              <p>
                Saved: INR {g.current_saved.toFixed(2)} • Completion: {g.completion_percentage.toFixed(2)}%
              </p>
              <p>
                Estimated months remaining:{" "}
                {g.months_remaining === null ? "N/A (insufficient savings trend)" : g.months_remaining.toFixed(2)}
              </p>
              <button
                className="mt-2 rounded-md border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
                onClick={() => handleProgressUpdate(g.id, g.current_saved + 1000)}
              >
                +1000 Progress
              </button>
            </div>
          ))}
          {goals.length === 0 && <p className="text-sm text-slate-400">No savings goals yet.</p>}
        </div>
      </div>

      <div className="card">
        <h3 className="mb-3 text-sm text-slate-400">Recommendations ({recommendations.month})</h3>
        <div className="space-y-2">
          {recommendations.recommendations.map((r: any) => (
            <div key={r.category} className="rounded-lg border border-slate-800 p-3 text-sm">
              <p className="font-semibold text-cyan-300">{r.category}</p>
              <p>
                Current: INR {r.current_spend.toFixed(2)} | Recommended: INR {r.recommended_budget.toFixed(2)}
              </p>
              <p>Potential savings: INR {r.potential_savings.toFixed(2)}</p>
              <p className="text-slate-400">{r.advice}</p>
            </div>
          ))}
          {recommendations.recommendations.length === 0 && <p className="text-sm text-slate-400">No high-risk categories right now.</p>}
        </div>
      </div>
    </section>
  );
}
