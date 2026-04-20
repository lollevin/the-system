export type UserRole = "admin" | "staff" | "customer";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  points_balance: number;
  total_spent: number;
  visit_count: number;
  last_visit: string | null;
  birthday: string | null;
  preferred_contact: "whatsapp" | "sms" | "email" | null;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Customer event types
export type EventType = "birthday" | "anniversary" | "churn_risk" | "points_expiry" | "vip_upgrade";

export interface CustomerEvent {
  id: string;
  customer: Profile;
  event_type: EventType;
  event_date: string;
  message?: string;
  is_sent: boolean;
}

// Message template types
export interface MessageTemplate {
  id: string;
  name: string;
  type: EventType | "promotion" | "custom";
  template: string;
  is_active: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  staff_id: string | null;
  type: "earn" | "redeem" | "adjust";
  points: number;
  amount: number | null;
  reason: string | null;
  created_at: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AICampaign {
  id: string;
  name: string;
  goal: string;
  target_segment: string | null;
  message_template: string;
  recipients_count: number;
  sent_count: number;
  status: "draft" | "sending" | "completed" | "failed";
  created_by: string;
  created_at: string;
  completed_at: string | null;
}

export interface Voucher {
  id: string;
  code: string;
  name: string;
  description: string | null;
  points_required: number;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order: number | null;
  max_uses: number | null;
  uses_count: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  voucher_type: "global" | "personal";
  target_customer_id: string | null;
  created_by_ai: boolean;
  ai_reason: string | null;
  image_url: string | null;
}

export interface CustomerPreferences {
  id: string;
  customer_id: string;
  favorite_items: string[] | null;
  preferred_visit_time: string | null;
  average_spend: number | null;
  visit_frequency: string | null;
  last_voucher_used: string | null;
  voucher_usage_count: number;
  response_rate: number | null;
  churn_risk_score: number;
  lifetime_value: number;
  ai_notes: string | null;
  updated_at: string;
}

export interface UserVoucher {
  id: string;
  user_id: string;
  voucher_id: string;
  code: string;
  is_used: boolean;
  used_at: string | null;
  used_by_staff_id: string | null;
  expires_at: string;
  created_at: string;
}
