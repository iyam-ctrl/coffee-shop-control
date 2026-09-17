"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const items = [
  ["/", "Dashboard"],
  ["/inventory", "Inventory"],
  ["/ingredients", "Bahan Baku"],
  ["/recipes", "Resep & HPP"],
  ["/shift", "Shift Operasional"],
  ["/cash", "Kas & Setoran"],
  ["/expenses", "Pengeluaran"],
  ["/stock-opname", "Stock Opname"],
  ["/reports", "Laporan"],
];

export default function ManagerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="manager-shell">
      <button className="manager-menu" onClick={() => setOpen(v => !v)} aria-label="Buka menu">☰</button>
      <aside className={open ? "manager-sidebar open" : "manager-sidebar"}>
        <div className="brand"><span className="brand-mark">CS</span><div><b>COFFEE SHOP</b><small>CONTROL · MANAGER</small></div></div>
        <nav>
          {items.map(([href, label]) => <a key={href} className={pathname === href ? "active" : ""} href={href}>{label}</a>)}
        </nav>
        <div className="sidebar-bottom">
          <a href="/settings">⚙ Pengaturan</a>
          <a href="/logout">↪ Keluar</a>
        </div>
      </aside>
      {open && <button className="manager-overlay" aria-label="Tutup menu" onClick={() => setOpen(false)} />}
      <section className="manager-content">{children}</section>
    </div>
  );
}
