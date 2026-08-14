'use server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function assertOwner() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') throw new Error('Forbidden.');
  return supabase;
}

// ── CUSTOMER ──
export async function ownerCreateCustomer(formData: FormData) {
  try {
    await assertOwner();
    const admin   = createAdminClient();
    const name    = (formData.get('name')     as string ?? '').trim();
    const phone   = (formData.get('phone')    as string ?? '').trim();
    const address = (formData.get('address')  as string ?? '').trim();
    const password= (formData.get('password') as string ?? '').trim();
    if (!name || !phone || !password) return { error: 'Name, phone and password required.' };

    // Step 1: Create auth user
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: `${phone}@gurukrupa.local`, password, email_confirm: true,
    });
    if (authErr) return { error: authErr.message };

    // Step 2: Create customer row — rollback auth user on failure
    const { data: customer, error: custErr } = await admin
      .from('customers').insert({ name, phone, address }).select().single();
    if (custErr) {
      await admin.auth.admin.deleteUser(authData.user.id);
      return { error: custErr.message };
    }

    // Step 3: Create profile row — rollback customer + auth user on failure
    const { error: profErr } = await admin.from('user_profiles')
      .insert({ id: authData.user.id, role: 'customer', customer_id: customer.id });
    if (profErr) {
      await admin.from('customers').delete().eq('id', customer.id);
      await admin.auth.admin.deleteUser(authData.user.id);
      return { error: profErr.message };
    }

    return { success: true, customer };
  } catch (e: any) { return { error: e.message }; }
}

export async function ownerDeleteCustomer(customerId: number) {
  try {
    const supabase = await assertOwner();
    const admin    = createAdminClient();

    const { data: profile } = await supabase
      .from('user_profiles').select('id').eq('customer_id', customerId).single();

    const { data: customerOrders } = await supabase
      .from('orders').select('id').eq('customer_id', customerId);
    const orderIds = (customerOrders ?? []).map(o => o.id);

    if (orderIds.length > 0) {
      await supabase.from('order_items').delete().in('order_id', orderIds);
    }
    await supabase.from('orders').delete().eq('customer_id', customerId);
    await supabase.from('monthly_payments').delete().eq('customer_id', customerId);

    const { error } = await supabase.from('customers').delete().eq('id', customerId);
    if (error) return { error: error.message };

    if (profile?.id) {
      await admin.auth.admin.deleteUser(profile.id);
    }

    return { success: true };
  } catch (e: any) { return { error: e.message }; }
}

// ── ORDERS ──
export async function ownerAddOrder(payload: {
  customerId: number; orderDate: string;
  items: { name: string; qty: number; unit_price: number }[];
}) {
  try {
    const supabase = await assertOwner();
    const { data: newOrder, error: oe } = await supabase
      .from('orders')
      .insert({ customer_id: payload.customerId, order_date: payload.orderDate, status: 'pending' })
      .select().single();
    if (oe) return { error: oe.message };
    const { error: ie } = await supabase.from('order_items').insert(
      payload.items.map(r => ({ order_id: newOrder.id, name: r.name, qty: r.qty, unit_price: r.unit_price }))
    );
    if (ie) return { error: ie.message };
    return { success: true, order: newOrder };
  } catch (e: any) { return { error: e.message }; }
}

export async function ownerEditOrder(payload: {
  orderId: number; orderDate: string;
  items: { name: string; qty: number; unit_price: number }[];
}) {
  try {
    const supabase = await assertOwner();
    await supabase.from('order_items').delete().eq('order_id', payload.orderId);
    const { error: oe } = await supabase
      .from('orders').update({ order_date: payload.orderDate }).eq('id', payload.orderId);
    if (oe) return { error: oe.message };
    const { error: ie } = await supabase.from('order_items').insert(
      payload.items.map(r => ({ order_id: payload.orderId, name: r.name, qty: r.qty, unit_price: r.unit_price }))
    );
    if (ie) return { error: ie.message };
    return { success: true };
  } catch (e: any) { return { error: e.message }; }
}

export async function ownerDeleteOrder(orderId: number) {
  try {
    const supabase = await assertOwner();
    const { error } = await supabase.from('orders').delete().eq('id', orderId);
    if (error) return { error: error.message };
    return { success: true };
  } catch (e: any) { return { error: e.message }; }
}

// ── MENU ITEMS ──
export async function ownerSaveMenuItem(payload: {
  id: number | null; name: string; emoji: string; description: string; price: number;
}) {
  try {
    const supabase = await assertOwner();
    const { id, ...fields } = payload;
    if (id) {
      const { data, error } = await supabase
        .from('menu_items').update(fields).eq('id', id).select().single();
      if (error) return { error: error.message };
      return { success: true, item: data };
    } else {
      const { data, error } = await supabase
        .from('menu_items').insert(fields).select().single();
      if (error) return { error: error.message };
      return { success: true, item: data };
    }
  } catch (e: any) { return { error: e.message }; }
}

export async function ownerDeleteMenuItem(id: number) {
  try {
    const supabase = await assertOwner();
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) return { error: error.message };
    return { success: true };
  } catch (e: any) { return { error: e.message }; }
}

export async function ownerToggleMenuItem(id: number, is_active: boolean) {
  try {
    const supabase = await assertOwner();
    const { data, error } = await supabase
      .from('menu_items').update({ is_active }).eq('id', id).select().single();
    if (error) return { error: error.message };
    return { success: true, item: data };
  } catch (e: any) { return { error: e.message }; }
}

// ── DAILY MENU ──
export async function ownerSetDailyAvailability(
  menuItemId: number, date: string, isAvailable: boolean
) {
  try {
    const supabase = await assertOwner();
    const { error } = await supabase
      .from('daily_menus')
      .upsert(
        { menu_date: date, menu_item_id: menuItemId, is_available: isAvailable },
        { onConflict: 'menu_date,menu_item_id' }
      );
    if (error) return { error: error.message };
    return { success: true };
  } catch (e: any) { return { error: e.message }; }
}

// ── MONTHLY PAYMENTS ──
export async function ownerToggleMonthPaid(
  customerId: number, year: number, month: number, currentlyPaid: boolean
) {
  try {
    const supabase = await assertOwner();
    const is_paid  = !currentlyPaid;
    const { error } = await supabase
      .from('monthly_payments')
      .upsert(
        { customer_id: customerId, year, month, is_paid, paid_at: is_paid ? new Date().toISOString() : null },
        { onConflict: 'customer_id,year,month' }
      );
    if (error) return { error: error.message };
    return { success: true, is_paid };
  } catch (e: any) { return { error: e.message }; }
}
