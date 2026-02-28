import { useState } from "react";
import toast from "react-hot-toast";

import { retrainModel, uploadCsv } from "../services/api";
import { Transaction } from "../types/transaction";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [retraining, setRetraining] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Select a CSV file first.");
      return;
    }

    setLoading(true);
    try {
      const data = await uploadCsv(file);
      setRows(data.transactions);
      toast.success(`Inserted ${data.inserted_count} transactions, duplicates ${data.duplicate_count}.`);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      const result = await retrainModel("logistic_regression");
      toast.success(`Retrained with ${result.trained_samples} samples and ${result.distinct_categories} categories.`);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Model retraining failed.");
    } finally {
      setRetraining(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="card">
        <h2 className="mb-2 text-xl font-semibold">Upload Bank Statement</h2>
        <p className="mb-4 text-sm text-slate-400">CSV columns: Date, Description, Amount</p>
        <div className="flex flex-wrap gap-3">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
          <button
            onClick={handleUpload}
            disabled={loading}
            className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
          >
            {loading ? "Uploading..." : "Upload & Categorize"}
          </button>
          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="rounded-md border border-cyan-500/40 px-4 py-2 text-sm text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-60"
          >
            {retraining ? "Retraining..." : "Retrain AI Model"}
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h3 className="mb-2 text-sm text-slate-400">Recent Upload Result</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-slate-400">
              <th className="p-2">Date</th>
              <th className="p-2">Description</th>
              <th className="p-2">Category</th>
              <th className="p-2">Confidence</th>
              <th className="p-2">Anomaly</th>
              <th className="p-2">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-800">
                <td className="p-2">{row.date}</td>
                <td className="p-2">{row.description}</td>
                <td className="p-2">{row.category}</td>
                <td className="p-2">{(row.prediction_confidence * 100).toFixed(0)}%</td>
                <td className="p-2">{row.anomaly_flag ? "Yes" : "No"}</td>
                <td className="p-2">{Math.abs(row.amount_inr).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
