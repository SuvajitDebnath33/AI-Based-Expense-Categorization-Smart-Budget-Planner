import axios from "axios";

import {
  AppNotification,
  Budget,
  BudgetRecommendation,
  CategoryPrediction,
  SavingsGoal,
  Transaction,
} from "../types/transaction";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8001/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const uploadCsv = async (file: File) => {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as { inserted_count: number; duplicate_count: number; transactions: Transaction[] };
};

export const addManualTransaction = async (payload: { date: string; description: string; amount: number }) =>
  (await api.post<Transaction>("/transactions", payload)).data;

export const getTransactions = async (limit = 100, offset = 0) =>
  (await api.get<Transaction[]>("/transactions", { params: { limit, offset } })).data;

export const overrideCategory = async (transactionId: number, payload: { new_category: string; reason?: string }) =>
  (await api.patch<Transaction>(`/transactions/${transactionId}/override`, payload)).data;

export const getSummary = async () => (await api.get("/analytics/summary")).data;
export const getCategoryData = async () => (await api.get("/analytics/categories")).data;
export const getMonthlyTrend = async () => (await api.get("/analytics/monthly-trend")).data;
export const getAlerts = async () => (await api.get("/alerts")).data;
export const getBudgetRecommendations = async () =>
  (
    await api.get<{ month: string; recommendations: BudgetRecommendation[]; projected_savings: number }>(
      "/budget/recommendations",
    )
  ).data;
export const getForecast = async () => (await api.get("/forecast")).data;
export const getForecastAdvanced = async () => (await api.get("/analytics/forecast")).data;
export const getHealthScore = async () => (await api.get("/financial-health-score")).data;
export const getAiSummary = async () => (await api.get("/ai-summary")).data;

export const predictCategory = async (description: string) =>
  (await api.post<CategoryPrediction>("/ai/predict-category", { description })).data;

export const retrainModel = async (algorithm: "logistic_regression" | "naive_bayes" = "logistic_regression") =>
  (await api.post("/ai/retrain-model", { algorithm })).data;

export const listBudgets = async (params?: { month?: number; year?: number; limit?: number; offset?: number }) =>
  (await api.get<Budget[]>("/budgets", { params })).data;

export const createBudget = async (payload: {
  category: string;
  monthly_limit: number;
  month: number;
  year: number;
  category_id?: number | null;
}) => (await api.post<Budget>("/budgets", payload)).data;

export const updateBudget = async (
  budgetId: number,
  payload: Partial<{
    category: string;
    monthly_limit: number;
    month: number;
    year: number;
    category_id: number | null;
  }>,
) => (await api.patch<Budget>(`/budgets/${budgetId}`, payload)).data;

export const deleteBudget = async (budgetId: number) => (await api.delete(`/budgets/${budgetId}`)).data;

export const listSavingsGoals = async (params?: { limit?: number; offset?: number }) =>
  (await api.get<SavingsGoal[]>("/savings-goals", { params })).data;

export const createSavingsGoal = async (payload: {
  target_amount: number;
  target_date: string;
  current_saved?: number;
}) => (await api.post<SavingsGoal>("/savings-goals", payload)).data;

export const updateSavingsGoalProgress = async (goalId: number, current_saved: number) =>
  (await api.patch<SavingsGoal>(`/savings-goals/${goalId}/progress`, { current_saved })).data;

export const deleteSavingsGoal = async (goalId: number) => (await api.delete(`/savings-goals/${goalId}`)).data;

export const listNotifications = async (params?: { unread_only?: boolean; limit?: number; offset?: number }) =>
  (await api.get<AppNotification[]>("/notifications", { params })).data;

export const markNotificationRead = async (notificationId: number, is_read = true) =>
  (await api.patch<AppNotification>(`/notifications/${notificationId}`, { is_read })).data;

export const getMonthlySummary = async () => (await api.get("/analytics/monthly-summary")).data;
export const getCategoryDistribution = async (params?: { month?: number; year?: number }) =>
  (await api.get("/analytics/category-distribution", { params })).data;
export const getIncomeVsExpense = async () => (await api.get("/analytics/income-vs-expense")).data;
export const getSavingsRate = async () => (await api.get("/analytics/savings-rate")).data;
