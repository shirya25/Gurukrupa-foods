'use client';
import type { MenuItem } from '@/types';

export default function MenuClient({ items }: { items: MenuItem[] }) {
  return (
    <>
      <h2 className="page-title">Today&apos;s Menu</h2>
      <div className="menu-list">
        {items.length === 0 && <div className="no-orders">No items on the menu today.</div>}
        {items.map(item => (
          <div className="menu-item" key={item.id}>
            <span className="item-emoji">{item.emoji}</span>
            <div className="item-info">
              <div className="item-name">{item.name}</div>
              <div className="item-desc">{item.description}</div>
            </div>
            <span className="item-price">₹{item.price}</span>
          </div>
        ))}
      </div>
    </>
  );
}
