'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../lib/supabaseClient';

const ADULT_PRICE = 229;
const CHILD_PRICE = 129;

const initialForm = {
  tableNumber: '',
  adultCount: '',
  childCount: '',
};

export default function GenerateQrPage() {
  const [form, setForm] = useState(initialForm);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(field) {
    return (e) => {
      const value = e.target.value.replace(/[^0-9]/g, '');
      setForm((prev) => ({ ...prev, [field]: value }));
    };
  }

  function resetForm() {
    setForm(initialForm);
    setSession(null);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const tableNumber = Number(form.tableNumber);
    const adultCount = Number(form.adultCount || 0);
    const childCount = Number(form.childCount || 0);

    if (!tableNumber) {
      setError('กรุณากรอกหมายเลขโต๊ะ');
      return;
    }
    if (adultCount === 0 && childCount === 0) {
      setError('กรุณากรอกจำนวนลูกค้าอย่างน้อย 1 คน');
      return;
    }

    setLoading(true);
    try {
      const { data, error: insertError } = await supabase
        .from('sessions')
        .insert({
          table_number: tableNumber,
          adult_count: adultCount,
          child_count: childCount,
          status: 'open',
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      const orderUrl = `${window.location.origin}/order/${data.id}`;

      setSession({
        tableNumber,
        adultCount,
        childCount,
        url: orderUrl,
      });
    } catch (err) {
      setError('เปิดโต๊ะไม่สำเร็จ: ' + (err.message || 'เกิดข้อผิดพลาด'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="card">
        <h1>เปิดโต๊ะ / สร้าง QR</h1>
        <p className="subtitle">หม่าล่าแคมโบร๋ — ผู้ใหญ่ {ADULT_PRICE} บาท · เด็ก {CHILD_PRICE} บาท</p>

        {!session && (
          <form onSubmit={handleSubmit} className="form">
            <label>
              หมายเลขโต๊ะ
              <input
                type="text"
                inputMode="numeric"
                value={form.tableNumber}
                onChange={handleChange('tableNumber')}
                placeholder="เช่น 5"
              />
            </label>

            <label>
              จำนวนผู้ใหญ่
              <input
                type="text"
                inputMode="numeric"
                value={form.adultCount}
                onChange={handleChange('adultCount')}
                placeholder="0"
              />
            </label>

            <label>
              จำนวนเด็ก
              <input
                type="text"
                inputMode="numeric"
                value={form.childCount}
                onChange={handleChange('childCount')}
                placeholder="0"
              />
            </label>

            {error && <p className="error">{error}</p>}

            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'กำลังเปิดโต๊ะ...' : 'เปิดโต๊ะ / สร้าง QR'}
            </button>
          </form>
        )}

        {session && (
          <div className="result">
            <div className="qr-wrap">
              <QRCodeSVG value={session.url} size={220} level="M" />
            </div>

            <div className="details">
              <p>
                <span>โต๊ะ</span>
                <strong>{session.tableNumber}</strong>
              </p>
              <p>
                <span>ผู้ใหญ่</span>
                <strong>{session.adultCount} คน</strong>
              </p>
              <p>
                <span>เด็ก</span>
                <strong>{session.childCount} คน</strong>
              </p>
            </div>

            <p className="url-text">{session.url}</p>

            <button type="button" className="primary" onClick={resetForm}>
              เปิดโต๊ะใหม่
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #150808;
          padding: 1.5rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .card {
          width: 100%;
          max-width: 420px;
          background: #1f0d0d;
          border: 1px solid #3a1414;
          border-radius: 16px;
          padding: 1.75rem 1.5rem 2rem;
          color: #f7ece7;
        }

        h1 {
          margin: 0 0 0.25rem;
          font-size: 1.6rem;
          color: #ffffff;
        }

        .subtitle {
          margin: 0 0 1.5rem;
          color: #d99b9b;
          font-size: 0.95rem;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
        }

        label {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          font-size: 0.95rem;
          color: #e8c9c9;
        }

        input {
          font-size: 1.4rem;
          padding: 0.75rem 0.9rem;
          border-radius: 10px;
          border: 1px solid #4a1c1c;
          background: #2a1010;
          color: #ffffff;
          outline: none;
        }

        input:focus {
          border-color: #e34848;
        }

        .primary {
          margin-top: 0.5rem;
          padding: 1rem;
          font-size: 1.15rem;
          font-weight: 600;
          border: none;
          border-radius: 12px;
          background: #d9291c;
          color: #ffffff;
          cursor: pointer;
        }

        .primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .primary:active {
          background: #b81f14;
        }

        .error {
          color: #ff9a9a;
          background: #3a1414;
          padding: 0.6rem 0.8rem;
          border-radius: 8px;
          font-size: 0.9rem;
          margin: 0;
        }

        .result {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.2rem;
        }

        .qr-wrap {
          background: #ffffff;
          padding: 1rem;
          border-radius: 12px;
        }

        .details {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .details p {
          display: flex;
          justify-content: space-between;
          margin: 0;
          padding: 0.5rem 0.75rem;
          background: #2a1010;
          border-radius: 8px;
          font-size: 1rem;
        }

        .details span {
          color: #d99b9b;
        }

        .details strong {
          color: #ffffff;
        }

        .url-text {
          width: 100%;
          word-break: break-all;
          text-align: center;
          font-size: 0.85rem;
          color: #d99b9b;
          background: #2a1010;
          padding: 0.6rem 0.75rem;
          border-radius: 8px;
          margin: 0;
        }
      `}</style>
    </main>
  );
}
