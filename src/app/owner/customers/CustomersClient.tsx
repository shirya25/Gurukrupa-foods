'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ownerCreateCustomer,
  ownerAddOrder,
  ownerEditOrder,
  ownerDeleteOrder,
  ownerDeleteCustomer,
} from '@/lib/auth/ownerActions';

import type { Customer, Order, OrderItem } from '@/types';
interface FullOrder extends Order { order_items: OrderItem[] }
interface ItemRow { name: string; qty: number; unit_price: number }

function orderTotal(o: FullOrder) {
  return o.order_items.reduce((s, i) => s + i.unit_price * i.qty, 0);
}
function userBill(orders: FullOrder[], cid: number) {
  return orders.filter(o => o.customer_id === cid).reduce((s, o) => s + orderTotal(o), 0);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function CustomersClient({
  customers: initCustomers,
  orders: initOrders,
}: { customers: Customer[]; orders: FullOrder[] }) {

  const [customers, setCustomers]   = useState<Customer[]>(initCustomers);
  const [orders, setOrders]         = useState<FullOrder[]>(initOrders);
  const [activeId, setActiveId]     = useState<number | null>(null);
  const [openOrders, setOpenOrders] = useState<Record<number, boolean>>({});
  const [toast, setToast]           = useState('');

  const [showAddUser, setShowAddUser] = useState(false);
  const [userForm, setUserForm]       = useState({ name: '', phone: '', address: '', password: '' });
  const [savingUser, setSavingUser]   = useState(false);
  const [userError, setUserError]     = useState('');

  const [orderModal, setOrderModal]   = useState(false);
  const [editOrderId, setEditOrderId] = useState<number | null>(null);
  const [orderDate, setOrderDate]     = useState('');
  const [itemRows, setItemRows]       = useState<ItemRow[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const router = useRouter();

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2200); }

  const activeCustomer = customers.find(c => c.id === activeId) ?? null;
  const activeOrders   = orders
    .filter(o => o.customer_id === activeId)
    .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());

  function openDetail(cid: number) { setActiveId(cid); setOpenOrders({}); }
  function backToList()            { setActiveId(null); }
  function toggleOrder(oid: number) { setOpenOrders(o => ({ ...o, [oid]: !o[oid] })); }

  async function saveCustomer() {
    setUserError('');
    if (!userForm.name.trim() || !userForm.phone.trim() || !userForm.password.trim()) {
      setUserError('Name, phone and password are required.'); return;
    }
    setSavingUser(true);
    const fd = new FormData();
    fd.append('name', userForm.name); fd.append('phone', userForm.phone);
    fd.append('address', userForm.address); fd.append('password', userForm.password);
    const result = await ownerCreateCustomer(fd);
    setSavingUser(false);
    if (result.error) { setUserError(result.error); return; }
    setCustomers(c => [...c, result.customer]);
    setShowAddUser(false);
    setUserForm({ name: '', phone: '', address: '', password: '' });
    showToast('Customer added ✓');
    router.refresh();
  }

  async function deleteCustomer(cid: number, name: string) {
    if (!confirm(`Delete ${name} and all their data? This cannot be undone.`)) return;
    const result = await ownerDeleteCustomer(cid);
    if (result.error) { alert(result.error); return; }
    setCustomers(c => c.filter(x => x.id !== cid));
    setOrders(o => o.filter(x => x.customer_id !== cid));
    showToast('Customer deleted');
    router.refresh();
  }

  function openAddOrder() {
    setEditOrderId(null);
    setOrderDate(new Date().toISOString().slice(0, 10));
    setItemRows([{ name: '', qty: 1, unit_price: 0 }]);
    setOrderModal(true);
  }
  function openEditOrder(o: FullOrder) {
    setEditOrderId(o.id);
    setOrderDate(o.order_date);
    setItemRows(o.order_items.map(i => ({ name: i.name, qty: i.qty, unit_price: i.unit_price })));
    setOrderModal(true);
  }

  function addRow()    { setItemRows(r => [...r, { name: '', qty: 1, unit_price: 0 }]); }
  function removeRow(idx: number) { setItemRows(r => r.filter((_, i) => i !== idx)); }
  function updateRow(idx: number, field: keyof ItemRow, val: string) {
    setItemRows(r => r.map((row, i) => i === idx
      ? { ...row, [field]: field === 'name' ? val : (parseFloat(val) || 0) } : row));
  }

  async function saveOrder() {
    if (!orderDate) { alert('Pick a date!'); return; }
    const valid = itemRows.filter(r => r.name.trim() && r.qty >= 1 && r.unit_price > 0);
    if (!valid.length) { alert('Fill all item fields correctly.'); return; }
    setSavingOrder(true);

    if (editOrderId) {
      const result = await ownerEditOrder({ orderId: editOrderId, orderDate, items: valid });
      if (result.error) { alert(result.error); setSavingOrder(false); return; }
      setOrders(prev => prev.map(o => o.id === editOrderId
        ? { ...o, order_date: orderDate, order_items: valid.map((r, idx) => ({
            id: idx, order_id: editOrderId, menu_item_id: null,
            name: r.name, qty: r.qty, unit_price: r.unit_price, created_at: '',
          })) } : o));
      showToast('Order updated ✓');
    } else {
      const result = await ownerAddOrder({ customerId: activeId!, orderDate, items: valid });
      if (result.error) { alert(result.error); setSavingOrder(false); return; }
      setOrders(prev => [{
        ...result.order,
        order_items: valid.map((r, idx) => ({
          id: idx, order_id: result.order.id, menu_item_id: null,
          name: r.name, qty: r.qty, unit_price: r.unit_price, created_at: '',
        })),
      }, ...prev]);
      showToast('Order added ✓');
    }
    setSavingOrder(false);
    setOrderModal(false);
  }

  async function deleteOrder(oid: number) {
    if (!confirm('Delete this order?')) return;
    const result = await ownerDeleteOrder(oid);
    if (result.error) { alert(result.error); return; }
    setOrders(prev => prev.filter(o => o.id !== oid));
    showToast('Order deleted');
  }

  return (
    <>
      {/* USER LIST */}
      {activeId === null && (
        <>
          <div className="page-header">
            <h2 className="page-title">Customers</h2>
            <button className="btn-add" onClick={() => { setUserError(''); setShowAddUser(true); }}>+ Add User</button>
          </div>
          <div className="user-list-wrap">
            {customers.length === 0 && <div className="empty-state">No customers yet.</div>}
            {customers.map(u => {
              const bill = userBill(orders, u.id);
              const cnt  = orders.filter(o => o.customer_id === u.id).length;
              return (
                <div className="user-card" key={u.id} onClick={() => openDetail(u.id)}>
                  <div className="user-avatar">{initials(u.name)}</div>
                  <div className="user-info">
                    <div className="user-name">{u.name}</div>
                    <div className="user-phone">{u.phone} · {u.address}</div>
                  </div>
                  <div>
                    <div className="user-bill">₹{bill}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textAlign: 'right' }}>{cnt} orders</div>
                  </div>
                  <button
                    className="btn-del"
                    style={{ marginLeft: 4, padding: '4px 8px' }}
                    onClick={e => { e.stopPropagation(); deleteCustomer(u.id, u.name); }}>
                    🗑
                  </button>
                  <span className="user-arrow">›</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* USER DETAIL */}
      {activeId !== null && activeCustomer && (
        <>
          <div className="detail-topbar">
            <button className="back-btn" onClick={backToList}>← Back</button>
            <span className="detail-name">{activeCustomer.name}</span>
            <button className="btn-add" onClick={openAddOrder}>+ Order</button>
          </div>
          <div className="detail-meta">
            📞 {activeCustomer.phone}&nbsp;&nbsp;|&nbsp;&nbsp;📍 {activeCustomer.address}
          </div>
          <div className="order-list-wrap">
            {activeOrders.length === 0 && <div className="empty-state">No orders yet.</div>}
            {activeOrders.map(o => {
              const tot    = orderTotal(o);
              const isOpen = openOrders[o.id];
              return (
                <div className="order-card" key={o.id}>
                  <div className="order-header-row">
                    <span className="order-date" onClick={() => toggleOrder(o.id)}>{fmtDate(o.order_date)}</span>
                    <span className="order-total">₹{tot}</span>
                    <div className="order-actions">
                      <button className="btn-edit" onClick={() => openEditOrder(o)}>✏ Edit</button>
                      <button className="btn-del"  onClick={() => deleteOrder(o.id)}>🗑</button>
                    </div>
                    <span className={`order-arrow${isOpen ? ' open' : ''}`} onClick={() => toggleOrder(o.id)}>▶</span>
                  </div>
                  <div className={`order-details${isOpen ? ' open' : ''}`}>
                    {o.order_items.map(i => (
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
      )}

      {/* ADD CUSTOMER MODAL */}
      {showAddUser && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowAddUser(false); }}>
          <div className="modal">
            <h3>Add Customer</h3>
            {userError && (
              <div style={{ background: '#FFEBEE', color: 'var(--red)', borderRadius: 8, padding: '8px 12px', fontSize: '0.85rem', fontWeight: 600 }}>
                {userError}
              </div>
            )}
            <label>Name</label>
            <input className="modal-input" placeholder="Ramesh Patel"
              value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} />
            <label>Phone</label>
            <input className="modal-input" type="tel" placeholder="9876543210"
              value={userForm.phone} onChange={e => setUserForm(f => ({ ...f, phone: e.target.value }))} />
            <label>Address</label>
            <input className="modal-input" placeholder="Flat 12, Shivaji Nagar"
              value={userForm.address} onChange={e => setUserForm(f => ({ ...f, address: e.target.value }))} />
            <label>Password</label>
            <input className="modal-input" type="password" placeholder="Set login password"
              value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} />
            <div className="modal-btns">
              <button className="btn-cancel" onClick={() => setShowAddUser(false)}>Cancel</button>
              <button className="btn-save" onClick={saveCustomer} disabled={savingUser}>
                {savingUser ? 'Creating…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER MODAL */}
      {orderModal && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setOrderModal(false); }}>
          <div className="modal" style={{ maxHeight: '88vh', overflowY: 'auto' }}>
            <h3>{editOrderId ? 'Edit Order' : 'Add Order'}</h3>
            <label>Date</label>
            <input className="modal-input" type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
            <label>Items</label>
            <div className="order-item-labels">
              <span>Item Name</span><span>Qty</span><span>Price ₹</span><span></span>
            </div>
            {itemRows.map((row, idx) => (
              <div className="order-item-row" key={idx}>
                <input className="modal-input-sm item-name-inp" placeholder="Dal Fry"
                  value={row.name} onChange={e => updateRow(idx, 'name', e.target.value)} />
                <input className="modal-input-sm qty-inp" type="number" placeholder="1" min={1}
                  value={row.qty} onChange={e => updateRow(idx, 'qty', e.target.value)} />
                <input className="modal-input-sm price-inp" type="number" placeholder="60" min={0}
                  value={row.unit_price || ''} onChange={e => updateRow(idx, 'unit_price', e.target.value)} />
                <button className="rm-item-btn" onClick={() => removeRow(idx)}>×</button>
              </div>
            ))}
            <button className="btn-additem" onClick={addRow}>+ Add Item</button>
            <div className="modal-btns">
              <button className="btn-cancel" onClick={() => setOrderModal(false)}>Cancel</button>
              <button className="btn-save" onClick={saveOrder} disabled={savingOrder}>
                {savingOrder ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast show">{toast}</div>}
    </>
  );
}