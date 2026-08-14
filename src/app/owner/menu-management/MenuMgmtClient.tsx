'use client';
import { useState } from 'react';
import {
  ownerSaveMenuItem,
  ownerDeleteMenuItem,
  ownerToggleMenuItem,
  ownerSetDailyAvailability,
} from '@/lib/auth/ownerActions';
import type { MenuItem } from '@/types';

type FormState = { name: string; emoji: string; description: string; price: string };
const EMPTY: FormState = { name: '', emoji: '', description: '', price: '' };

interface DailyRow { menu_item_id: number; is_available: boolean }

export default function MenuMgmtClient({
  items: init,
  dailyMenus: initDaily,
  today,
}: {
  items: MenuItem[];
  dailyMenus: DailyRow[];
  today: string;
}) {
  const [items, setItems]   = useState<MenuItem[]>(init);
  const [modal, setModal]   = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm]     = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState('');

  // daily availability map: menuItemId → is_available (undefined = no record = unavailable)
  const [dailyMap, setDailyMap] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(initDaily.map(r => [r.menu_item_id, r.is_available]))
  );
  const [togglingDaily, setTogglingDaily] = useState<number | null>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2400); }
  function field(k: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  }

  function openAdd()  { setEditId(null); setForm(EMPTY); setModal(true); }
  function openEdit(m: MenuItem) {
    setEditId(m.id);
    setForm({ name: m.name, emoji: m.emoji, description: m.description ?? '', price: String(m.price) });
    setModal(true);
  }

  async function save() {
    const price = parseFloat(form.price);
    if (!form.name.trim() || isNaN(price) || price <= 0) { alert('Enter name and valid price.'); return; }
    setSaving(true);
    const result = await ownerSaveMenuItem({
      id: editId, name: form.name, emoji: form.emoji || '🍽',
      description: form.description, price,
    });
    setSaving(false);
    if (result.error) { alert(result.error); return; }
    if (editId) { setItems(i => i.map(x => x.id === editId ? result.item : x)); showToast('Item updated ✓'); }
    else        { setItems(i => [...i, result.item]); showToast('Item added ✓'); }
    setModal(false);
  }

  async function remove(id: number) {
    if (!confirm('Remove this item?')) return;
    const result = await ownerDeleteMenuItem(id);
    if (result.error) { alert(result.error); return; }
    setItems(i => i.filter(x => x.id !== id));
    showToast('Item removed');
  }

  async function toggleActive(m: MenuItem) {
    const result = await ownerToggleMenuItem(m.id, !m.is_active);
    if (result.error) { alert(result.error); return; }
    setItems(i => i.map(x => x.id === m.id ? result.item : x));
  }

  async function toggleDaily(m: MenuItem) {
    const current = dailyMap[m.id] ?? false;
    const next    = !current;
    setTogglingDaily(m.id);
    const result  = await ownerSetDailyAvailability(m.id, today, next);
    setTogglingDaily(null);
    if (result.error) { alert(result.error); return; }
    setDailyMap(prev => ({ ...prev, [m.id]: next }));
  }

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Menu Items</h2>
        <button className="btn-add" onClick={openAdd}>+ Item</button>
      </div>

      {/* Today's date label */}
      <div className="menu-date">
        Today ({today}) — toggle 📅 to set daily availability
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.length === 0 && <div className="no-orders">No items. Add some!</div>}
        {items.map(m => {
          const availableToday = dailyMap[m.id] ?? false;
          const busyDaily      = togglingDaily === m.id;
          return (
            <div className="owner-menu-item" key={m.id} style={{ opacity: m.is_active ? 1 : 0.5 }}>
              <span className="menu-emoji">{m.emoji}</span>
              <div className="menu-info" style={{ flex: 1 }}>
                <div className="menu-name">{m.name}</div>
                <div className="menu-desc-txt">{m.description}</div>
              </div>
              <span className="menu-price">₹{m.price}</span>
              <div className="menu-item-actions">
                {/* Daily availability toggle */}
                <button
                  className="btn-edit"
                  title={availableToday ? 'Remove from today' : 'Add to today'}
                  disabled={busyDaily}
                  onClick={() => toggleDaily(m)}
                  style={{
                    background: availableToday ? '#E8F5E9' : '#FFF8E1',
                    color:      availableToday ? '#2E7D32' : 'var(--muted)',
                    opacity:    busyDaily ? 0.5 : 1,
                    minWidth:   34,
                  }}>
                  {busyDaily ? '…' : availableToday ? '📅✓' : '📅'}
                </button>
                {/* Global active toggle */}
                <button className="btn-edit" onClick={() => toggleActive(m)} title={m.is_active ? 'Deactivate' : 'Activate'}>
                  {m.is_active ? '👁' : '🚫'}
                </button>
                <button className="btn-edit" onClick={() => openEdit(m)}>✏</button>
                <button className="btn-del"  onClick={() => remove(m.id)}>🗑</button>
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="modal">
            <h3>{editId ? 'Edit' : 'Add'} Menu Item</h3>
            <label>Name</label>
            <input className="modal-input" placeholder="Dal Fry" value={form.name} onChange={field('name')} />
            <label>Emoji</label>
            <input className="modal-input" placeholder="🍲" maxLength={2} value={form.emoji} onChange={field('emoji')} />
            <label>Description</label>
            <input className="modal-input" placeholder="Tadka dal…" value={form.description} onChange={field('description')} />
            <label>Price (₹)</label>
            <input className="modal-input" type="number" placeholder="60" value={form.price} onChange={field('price')} />
            <div className="modal-btns">
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-save" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast show">{toast}</div>}
    </>
  );
}
