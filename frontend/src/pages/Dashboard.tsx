import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import AlertsPanel from "../components/AlertsPanel";
import Heatmap from "../components/Charts/Heatmap";
import PieChartCard from "../components/Charts/PieChart";
import ScoreCard from "../components/ScoreCard";
import SummaryCard from "../components/SummaryCard";
import {
  addManualTransaction,
  getAiSummary,
  getAlerts,
  getCategoryData,
  getHealthScore,
  getSummary,
  listNotifications,
  markNotificationRead,
  predictCategory,
  uploadCsv,
} from "../services/api";
import { AlertItem, AppNotification } from "../types/transaction";

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [categories, setCategories] = useState<{ category: string; amount: number }[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [manualDate, setManualDate] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [savingManual, setSavingManual] = useState(false);
  const [savingCsv, setSavingCsv] = useState(false);

  const [predictInput, setPredictInput] = useState("");
  const [predictResult, setPredictResult] = useState<{ category: string; confidence: number } | null>(null);
  const [predictLoading, setPredictLoading] = useState(false);

  const loadDashboard = async () => {
    const [s, c, a, h, ai, n] = await Promise.all([
      getSummary(),
      getCategoryData(),
      getAlerts(),
      getHealthScore(),
      getAiSummary(),
      listNotifications({ limit: 5 }),
    ]);
    setSummary(s);
    setCategories(c);
    setAlerts(a.alerts || []);
    setHealth(h);
    setAiSummary(ai.summary || "");
    setNotifications(n);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleManualSubmit = async () => {
    const parsedAmount = Number(manualAmount);
    if (!manualDate || !manualDescription.trim() || Number.isNaN(parsedAmount)) {
      toast.error("Enter valid date, description and amount.");
      return;
    }

    setSavingManual(true);
    try {
      await addManualTransaction({
        date: manualDate,
        description: manualDescription.trim(),
        amount: parsedAmount,
      });
      toast.success("Transaction added.");
      setManualDate("");
      setManualDescription("");
      setManualAmount("");
      await loadDashboard();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to add transaction.");
    } finally {
      setSavingManual(false);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast.error("Select CSV file first.");
      return;
    }

    setSavingCsv(true);
    try {
      const res = await uploadCsv(csvFile);
      toast.success(`Inserted ${res.inserted_count}, duplicates ${res.duplicate_count}`);
      setCsvFile(null);
      await loadDashboard();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "CSV upload failed.");
    } finally {
      setSavingCsv(false);
    }
  };

  const handlePredict = async () => {
    if (!predictInput.trim()) {
      toast.error("Enter a description first.");
      return;
    }
    setPredictLoading(true);
    try {
      const prediction = await predictCategory(predictInput.trim());
      setPredictResult(prediction);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Prediction failed.");
    } finally {
      setPredictLoading(false);
    }
  };

  const handleMarkRead = async (notificationId: number) => {
    await markNotificationRead(notificationId, true);
    await loadDashboard();
  };

  if (!summary || !health) {
    return <div className="card">Loading dashboard...</div>;
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card space-y-3">
          <h3 className="text-sm text-slate-400">Add Transaction (Dashboard Input)</h3>
          <input
            type="date"
            value={manualDate}
            onChange={(e) => setManualDate(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Description"
            value={manualDescription}
            onChange={(e) => setManualDescription(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Amount (use negative for income)"
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
          <button
            onClick={handleManualSubmit}
            disabled={savingManual}
            className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
          >
            {savingManual ? "Saving..." : "Add Transaction"}
          </button>
        </div>

        <div className="card space-y-3">
          <h3 className="text-sm text-slate-400">Upload CSV (Date, Description, Amount)</h3>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
          <button
            onClick={handleCsvUpload}
            disabled={savingCsv}
            className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
          >
            {savingCsv ? "Uploading..." : "Upload CSV"}
          </button>
        </div>

        <div className="card space-y-3">
          <h3 className="text-sm text-slate-400">AI Category Check</h3>
          <input
            type="text"
            value={predictInput}
            placeholder="e.g. Uber ride to office"
            onChange={(e) => setPredictInput(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
          <button
            onClick={handlePredict}
            disabled={predictLoading}
            className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
          >
            {predictLoading ? "Predicting..." : "Predict Category"}
          </button>
          {predictResult && (
            <p className="text-sm text-slate-300">
              {predictResult.category} ({Math.round(predictResult.confidence * 100)}% confidence)
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Monthly Expense" value={`INR ${summary.total_monthly_spending.toFixed(2)}`} sub={summary.month} />
        <SummaryCard title="Monthly Income" value={`INR ${summary.total_monthly_income.toFixed(2)}`} />
        <SummaryCard title="Net Savings" value={`INR ${summary.net_savings.toFixed(2)}`} />
        <SummaryCard title="Highest Category" value={summary.highest_category || "N/A"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <PieChartCard data={categories} />
        </div>
        <ScoreCard score={health.score} tips={health.tips || []} />
      </div>

      <Heatmap data={summary.daily_spending_heatmap || []} />
      <AlertsPanel alerts={alerts} />

      <div className="card space-y-2">
        <h3 className="text-sm text-slate-400">Notifications</h3>
        {notifications.length === 0 && <p className="text-sm text-slate-400">No notifications.</p>}
        {notifications.map((item) => (
          <div key={item.id} className="rounded-md border border-slate-800 p-3 text-sm">
            <p className="text-slate-200">{item.message}</p>
            <p className="mt-1 text-xs text-slate-500">
              {item.type} • {new Date(item.created_at).toLocaleString()}
            </p>
            {!item.is_read && (
              <button
                onClick={() => handleMarkRead(item.id)}
                className="mt-2 rounded-md border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
              >
                Mark read
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="card text-sm text-slate-300">{aiSummary}</div>
    </section>
  );
}
