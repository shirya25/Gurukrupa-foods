import { createServerClient } from '@/lib/supabase/server';
import type { MenuItem } from '@/types';
import MenuClient from './MenuClient';

export const dynamic = 'force-dynamic';

export default async function MenuPage() {
  const supabase = createServerClient();

  // today in YYYY-MM-DD (server local date)
  const today = new Date().toISOString().slice(0, 10);

  // Fetch items scheduled for today that are marked available
  const { data } = await supabase
    .from('daily_menus')
    .select('is_available, menu_items(*)')
    .eq('menu_date', today)
    .eq('is_available', true);

  // Keep only items that are also globally active
  const items: MenuItem[] = (data ?? [])
    .map((r: any) => r.menu_items as MenuItem)
    .filter((item): item is MenuItem => !!item && item.is_active);

  return <MenuClient items={items} />;
}
