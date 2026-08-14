import { createServerClient } from '@/lib/supabase/server';
import BillsClient from './BillsClient';

export const dynamic = 'force-dynamic';

export default async function BillsPage() {
  const supabase = createServerClient();

  const { data: customers } = await supabase
    .from('customers').select('*').order('name');

  // All non-cancelled orders with items
  const { data: orders } = await supabase
    .from('orders')
    .select('id, customer_id, order_date, status, order_items(unit_price, qty)')
    .neq('status', 'cancelled');

  // All monthly payment records
  const { data: payments } = await supabase
    .from('monthly_payments')
    .select('customer_id, year, month, is_paid');

  return (
    <BillsClient
      customers={customers ?? []}
      orders={orders ?? []}
      payments={payments ?? []}
    />
  );
}
