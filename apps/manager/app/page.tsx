const cards = [
  ['Penjualan hari ini', 'Rp 0', 'Belum ada transaksi'],
  ['Kas / setoran', 'Rp 0', 'Belum ada setoran'],
  ['Stok menipis', '0 item', 'Semua aman'],
  ['Waste hari ini', 'Rp 0', 'Belum ada pencatatan'],
]

export default function ManagerHome() {
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">COFFEE SHOP CONTROL</p>
          <h1>Manager Dashboard</h1>
          <p className="muted">kendalikan operasional toko dari satu tempat.</p>
        </div>
        <span className="role">MANAGER</span>
      </header>

      <section className="grid">
        {cards.map(([label, value, note]) => (
          <article className="card" key={label}>
            <p className="label">{label}</p>
            <strong>{value}</strong>
            <span>{note}</span>
          </article>
        ))}
      </section>

      <section className="panel">
        <div>
          <p className="eyebrow">OPERASIONAL</p>
          <h2>Modul utama</h2>
        </div>
        <div className="modules">
          {['Transaksi', 'Shift', 'Kas & Setoran', 'Inventory', 'Receiving', 'Waste', 'Stock Opname'].map((item) => (
            <button type="button" key={item}>{item}</button>
          ))}
        </div>
      </section>
    </main>
  )
}
