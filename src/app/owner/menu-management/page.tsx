import { createServerClient } from '@/lib/supabase/server';
import MenuMgmtClient from './MenuMgmtClient';

export const dynamic = 'force-dynamic';

export default async function MenuManagementPage() {
  const supabase = createServerClient();
  const today    = new Date().toISOString().slice(0, 10);

  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .order('id');

  // Load today's daily_menus so the client knows what's already toggled
  const { data: dailyMenus } = await supabase
    .from('daily_menus')
    .select('menu_item_id, is_available')
    .eq('menu_date', today);

  return (
    <MenuMgmtClient
      items={items ?? []}
      dailyMenus={dailyMenus ?? []}
      today={today}
    />
  );
}
