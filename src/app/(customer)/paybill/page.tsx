import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export default async function PayBillPage() {
  const supabase = createServerClient();

  // RLS: orders:own rows scopes to this customer only; exclude cancelled
  const { data: orders } = await supabase
    .from('orders')
    .select('order_date, order_items(unit_price, qty)')
    .neq('status', 'cancelled');

  // RLS: monthly_payments:own read scopes to this customer only
  const { data: payments } = await supabase
    .from('monthly_payments')
    .select('year, month, is_paid');

  // ── Group orders by YYYY-MM ─────────────────────────────────────────────
  const monthMap = new Map<string, number>();
  for (const o of orders ?? []) {
    const d   = new Date(o.order_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const tot = (o.order_items ?? []).reduce(
      (s: number, i: any) => s + i.unit_price * i.qty, 0,
    );
    monthMap.set(key, (monthMap.get(key) ?? 0) + tot);
  }

  // ── Build paid-status lookup from monthly_payments ─────────────────────
  // No record in monthly_payments → treated as Unpaid
  const paidMap = new Map<string, boolean>();
  for (const p of payments ?? []) {
    paidMap.set(`${p.year}-${String(p.month).padStart(2, '0')}`, p.is_paid);
  }

  // ── Merge and sort most-recent-first ───────────────────────────────────
  const months = Array.from(monthMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, total]) => {
      const [year, mo] = key.split('-').map(Number);
      const isPaid     = paidMap.get(key) ?? false;
      return { key, label: `${MONTHS[mo - 1]} ${year}`, total, isPaid };
    });

  // Outstanding = unpaid months only
  const outstanding = months
    .filter(m => !m.isPaid)
    .reduce((s, m) => s + m.total, 0);

  return (
    <>
      <h2 className="page-title">Pay Bill</h2>

      <div className="bill-months-list">
        {months.length === 0 && (
          <div className="no-orders">No orders yet.</div>
        )}
        {months.map(m => (
          <div className="bill-month-row" key={m.key}
            style={{ borderLeftColor: m.isPaid ? '#4CAF50' : 'var(--red)' }}>
            <span className="bill-month-label">{m.label}</span>
            <span className="bill-month-amount">₹{m.total}</span>
            <span className={m.isPaid ? 'badge-paid' : 'badge-unpaid'}>
              {m.isPaid ? '✓ Paid' : 'Unpaid'}
            </span>
          </div>
        ))}
      </div>

      {months.length > 0 && (
        <div className="bill-card" style={{ margin: '0 16px 16px' }}>
          <p className="bill-label">Total Outstanding</p>
          <p className="bill-amount">₹{outstanding}</p>
        </div>
      )}

      <div className="qr-box">
        <p className="qr-label">Scan &amp; Pay via GPay / PhonePe / UPI</p>
        <div className="qr-img-wrap">
          <img src="/qr.png" alt="Payment QR Code" width={160} height={160}
            style={{ display: 'block', borderRadius: 4 }} />
        </div>
        <p className="upi-id">UPI: deeptigodbole365@okaxis</p>
      </div>
    </>
  );
}