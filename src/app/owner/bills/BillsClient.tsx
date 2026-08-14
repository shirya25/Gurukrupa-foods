'use client';
import { useState } from 'react';
import { ownerToggleMonthPaid } from '@/lib/auth/ownerActions';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

interface Customer { id: number; name: string; phone: string | null; address: string | null; }
interface OrderRow { id: number; customer_id: number; order_date: string; order_items: { unit_price: number; qty: number }[]; }
interface PaymentRow { customer_id: number; year: number; month: number; is_paid: boolean; }

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function BillsClient({
  customers, orders, payments: initPayments,
}: {
  customers: Customer[];
  orders: OrderRow[];
  payments: PaymentRow[];
}) {
  const now = new Date();
  const [viewYear, setViewYear]   = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [payments, setPayments]   = useState<PaymentRow[]>(initPayments);
  const [toggling, setToggling]   = useState<number | null>(null); // customer id being toggled

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Total for a customer in selected month
  function monthTotal(cid: number) {
    return orders
      .filter(o => {
        const d = new Date(o.order_date);
        return o.customer_id === cid &&
          d.getFullYear() === viewYear &&
          d.getMonth() + 1 === viewMonth;
      })
      .reduce((s, o) => s + o.order_items.reduce((ss, i) => ss + i.unit_price * i.qty, 0), 0);
  }

  function isPaid(cid: number) {
    return payments.find(p => p.customer_id === cid && p.year === viewYear && p.month === viewMonth)?.is_paid ?? false;
  }

  async function togglePaid(cid: number) {
    setToggling(cid);
    const currently = isPaid(cid);
    const result = await ownerToggleMonthPaid(cid, viewYear, viewMonth, currently);
    if (result.error) { alert(result.error); setToggling(null); return; }
    const newPaid = result.is_paid ?? currently;
    setPayments(prev => {
      const exists = prev.find(p => p.customer_id === cid && p.year === viewYear && p.month === viewMonth);
      if (exists) {
        return prev.map(p => p.customer_id === cid && p.year === viewYear && p.month === viewMonth
          ? { ...p, is_paid: newPaid } : p);
      }
      return [...prev, { customer_id: cid, year: viewYear, month: viewMonth, is_paid: newPaid }];
    });
    setToggling(null);
  }

  // Only show customers who have orders this month
  const activeCustomers = customers.filter(c => monthTotal(c.id) > 0);
  const grand = activeCustomers.reduce((s, c) => s + monthTotal(c.id), 0);
  const grandPaid = activeCustomers
    .filter(c => isPaid(c.id))
    .reduce((s, c) => s + monthTotal(c.id), 0);

  return (
    <>
      {/* Month navigator */}
      <div className="history-header" style={{ top: 43 }}>
        <button className="arrow-btn" onClick={prevMonth}>←</button>
        <h2 className="month-label">{MONTHS[viewMonth - 1]} {viewYear}</h2>
        <button className="arrow-btn" onClick={nextMonth}>→</button>
      </div>

      <div className="bills-list-wrap">
        {activeCustomers.length === 0 && (
          <div className="empty-state">No orders for this month.</div>
        )}
        {activeCustomers.map(u => {
          const total = monthTotal(u.id);
          const paid  = isPaid(u.id);
          const busy  = toggling === u.id;
          return (
            <div className="bill-row" key={u.id}
              style={{ borderLeftColor: paid ? '#4CAF50' : 'var(--yellow)' }}>
              <div className="user-avatar" style={{ width: 40, height: 40, fontSize: '1rem' }}>
                {initials(u.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div className="bill-user-name">{u.name}</div>
                <div className="bill-count">{u.phone}</div>
              </div>
              <div className="bill-amt">₹{total}</div>
              <button
                onClick={() => togglePaid(u.id)}
                disabled={busy}
                style={{
                  border: 'none', borderRadius: 20, padding: '6px 12px',
                  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                  background: paid ? '#E8F5E9' : '#FFEBEE',
                  color: paid ? '#2E7D32' : 'var(--red)',
                  minWidth: 72, opacity: busy ? 0.6 : 1,
                }}>
                {busy ? '…' : paid ? '✓ Paid' : 'Unpaid'}
              </button>
            </div>
          );
        })}
      </div>

      {activeCustomers.length > 0 && (
        <div className="bills-total-bar">
          {MONTHS[viewMonth - 1]} · Total ₹{grand} · Collected ₹{grandPaid} · Pending ₹{grand - grandPaid}
        </div>
      )}
    </>
  );
}