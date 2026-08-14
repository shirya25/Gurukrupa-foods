export type Role = 'customer' | 'owner';

export interface UserProfile {
  id: string;
  role: Role;
  customer_id: number | null;
  created_at: string;
}

export interface MenuItem {
  id: number;
  name: string;
  emoji: string;
  description: string | null;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  member_since: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  customer_id: number;
  order_date: string;
  status: 'pending' | 'delivered' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number | null;
  name: string;
  qty: number;
  unit_price: number;
  created_at: string;
}

export interface DailyMenu {
  id: number;
  menu_date: string;
  menu_item_id: number;
  is_available: boolean;
  menu_items?: MenuItem;
}

export interface MonthlyPayment {
  id?: number;
  customer_id: number;
  year: number;
  month: number;          // 1–12
  is_paid: boolean;
  paid_at: string | null;
  created_at?: string;
}