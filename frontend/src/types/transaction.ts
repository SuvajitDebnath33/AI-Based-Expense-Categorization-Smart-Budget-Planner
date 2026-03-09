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
  merchant_logo_url?: string | null;
  low_confidence?: boolean;
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
  merchant: string;
  merchant_logo_url?: string | null;
  model_source: string;
};

export type CategorizeResult = {
  description: string;
  predicted_category: string;
  confidence: number;
  merchant: string;
  merchant_logo_url?: string | null;
  model_source: string;
};

export type AnalyticsOverview = {
  overview: {
    month: string;
    total_spending: number;
    monthly_budget: number;
    top_category: string;
    remaining_budget: number;
  };
  category_distribution: { category: string; amount: number }[];
  monthly_category_spending: { month: string; category: string; amount: number }[];
  forecast: {
    month: string;
    predicted_amount: number;
    confidence_interval?: [number, number] | null;
  };
  duplicates: { description: string; amount: number; count: number }[];
  subscriptions: { merchant: string; recurrence: string; average_amount: number }[];
  insights: string[];
};

export type BudgetInsights = {
  overview: {
    month: string;
    total_spending: number;
    monthly_budget: number;
    top_category: string;
    remaining_budget: number;
  };
  budgets: {
    category: string;
    limit: number;
    spent: number;
    remaining: number;
    percentage_used: number;
    exceeded: boolean;
  }[];
  alerts: string[];
  forecast: {
    month: string;
    predicted_amount: number;
    confidence_interval?: [number, number] | null;
  };
  monthly_category_spending: { month: string; category: string; amount: number }[];
  subscriptions: { merchant: string; recurrence: string; average_amount: number }[];
  duplicates: { description: string; amount: number; count: number }[];
  insights: string[];
};

export type UploadResponse = {
  inserted_count: number;
  duplicate_count: number;
  transactions: Transaction[];
};

export type UserProfile = {
  id: number;
  full_name: string;
  email: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: UserProfile;
};
