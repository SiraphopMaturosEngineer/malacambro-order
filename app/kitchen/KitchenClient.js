'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

function formatTime(isoString) {
  try {
    return new Date(isoString).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function normalizeOrder(row) {
  return {
    id: row.id,
    tableNumber: Number(row.table_number),
    status: String(row.status ?? 'received'),
    createdAt: row.created_at,
    items: Array.isArray(row.items)
      ? row.items.map((entry) => ({
          name: String(entry?.name ?? ''),
          quantity: Number(entry?.quantity) || 0,
        }))
      : [],
  };
}

export default function KitchenClient() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Initial load
  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('id, table_number, items, status, created_at')
        .neq('status', 'served')
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        setError('โหลดออเดอร์ไม่สำเร็จ');
      } else {
        const rows = Array.isArray(data) ? data : [];
        setOrders(rows.map(normalizeOrder));
      }
      setLoading(false);
    }

    loadOrders();
    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime subscription: new orders appear immediately, status changes
  // made from other kitchen screens stay in sync too.
  useEffect(() => {
    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const incoming = normalizeOrder(payload.new);
          if (incoming.status === 'served') return;

          setOrders((prev) => {
            if (prev.some((o) => o.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updated = normalizeOrder(payload.new);

          setOrders((prev) => {
            if (updated.status === 'served') {
              return prev.filter((o) => o.id !== updated.id);
            }
            return prev.map((o) => (o.id === updated.id ? updated : o));
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function updateStatus(orderId, nextStatus) {
    // Update the screen immediately; the DB write follows.
    if (nextStatus === 'served') {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } else {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', orderId);

    if (updateError) {
      setError('อัปเดตสถานะไม่สำเร็จ กรุณาลองใหม่');
    }
  }

  return (
    <main className="page">
      <header className="header">
        <h1>หน้าจอครัว — หม่าล่าแคมโบร๋</h1>
      </header>

      {error && <p className="error-text">{error}</p>}

      {loading && <p className="muted center-text">กำลังโหลดออเดอร์...</p>}

      {!loading && orders.length === 0 && (
        <p className="empty-text">ยังไม่มีออเดอร์เข้ามา</p>
      )}

      {!loading && orders.length > 0 && (
        <div className="grid">
          {orders.map((order) => (
            <div
              key={order.id}
              className={order.status === 'cooking' ? 'card cooking' : 'card'}
            >
              <div className="card-top">
                <span className="table-number">โต๊ะ {order.tableNumber}</span>
                <span className="time">{formatTime(order.createdAt)}</span>
              </div>

              <ul className="items">
                {order.items.map((item, idx) => (
                  <li key={idx}>
                    <span className="item-name">{item.name}</span>
                    <span className="item-qty">x{item.quantity}</span>
                  </li>
                ))}
              </ul>

              <div className="card-actions">
                <button
                  type="button"
                  className="btn cooking-btn"
                  onClick={() => updateStatus(order.id, 'cooking')}
                  disabled={order.status === 'cooking'}
                >
                  กำลังทำ
                </button>
                <button
                  type="button"
                  className="btn served-btn"
                  onClick={() => updateStatus(order.id, 'served')}
                >
                  เสิร์ฟแล้ว
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #150808;
          color: #f7ece7;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          padding: 1.5rem 2rem 3rem;
        }

        .header {
          margin-bottom: 1.5rem;
        }

        .header h1 {
          margin: 0;
          font-size: 2rem;
          color: #ffffff;
        }

        .muted {
          color: #d99b9b;
        }

        .center-text {
          text-align: center;
        }

        .error-text {
          color: #ff9a9a;
          background: #3a1414;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          font-size: 1.1rem;
          margin-bottom: 1.25rem;
        }

        .empty-text {
          text-align: center;
          color: #d99b9b;
          font-size: 1.8rem;
          margin-top: 4rem;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.25rem;
        }

        .card {
          background: #1f0d0d;
          border: 2px solid #3a1414;
          border-radius: 16px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .card.cooking {
          background: #3a2408;
          border-color: #a9691b;
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }

        .table-number {
          font-size: 2rem;
          font-weight: 700;
          color: #ffffff;
        }

        .time {
          font-size: 1.2rem;
          color: #d99b9b;
        }

        .card.cooking .time {
          color: #e8c48a;
        }

        .items {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .items li {
          display: flex;
          justify-content: space-between;
          font-size: 1.3rem;
        }

        .item-name {
          color: #ffffff;
        }

        .item-qty {
          color: #d99b9b;
          font-weight: 700;
        }

        .card.cooking .item-qty {
          color: #e8c48a;
        }

        .card-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: auto;
        }

        .btn {
          flex: 1;
          padding: 1rem;
          font-size: 1.15rem;
          font-weight: 600;
          border: none;
          border-radius: 12px;
          cursor: pointer;
        }

        .cooking-btn {
          background: #a9691b;
          color: #ffffff;
        }

        .cooking-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .served-btn {
          background: #d9291c;
          color: #ffffff;
        }

        .served-btn:active {
          background: #b81f14;
        }

        .cooking-btn:active:not(:disabled) {
          background: #8a5314;
        }
      `}</style>
    </main>
  );
}
