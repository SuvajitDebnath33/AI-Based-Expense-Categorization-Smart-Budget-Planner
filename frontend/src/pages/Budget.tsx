import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { EXPENSE_CATEGORIES } from "../constants/categories";
import { createBudget, createSavingsGoal, getBudgetInsights, listBudgets, listSavingsGoals, updateSavingsGoalProgress } from "../services/api";
import type { Budget as BudgetItem, BudgetInsights, SavingsGoal } from "../types/transaction";
import { inr } from "../utils/format";

export default function Budget() {
  const now = useMemo(() => new Date(), []);
  const [budgetInsights, setBudgetInsights] = useState<BudgetInsights | null>(null);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [category, setCategory] = useState("Food");
  const [monthlyLimit, setMonthlyLimit] = useState(8000);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [targetAmount, setTargetAmount] = useState(50000);
  const [targetDate, setTargetDate] = useState(`${now.getFullYear()}-12-31`);
  const [currentSaved, setCurrentSaved] = useState(0);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [insights, budgetRows, goalRows] = await Promise.all([getBudgetInsights(), listBudgets(), listSavingsGoals()]);
      setBudgetInsights(insights);
      setBudgets(budgetRows);
      setGoals(goalRows);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to load budget planner.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreateBudget = async () => {
    setSaving(true);
    try {
      await createBudget({
        category,
        monthly_limit: Number(monthlyLimit),
        month: Number(month),
        year: Number(year),
      });
      toast.success("Budget saved.");
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Budget creation failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateGoal = async () => {
    setSaving(true);
    try {
      await createSavingsGoal({
        target_amount: Number(targetAmount),
        target_date: targetDate,
        current_saved: Number(currentSaved),
      });
      toast.success("Savings goal created.");
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Goal creation failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleProgress = async (goal: SavingsGoal, amount: number) => {
    setSaving(true);
    try {
      await updateSavingsGoalProgress(goal.id, goal.current_saved + amount);
      toast.success("Savings progress updated.");
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Progress update failed.");
    } finally {
      setSaving(false);
    }
  };

  if (!budgetInsights) {
    return <div className="panel">Loading budget planner...</div>;
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="kpi">
          <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Budgeted</p>
          <p className="mt-4 text-3xl font-semibold">{inr(budgetInsights.overview.monthly_budget)}</p>
        </div>
        <div className="kpi">
          <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Spent</p>
          <p className="mt-4 text-3xl font-semibold">{inr(budgetInsights.overview.total_spending)}</p>
        </div>
        <div className="kpi">
          <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Remaining</p>
          <p className="mt-4 text-3xl font-semibold">{inr(budgetInsights.overview.remaining_budget)}</p>
        </div>
        <div className="kpi">
          <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Next month forecast</p>
          <p className="mt-4 text-3xl font-semibold">{inr(budgetInsights.forecast.predicted_amount)}</p>
        </div>
      </div>

      {budgetInsights.alerts.length > 0 && (
        <div className="panel border-amber-300/20 bg-amber-300/10">
          <p className="text-xs uppercase tracking-[0.26em] text-amber-50/70">Budget alerts</p>
          <div className="mt-3 space-y-2 text-sm text-amber-50">
            {budgetInsights.alerts.map((alert) => (
              <div key={alert}>{alert}</div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="panel space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Set budget</p>
            <h2 className="text-xl font-semibold">Category budget planner</h2>
          </div>
          <select className="field" value={category} onChange={(event) => setCategory(event.target.value)}>
            {EXPENSE_CATEGORIES.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
          <input className="field" type="number" value={monthlyLimit} onChange={(event) => setMonthlyLimit(Number(event.target.value))} />
          <div className="grid grid-cols-2 gap-3">
            <input className="field" type="number" value={month} min={1} max={12} onChange={(event) => setMonth(Number(event.target.value))} />
            <input className="field" type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} />
          </div>
          <button className="button-primary w-full" disabled={saving} onClick={() => void handleCreateBudget()}>
            Save monthly budget
          </button>
        </div>

        <div className="panel space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Savings goal</p>
            <h2 className="text-xl font-semibold">Target-based planner</h2>
          </div>
          <input className="field" type="number" value={targetAmount} onChange={(event) => setTargetAmount(Number(event.target.value))} />
          <input className="field" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
          <input className="field" type="number" value={currentSaved} onChange={(event) => setCurrentSaved(Number(event.target.value))} />
          <button className="button-primary w-full" disabled={saving} onClick={() => void handleCreateGoal()}>
            Save savings goal
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Utilization</p>
          <h2 className="text-xl font-semibold">Budget progress</h2>
        </div>
        <div className="space-y-4">
          {budgetInsights.budgets.length === 0 && <p className="text-sm muted">No category budgets configured yet.</p>}
          {budgetInsights.budgets.map((item) => (
            <div key={item.category} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{item.category}</p>
                  <p className="mt-1 text-sm muted">
                    {inr(item.spent)} of {inr(item.limit)}
                  </p>
                </div>
                <div className={item.exceeded ? "text-rose-200" : "text-slate-100"}>{item.percentage_used.toFixed(1)}%</div>
              </div>
              <div className="mt-3 progress-track">
                <div className="progress-fill" style={{ width: `${Math.min(item.percentage_used, 100)}%` }} />
              </div>
              <p className="mt-2 text-sm muted">Remaining {inr(item.remaining)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="panel">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Budgets</p>
            <h2 className="text-xl font-semibold">Saved budgets</h2>
          </div>
          <div className="space-y-3">
            {budgets.length === 0 && <p className="text-sm muted">No budgets created yet.</p>}
            {budgets.map((budget) => (
              <div key={budget.id} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <p className="font-medium">
                  {budget.category} • {String(budget.month).padStart(2, "0")}/{budget.year}
                </p>
                <p className="mt-1 text-sm muted">
                  {inr(budget.total_spent_per_category)} spent • {inr(budget.remaining_budget)} remaining
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Savings goals</p>
            <h2 className="text-xl font-semibold">Progress tracker</h2>
          </div>
          <div className="space-y-3">
            {goals.length === 0 && <p className="text-sm muted">No savings goals created yet.</p>}
            {goals.map((goal) => (
              <div key={goal.id} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{inr(goal.target_amount)} target</p>
                    <p className="mt-1 text-sm muted">Due {goal.target_date}</p>
                  </div>
                  <span className="pill">{goal.completion_percentage.toFixed(0)}%</span>
                </div>
                <div className="mt-3 progress-track">
                  <div className="progress-fill" style={{ width: `${Math.min(goal.completion_percentage, 100)}%` }} />
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="button-secondary px-3 py-2 text-xs" disabled={saving} onClick={() => void handleProgress(goal, 1000)}>
                    +1000
                  </button>
                  <button className="button-secondary px-3 py-2 text-xs" disabled={saving} onClick={() => void handleProgress(goal, 5000)}>
                    +5000
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
