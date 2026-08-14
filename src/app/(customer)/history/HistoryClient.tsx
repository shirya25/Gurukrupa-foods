'use client';
import { useState } from 'react';
import type { Order } from '@/types';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function orderTotal(o: Order) {
  return (o.order_items ?? []).reduce((s, i) => s + i.unit_price * i.qty, 0);
}

export default function HistoryClient({ orders }: { orders: Order[] }) {
  const now = new Date();
  const [viewYear, setViewYear]   = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [sortAsc, setSortAsc]     = useState(false);
  const [open, setOpen]           = useState<Record<number, boolean>>({});

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const filtered = orders
    .filter(o => {
      const d = new Date(o.order_date);
      return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
    })
    .sort((a, b) => sortAsc
      ? new Date(a.order_date).getTime() - new Date(b.order_date).getTime()
      : new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
    );

  return (
    <>
      <div className="history-header">
        <button className="arrow-btn" onClick={prevMonth}>←</button>
        <h2 className="month-label">{MONTHS[viewMonth]} {viewYear}</h2>
        <button className="arrow-btn" onClick={nextMonth}>→</button>
        <button className="sort-btn" onClick={() => setSortAsc(s => !s)}>
          ⇅ {sortAsc ? 'Asc' : 'Desc'}
        </button>
      </div>
      <div className="history-list">
        {filtered.length === 0 && <div className="no-orders">No orders this month.</div>}
        {filtered.map(order => {
          const d     = new Date(order.order_date);
          const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
          const tot   = orderTotal(order);
          const isOpen = open[order.id];
          return (
            <div className="history-item" key={order.id}>
              <div className="history-header-row" onClick={() => setOpen(o => ({ ...o, [order.id]: !o[order.id] }))}>
                <span className="history-date">{label}</span>
                <span className="history-amount">₹{tot}</span>
                <span className={`history-arrow${isOpen ? ' open' : ''}`}>▶</span>
              </div>
              <div className={`history-details${isOpen ? ' open' : ''}`}>
                {(order.order_items ?? []).map(i => (
                  <div className="detail-row" key={i.id}>
                    <span>{i.name} × {i.qty}</span>
                    <span>₹{i.unit_price * i.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
