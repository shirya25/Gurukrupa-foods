import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = createServerClient();

  // Get logged-in user → profile → customer row
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <p className="no-orders">Not logged in.</p>;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('customer_id')
    .eq('id', user.id)
    .single();

  const cid = profile?.customer_id;

  const { data: customer } = cid
    ? await supabase.from('customers').select('*').eq('id', cid).single()
    : { data: null };

  const { data: orderRows } = await supabase
    .from('orders')
    .select('id, order_items(unit_price, qty)');

  const orderCount = orderRows?.length ?? 0;
  const totalSpent = (orderRows ?? []).reduce((s: number, o: any) =>
    s + (o.order_items ?? []).reduce((ss: number, i: any) => ss + i.unit_price * i.qty, 0), 0
  );

  const name    = customer?.name        ?? user.email ?? 'Guest';
  const phone   = customer?.phone       ?? '—';
  const address = customer?.address     ?? '—';
  const since   = customer?.member_since
    ? new Date(customer.member_since).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '—';

  return (
    <>
      <h2 className="page-title">My Profile</h2>
      <div className="profile-card">
        <div className="avatar">👤</div>
        <div className="profile-info">
          <div className="profile-row"><span>Name</span><span>{name}</span></div>
          <div className="profile-row"><span>Phone</span><span>{phone}</span></div>
          <div className="profile-row"><span>Address</span><span>{address}</span></div>
          <div className="profile-row"><span>Member Since</span><span>{since}</span></div>
        </div>
      </div>
      <div className="profile-stats">
        <div className="stat-box">
          <span className="stat-num">{orderCount}</span>
          <span className="stat-lbl">Orders</span>
        </div>
        <div className="stat-box">
          <span className="stat-num">₹{totalSpent}</span>
          <span className="stat-lbl">Total Spent</span>
        </div>
      </div>
    </>
  );
}
