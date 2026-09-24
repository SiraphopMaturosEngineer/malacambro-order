export default function KitchenPage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>หน้าจอครัว</h1>
      <p>หน้านี้เป็นโครงเปล่า รอพัฒนาในขั้นตอนถัดไป</p>
    </main>
  );
}
import KitchenClient from './KitchenClient';

export default function KitchenPage() {
  return <KitchenClient />;
}
