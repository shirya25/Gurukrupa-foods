import { createServerClient } from '@/lib/supabase/server';
import HistoryClient from './HistoryClient';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const supabase = createServerClient();

  // auth_customer_id() in RLS ensures only own orders returned
  const { data } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('order_date', { ascending: false });

  return <HistoryClient orders={data ?? []} />;
}
