'use server';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

function phoneToEmail(phone: string) {
  return `${phone.trim()}@gurukrupa.local`;
}

export async function login(formData: FormData) {
  const supabase = createServerClient();
  const phone    = (formData.get('phone') as string ?? '').trim();
  const password = (formData.get('password') as string ?? '').trim();

  if (!phone || !password) return { error: 'Enter phone number and password.' };

  const { error } = await supabase.auth.signInWithPassword({
    email: phoneToEmail(phone), password
  });
  if (error) return { error: 'Invalid phone number or password.' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Login failed.' };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  redirect(profile?.role === 'owner' ? '/owner/customers' : '/menu');
}

export async function logout() {
  const supabase = createServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function createCustomer(formData: FormData) {
  const name = (formData.get('name') as string ?? '').trim();
  const phone = (formData.get('phone') as string ?? '').trim();
  const address = (formData.get('address') as string ?? '').trim();
  const password = (formData.get('password') as string ?? '').trim();

  if (!name || !phone || !password) {
    return { error: 'Name, phone and password are required.' };
  }

  const admin = createAdminClient();

  // 1. Create Supabase Auth user
  const { data: authData, error: authErr } =
    await admin.auth.admin.createUser({
      email: phoneToEmail(phone),
      password,
      email_confirm: true,
    });

  if (authErr) {
    return { error: authErr.message };
  }

  // 2. Create customer record
  const { data: customer, error: custErr } = await admin
    .from('customers')
    .insert({
      name,
      phone,
      address,
    })
    .select()
    .single();

  if (custErr) {
    // Roll back Auth user if customer creation fails
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: custErr.message };
  }

  // 3. Link Auth user → customer
  const { error: profErr } = await admin
    .from('user_profiles')
    .insert({
      id: authData.user.id,
      role: 'customer',
      customer_id: customer.id,
    });

  if (profErr) {
    // Roll back both records if profile creation fails
    await admin.from('customers').delete().eq('id', customer.id);
    await admin.auth.admin.deleteUser(authData.user.id);

    return { error: profErr.message };
  }

  return { success: true, customer };
}