'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function OrderPage({ params }) {
  const { sessionId } = use(params);

  const [sessionInfo, setSessionInfo] = useState(null);
  const [sessionError, setSessionError] = useState('');
  const [loadingSession, setLoadingSession] = useState(true);

  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [menuError, setMenuError] = useState('');

  const [cart, setCart] = useState({}); // { itemId: { name, quantity } }
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');

  // Load session info
  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      setLoadingSession(true);
      setSessionError('');

      const { data, error } = await supabase
        .from('sessions')
        .select('id, table_number, adult_count, child_count, status')
        .eq('id', sessionId)
        .single();

      if (cancelled) return;

      if (error || !data || data.status !== 'open') {
        setSessionError('โต๊ะนี้ปิดแล้วหรือไม่พบข้อมูล');
        setSessionInfo(null);
      } else {
        setSessionInfo(data);
      }
      setLoadingSession(false);
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Load menu (categories + items) once session is confirmed valid
  useEffect(() => {
    if (!sessionInfo) return;

    let cancelled = false;

    async function loadMenu() {
      setMenuError('');

      const { data: categoryRows, error: categoryError } = await supabase
        .from('menu_categories')
        .select('id, name, sort_order')
        .order('sort_order', { ascending: true });

      if (categoryError) {
        if (!cancelled) setMenuError('โหลดเมนูไม่สำเร็จ');
        return;
      }

      const { data: itemRows, error: itemError } = await supabase
        .from('menu_items')
        .select('id, category_id, name');

      if (itemError) {
        if (!cancelled) setMenuError('โหลดเมนูไม่สำเร็จ');
        return;
      }

      if (cancelled) return;

      const grouped = (categoryRows || []).map((category) => ({
        ...category,
        items: (itemRows || []).filter((item) => item.category_id === category.id),
      }));

      setCategories(grouped);
      if (grouped.length > 0) {
        setActiveCategoryId(grouped[0].id);
      }
    }

    loadMenu();
    return () => {
      cancelled = true;
    };
  }, [sessionInfo]);

  function changeQuantity(item, delta) {
    setCart((prev) => {
      const current = prev[item.id]?.quantity || 0;
      const nextQuantity = Math.max(0, current + delta);

      if (nextQuantity === 0) {
        const { [item.id]: _removed, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [item.id]: { name: item.name, quantity: nextQuantity },
      };
    });
  }

  const cartEntries = Object.entries(cart);
  const totalItemCount = cartEntries.reduce((sum, [, v]) => sum + v.quantity, 0);

  async function handleSubmitOrder() {
    if (totalItemCount === 0 || !sessionInfo) return;

    setSubmitting(true);
    setSubmitError('');

    const items = cartEntries.map(([, v]) => ({ name: v.name, quantity: v.quantity }));

    try {
      const { error } = await supabase.from('orders').insert({
        session_id: sessionInfo.id,
        table_number: sessionInfo.table_number,
        items,
        status: 'received',
      });

      if (error) throw error;

      setCart({});
      setConfirmMessage('ส่งออเดอร์แล้ว ครัวกำลังเตรียมอาหาร');
      setTimeout(() => setConfirmMessage(''), 4000);
    } catch (err) {
      setSubmitError('ส่งออเดอร์ไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  }

  const activeCategory = categories.find((c) => c.id === activeCategoryId);
  const showMenu = !loadingSession && !sessionError;

  return (
    <main className={showMenu ? 'page' : 'page center'}>
      {loadingSession && <p className="muted">กำลังโหลดข้อมูลโต๊ะ...</p>}

      {!loadingSession && sessionError && <p className="error-text">{sessionError}</p>}

      {showMenu && (
        <>
          <header className="header">
            <h1>หม่าล่าแคมโบร๋</h1>
            <p className="table-line">
              โต๊ะ {sessionInfo.table_number} · ผู้ใหญ่ {sessionInfo.adult_count} คน · เด็ก{' '}
              {sessionInfo.child_count} คน
            </p>
          </header>

          {menuError && <p className="error-text center-text">{menuError}</p>}

          {categories.length > 0 && (
            <nav className="tabs">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={category.id === activeCategoryId ? 'tab active' : 'tab'}
                  onClick={() => setActiveCategoryId(category.id)}
                  type="button"
                >
                  {category.name}
                </button>
              ))}
            </nav>
          )}

          <section className="menu-list">
            {activeCategory?.items.map((item) => {
              const quantity = cart[item.id]?.quantity || 0;
              return (
                <div key={item.id} className="menu-item">
                  <span className="item-name">{item.name}</span>
                  <div className="stepper">
                    <button
                      type="button"
                      className="step-btn"
                      onClick={() => changeQuantity(item, -1)}
                      disabled={quantity === 0}
                    >
                      −
                    </button>
                    <span className="qty">{quantity}</span>
                    <button
                      type="button"
                      className="step-btn"
                      onClick={() => changeQuantity(item, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
            {activeCategory && activeCategory.items.length === 0 && (
              <p className="muted center-text">ยังไม่มีเมนูในหมวดนี้</p>
            )}
          </section>

          {/* spacer so content isn't hidden behind the sticky cart bar */}
          <div className="bottom-spacer" />

          {confirmMessage && <div className="toast">{confirmMessage}</div>}

          <div className="cart-bar">
            {submitError && <p className="error-text small">{submitError}</p>}
            <div className="cart-row">
              <span className="cart-count">{totalItemCount} รายการ</span>
              <button
                type="button"
                className="primary"
                onClick={handleSubmitOrder}
                disabled={totalItemCount === 0 || submitting}
              >
                {submitting ? 'กำลังส่ง...' : 'ส่งออเดอร์เข้าครัว'}
              </button>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
  .page {
    min-height: 100vh;
    background: #150808;
    color: #f7ece7;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    padding-bottom: 1rem;
  }

  .page.center {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 2rem 1.5rem;
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
    font-size: 1rem;
  }

  .error-text.small {
    font-size: 0.85rem;
    padding: 0.5rem 0.75rem;
    margin: 0 1rem 0.5rem;
  }

  .header {
    padding: 1.5rem 1.25rem 1rem;
    border-bottom: 1px solid #3a1414;
  }

  .header h1 {
    margin: 0 0 0.35rem;
    font-size: 1.4rem;
    color: #ffffff;
  }

  .table-line {
    margin: 0;
    color: #d99b9b;
    font-size: 0.95rem;
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding: 1rem 1.25rem 0.5rem;
    -webkit-overflow-scrolling: touch;
  }

  .tab {
    flex: 0 0 auto;
    padding: 0.6rem 1rem;
    border-radius: 999px;
    border: 1px solid #4a1c1c;
    background: #1f0d0d;
    color: #e8c9c9;
    font-size: 0.95rem;
    white-space: nowrap;
    cursor: pointer;
  }

  .tab.active {
    background: #d9291c;
    border-color: #d9291c;
    color: #ffffff;
    font-weight: 600;
  }

  .menu-list {
    padding: 0.5rem 1.25rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #1f0d0d;
    border: 1px solid #3a1414;
    border-radius: 12px;
    padding: 0.85rem 1rem;
  }

  .item-name {
    font-size: 1.05rem;
    color: #ffffff;
    padding-right: 0.75rem;
  }

  .stepper {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .step-btn {
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 10px;
    border: none;
    background: #d9291c;
    color: #ffffff;
    font-size: 1.4rem;
    line-height: 1;
    cursor: pointer;
  }

  .step-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .qty {
    min-width: 1.5rem;
    text-align: center;
    font-size: 1.15rem;
    font-weight: 600;
  }

  .bottom-spacer {
    height: 6rem;
  }

  .toast {
    position: fixed;
    left: 50%;
    bottom: 6.5rem;
    transform: translateX(-50%);
    background: #2a1010;
    border: 1px solid #4a1c1c;
    color: #ffffff;
    padding: 0.75rem 1.25rem;
    border-radius: 10px;
    font-size: 0.95rem;
    text-align: center;
    max-width: 90%;
    z-index: 20;
  }

  .cart-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    background: #1f0d0d;
    border-top: 1px solid #3a1414;
    padding: 0.75rem 1.25rem 1rem;
    z-index: 10;
  }

  .cart-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .cart-count {
    color: #d99b9b;
    font-size: 0.95rem;
    flex-shrink: 0;
  }

  .primary {
    flex: 1;
    padding: 1rem;
    font-size: 1.1rem;
    font-weight: 600;
    border: none;
    border-radius: 12px;
    background: #d9291c;
    color: #ffffff;
    cursor: pointer;
  }

  .primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .primary:active:not(:disabled) {
    background: #b81f14;
  }
      `}</style>
    </main>
  );
}
