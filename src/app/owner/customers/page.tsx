import { createServerClient } from '@/lib/supabase/server';
import CustomersClient from './CustomersClient';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const supabase = createServerClient();

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .order('name');

  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('order_date', { ascending: false });

  return <CustomersClient customers={customers ?? []} orders={orders ?? []} />;
}
