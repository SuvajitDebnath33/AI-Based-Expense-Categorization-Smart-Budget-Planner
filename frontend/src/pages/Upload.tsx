import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { retrainModel, uploadCsv } from "../services/api";
import type { Transaction } from "../types/transaction";
import { inr, percent } from "../utils/format";

type PreviewRow = {
  Date: string;
  Description: string;
  Amount: string;
};

const REQUIRED_COLUMNS = ["Date", "Description", "Amount"];

function parsePreview(text: string): PreviewRow[] {
  const [headerLine, ...body] = text.split(/\r?\n/).filter(Boolean);
  if (!headerLine) {
    return [];
  }
  const headers = headerLine.split(",").map((item) => item.trim());
  return body.slice(0, 8).map((line) => {
    const values = line.split(",").map((item) => item.trim());
    return headers.reduce(
      (acc, header, index) => ({ ...acc, [header]: values[index] || "" }),
      {} as PreviewRow,
    );
  });
}

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Transaction[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [retraining, setRetraining] = useState<"idle" | "logistic_regression" | "random_forest">("idle");
  const [dragActive, setDragActive] = useState(false);

  const isValid = useMemo(() => missingColumns.length === 0 && !!file, [missingColumns.length, file]);

  const handleFile = async (nextFile: File | null) => {
    setFile(nextFile);
    setRows([]);
    setUploadProgress(0);
    if (!nextFile) {
      setPreviewRows([]);
      setMissingColumns([]);
      return;
    }

    const text = await nextFile.text();
    const [headerLine = ""] = text.split(/\r?\n/);
    const headers = headerLine.split(",").map((item) => item.trim());
    setMissingColumns(REQUIRED_COLUMNS.filter((column) => !headers.includes(column)));
    setPreviewRows(parsePreview(text));
  };

  const handleUpload = async () => {
    if (!file || !isValid) {
      toast.error("Choose a valid CSV with Date, Description and Amount columns.");
      return;
    }

    setUploading(true);
    try {
      const response = await uploadCsv(file, (event) => {
        const total = event.total || file.size;
        const loaded = event.loaded || 0;
        setUploadProgress(Math.round((loaded / total) * 100));
      });
      setRows(response.transactions);
      toast.success(`Imported ${response.inserted_count} transactions. Duplicates skipped: ${response.duplicate_count}.`);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleRetrain = async (algorithm: "logistic_regression" | "random_forest") => {
    setRetraining(algorithm);
    try {
      const result = await retrainModel(algorithm);
      toast.success(`Retrained ${result.trained_samples} samples with ${result.text_embedding_backend}.`);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Retraining failed.");
    } finally {
      setRetraining("idle");
    }
  };

  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel panel-strong">
          <p className="text-xs uppercase tracking-[0.26em] text-slate-500">CSV intake</p>
          <h2 className="mt-2 text-2xl font-semibold">Drag, validate, upload</h2>
          <p className="mt-2 max-w-xl text-sm muted">
            Upload bank or wallet exports with `Date`, `Description`, and `Amount`. The app previews rows before import, validates columns, flags duplicates, and stores model confidence.
          </p>

          <label
            className={[
              "mt-6 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed px-6 py-8 text-center transition",
              dragActive ? "border-emerald-300/60 bg-emerald-300/10" : "border-white/15 bg-white/[0.03]",
            ].join(" ")}
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              void handleFile(event.dataTransfer.files?.[0] || null);
            }}
          >
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(event) => {
                void handleFile(event.target.files?.[0] || null);
              }}
            />
            <p className="text-lg font-medium">{file ? file.name : "Drop CSV here or click to choose a file"}</p>
            <p className="mt-2 text-sm muted">Max preview: first 8 rows</p>
          </label>

          {missingColumns.length > 0 && (
            <div className="mt-4 rounded-[22px] border border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-100">
              Missing required columns: {missingColumns.join(", ")}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="button-primary" disabled={!isValid || uploading} onClick={handleUpload}>
              {uploading ? `Uploading ${uploadProgress}%` : "Upload and categorize"}
            </button>
            <button
              className="button-secondary"
              disabled={retraining !== "idle"}
              onClick={() => void handleRetrain("logistic_regression")}
            >
              {retraining === "logistic_regression" ? "Retraining..." : "Retrain logistic model"}
            </button>
            <button
              className="button-secondary"
              disabled={retraining !== "idle"}
              onClick={() => void handleRetrain("random_forest")}
            >
              {retraining === "random_forest" ? "Retraining..." : "Retrain random forest"}
            </button>
          </div>

          <div className="mt-4 progress-track">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>

        <div className="panel">
          <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Preview</p>
          <h3 className="mt-2 text-xl font-semibold">Column validation</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {REQUIRED_COLUMNS.map((column) => (
              <span
                key={column}
                className={[
                  "rounded-full px-3 py-1 text-xs font-medium",
                  missingColumns.includes(column) ? "bg-rose-300/12 text-rose-200" : "bg-emerald-300/12 text-emerald-100",
                ].join(" ")}
              >
                {column}
              </span>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {previewRows.length === 0 && <p className="text-sm muted">No preview available yet.</p>}
            {previewRows.map((row, index) => (
              <div key={`${row.Description}-${index}`} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4 text-sm">
                <p className="font-medium">{row.Description}</p>
                <p className="mt-1 muted">
                  {row.Date} • {row.Amount}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Upload result</p>
            <h3 className="text-xl font-semibold">Categorized transactions</h3>
          </div>
          {rows.length > 0 && <span className="pill">{rows.length} rows</span>}
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Confidence</th>
                <th>Signals</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-sm muted">
                    Upload a CSV to see categorized results here.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className={row.low_confidence ? "bg-amber-200/5" : ""}>
                  <td>{row.date}</td>
                  <td>
                    <p>{row.description}</p>
                    <p className="mt-1 text-xs muted">{row.merchant}</p>
                  </td>
                  <td>{row.category}</td>
                  <td>{percent(row.prediction_confidence)}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {row.low_confidence && <span className="rounded-full bg-amber-300/12 px-3 py-1 text-xs text-amber-100">Low confidence</span>}
                      {row.anomaly_flag && <span className="rounded-full bg-rose-300/12 px-3 py-1 text-xs text-rose-100">Anomaly</span>}
                      {row.is_subscription && <span className="rounded-full bg-sky-300/12 px-3 py-1 text-xs text-sky-100">{row.recurrence}</span>}
                    </div>
                  </td>
                  <td>{inr(Math.abs(row.amount_inr))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
