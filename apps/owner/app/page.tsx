const metrics = [
  ['Omzet', 'Rp 0', 'Hari ini'],
  ['HPP', 'Rp 0', 'Hari ini'],
  ['Gross Profit', 'Rp 0', 'Hari ini'],
  ['Net Profit', 'Rp 0', 'Hari ini'],
]

export default function OwnerHome() {
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">COFFEE SHOP CONTROL</p>
          <h1>Owner Dashboard</h1>
          <p className="muted">lihat kondisi bisnis tanpa harus berada di toko.</p>
        </div>
        <span className="role">OWNER</span>
      </header>

      <section className="grid">
        {metrics.map(([label, value, note]) => (
          <article className="card" key={label}>
            <p className="label">{label}</p>
            <strong>{value}</strong>
            <span>{note}</span>
          </article>
        ))}
      </section>

      <section className="panel">
        <p className="eyebrow">BUSINESS CONTROL</p>
        <h2>Area monitoring</h2>
        <div className="modules">
          {['Profit & Loss', 'Inventory', 'Waste', 'Cash Report', 'Product Performance', 'Manager Activity', 'Audit Log'].map((item) => (
            <button type="button" key={item}>{item}</button>
          ))}
        </div>
      </section>
    </main>
  )
}
