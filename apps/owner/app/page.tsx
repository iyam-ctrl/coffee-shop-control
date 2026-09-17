import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";

const money = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const shortDate = (value: string) => new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });

export default async function OwnerDashboard() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub as string | undefined;
  if (!uid) redirect("/login");

  const { data: memberships } = await supabase.from("business_members").select("business_id,role").eq("user_id", uid).eq("is_active", true);
  const owner = memberships?.find((x) => String(x.role).toUpperCase() === "OWNER");
  if (!owner) redirect("/not-authorized");

  const { data: business } = await supabase.from("businesses").select("name").eq("id", owner.business_id).maybeSingle();
  const { data: stores } = await supabase.from("stores").select("id,name").eq("business_id", owner.business_id).eq("is_active", true).order("name");
  const storeIds = (stores ?? []).map((x) => x.id);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const startTomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
  const start7 = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6).toISOString();
  const startMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  let omzet = 0, hpp = 0, expenses = 0, waste = 0, stockValue = 0;
  let recentSales: { id: string; transaction_no: string; total: number; sold_at: string; store_id: string }[] = [];
  let chartDays: { label: string; total: number }[] = [];
  let topProducts: { name: string; quantity: number; revenue: number }[] = [];

  if (storeIds.length) {
    const [{ data: todaySales }, { data: expenseRows }, { data: stockRows }, { data: wasteRows }, { data: weekSales }] = await Promise.all([
      supabase.from("sales").select("id,transaction_no,total,sold_at,store_id").in("store_id", storeIds).eq("status", "COMPLETED").gte("sold_at", startToday).lt("sold_at", startTomorrow),
      supabase.from("expenses").select("amount").in("store_id", storeIds).gte("spent_at", startToday).lt("spent_at", startTomorrow),
      supabase.from("inventory_balances").select("quantity,ingredient_id").in("store_id", storeIds),
      supabase.from("waste_records").select("quantity,ingredient_id").in("store_id", storeIds).gte("recorded_at", startMonth),
      supabase.from("sales").select("id,total,sold_at").in("store_id", storeIds).eq("status", "COMPLETED").gte("sold_at", start7).lt("sold_at", startTomorrow),
    ]);
    recentSales = (todaySales ?? []).map((x) => ({ ...x, total: Number(x.total ?? 0) })).sort((a, b) => +new Date(b.sold_at) - +new Date(a.sold_at)).slice(0, 6);
    omzet = recentSales.reduce((sum, row) => sum + row.total, 0);
    expenses = (expenseRows ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const saleIds = (todaySales ?? []).map((x) => x.id);
    if (saleIds.length) {
      const { data: saleItems } = await supabase.from("sale_items").select("product_id,quantity,hpp_total,line_total").in("sale_id", saleIds);
      hpp = (saleItems ?? []).reduce((sum, row) => sum + Number(row.hpp_total ?? 0), 0);
      const productIds = Array.from(new Set((saleItems ?? []).map((x) => x.product_id)));
      if (productIds.length) {
        const { data: products } = await supabase.from("products").select("id,name").in("id", productIds);
        const names = new Map((products ?? []).map((p) => [p.id, p.name]));
        const grouped = new Map<string, { name: string; quantity: number; revenue: number }>();
        for (const row of saleItems ?? []) {
          const current = grouped.get(row.product_id) ?? { name: names.get(row.product_id) ?? "produk", quantity: 0, revenue: 0 };
          current.quantity += Number(row.quantity ?? 0);
          current.revenue += Number(row.line_total ?? 0);
          grouped.set(row.product_id, current);
        }
        topProducts = Array.from(grouped.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
      }
    }
    const dayMap = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - i));
      dayMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const row of weekSales ?? []) {
      const key = new Date(row.sold_at).toISOString().slice(0, 10);
      if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + Number(row.total ?? 0));
    }
    chartDays = Array.from(dayMap.entries()).map(([key, total]) => ({ label: new Date(`${key}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }), total }));
    const ingredientIds = Array.from(new Set([...(stockRows ?? []).map((x) => x.ingredient_id), ...(wasteRows ?? []).map((x) => x.ingredient_id)]));
    if (ingredientIds.length) {
      const { data: ingredients } = await supabase.from("ingredients").select("id,current_cost").in("id", ingredientIds);
      const costs = new Map((ingredients ?? []).map((x) => [x.id, Number(x.current_cost ?? 0)]));
      stockValue = (stockRows ?? []).reduce((sum, row) => sum + Number(row.quantity ?? 0) * (costs.get(row.ingredient_id) ?? 0), 0);
      waste = (wasteRows ?? []).reduce((sum, row) => sum + Number(row.quantity ?? 0) * (costs.get(row.ingredient_id) ?? 0), 0);
    }
  }

  const grossProfit = omzet - hpp;
  const netProfit = grossProfit - expenses;
  const maxChart = Math.max(1, ...chartDays.map((x) => x.total));
  const cards = [
    ["omzet hari ini", money(omzet), "semua outlet aktif"],
    ["HPP hari ini", money(hpp), "berdasarkan recipe"],
    ["gross profit", money(grossProfit), "omzet − HPP"],
    ["net profit", money(netProfit), "setelah biaya operasional"],
    ["nilai stok", money(stockValue), "estimasi current cost"],
    ["waste bulan ini", money(waste), "nilai bahan terbuang"],
  ];
  const modules = [
    ["Outlet & Bisnis", "pantau outlet, identitas bisnis dan konfigurasi", "/setup"],
    ["Produk & Menu", "katalog, kategori dan harga jual", "/products"],
    ["Ingredients", "cost bahan dan minimum stock", "/ingredients"],
    ["Recipes", "komposisi, HPP dan margin", "/recipes"],
    ["Inventory", "stok, penerimaan dan pergerakan", "/inventory"],
    ["Stock Opname", "variance dan kontrol stok fisik", "/stock-opname"],
    ["Laporan", "profit, transaksi dan aktivitas bisnis", "/reports"],
  ];

  return <main>
    <section className="page-section" style={{ marginTop: 0 }}>
      <p className="brand-kicker">EXECUTIVE OVERVIEW</p>
      <h2 style={{ fontSize: 26, marginTop: 3 }}>{business?.name ?? "bisnis"}</h2>
      <p className="muted">owner control · {stores?.length ?? 0} outlet aktif · data operasional tersentralisasi</p>
    </section>
    <section className="kpi-grid" style={{ marginTop: 18 }}>{cards.map(([label, value, note]) => <article className="kpi-card" key={label}><span className="kpi-label">{label}</span><strong>{value}</strong><small>{note}</small></article>)}</section>
    <section className="dashboard-grid">
      <article className="data-panel"><div className="panel-head"><h3>penjualan 7 hari terakhir</h3><span>omzet per hari</span></div><div className="chart">{chartDays.map((day) => <div className="bar" key={day.label} style={{ height: `${Math.max(8, (day.total / maxChart) * 100)}%` }} title={money(day.total)}><span>{day.label}</span></div>)}</div></article>
      <article className="data-panel"><div className="panel-head"><h3>produk terjual hari ini</h3><span>berdasarkan qty</span></div><div className="table-list">{topProducts.length ? topProducts.map((p) => <div className="table-row" key={p.name}><b>{p.name}</b><span>{p.quantity} pcs</span><span>{money(p.revenue)}</span></div>) : <p className="muted">belum ada penjualan hari ini.</p>}</div></article>
    </section>
    <section className="data-panel" style={{ marginTop: 14 }}><div className="panel-head"><h3>transaksi terbaru</h3><span>{recentSales.length} transaksi ditampilkan</span></div><div className="table-list">{recentSales.length ? recentSales.map((s) => <div className="table-row" key={s.id}><b>{s.transaction_no}</b><span>{shortDate(s.sold_at)} · {stores?.find((st) => st.id === s.store_id)?.name ?? "outlet"}</span><span>{money(s.total)}</span></div>) : <p className="muted">belum ada transaksi hari ini.</p>}</div></section>
    <section className="page-section"><p className="brand-kicker">BUSINESS CONTROL</p><h2>pusat kendali owner</h2><p className="muted">pantau performa, profit, stok dan laporan dari satu workspace.</p><div className="feature-grid">{modules.map(([title, description, href]) => <a className="feature-card" href={href} key={href}><p className="brand-kicker">CONTROL</p><h3>{title} →</h3><p>{description}</p></a>)}</div></section>
  </main>;
}
