export type Transaction = {
  id: number;
  date: string;
  description: string;
  merchant: string;
  amount: number;
  currency: string;
  amount_inr: number;
  category: string;
  prediction_confidence: number;
  is_income: boolean;
  is_subscription: boolean;
  anomaly_flag: boolean;
  recurrence: string;
};

export type AlertItem = {
  message: string;
  severity: "low" | "medium" | "high";
};

export type BudgetRecommendation = {
  category: string;
  current_spend: number;
  recommended_budget: number;
  potential_savings: number;
  advice: string;
};

export type Budget = {
  id: number;
  user_id: number;
  category: string;
  category_id: number | null;
  monthly_limit: number;
  month: number;
  year: number;
  total_spent_per_category: number;
  remaining_budget: number;
  percentage_used: number;
  overspending_flag: boolean;
};

export type SavingsGoal = {
  id: number;
  user_id: number;
  target_amount: number;
  target_date: string;
  current_saved: number;
  completion_percentage: number;
  months_remaining: number | null;
};

export type AppNotification = {
  id: number;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type CategoryPrediction = {
  category: string;
  confidence: number;
};
