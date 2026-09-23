import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>หม่าล่าแคมโบร๋</h1>
      <p>ระบบสั่งอาหารบุฟเฟต์ (ผู้ใหญ่ 229 บาท / เด็ก 129 บาท)</p>
      <nav style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <Link href="/generate-qr">สร้าง QR โต๊ะ</Link>
        <Link href="/kitchen">หน้าจอครัว</Link>
      </nav>
    </main>
  );
}
