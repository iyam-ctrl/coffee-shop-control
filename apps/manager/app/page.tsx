import { redirect } from "next/navigation";
import { createClient } from "./lib/supabase/server";

const money = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default async function ManagerDashboard() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub as string | undefined;
  if (!userId) redirect("/login");

  const { data: memberships } = await supabase.from("business_members").select("business_id,role").eq("user_id", userId).eq("is_active", true);
  const membership = memberships?.find((item) => ["MANAGER", "STAFF"].includes(String(item.role).toUpperCase()));
  if (!membership) {
    if (memberships?.some((item) => String(item.role).toUpperCase() === "OWNER")) redirect("/not-authorized");
    redirect("/setup");
  }

  const { data: business } = await supabase.from("businesses").select("name").eq("id", membership.business_id).maybeSingle();
  const { data: stores } = await supabase.from("stores").select("id,name").eq("business_id", membership.business_id).eq("is_active", true).order("name");
  const storeIds = (stores ?? []).map((store) => store.id);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  let salesToday = 0, cashToday = 0, depositsToday = 0, activeShiftCount = 0;
  if (storeIds.length) {
    const { data: sales } = await supabase.from("sales").select("id,total").in("store_id", storeIds).eq("status", "COMPLETED").gte("sold_at", start).lt("sold_at", end);
    salesToday = (sales ?? []).reduce((sum, row) => sum + Number(row.total ?? 0), 0);
    const saleIds = (sales ?? []).map((row) => row.id);
    if (saleIds.length) {
      const { data: payments } = await supabase.from("payments").select("amount,method").in("sale_id", saleIds);
      cashToday = (payments ?? []).filter((row) => String(row.method).toUpperCase() === "CASH").reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    }
    const { data: deposits } = await supabase.from("cash_deposits").select("amount").in("store_id", storeIds).gte("deposited_at", start).lt("deposited_at", end);
    depositsToday = (deposits ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const { count } = await supabase.from("shifts").select("id", { count: "exact", head: true }).in("store_id", storeIds).eq("status", "OPEN");
    activeShiftCount = count ?? 0;
  }

  const { data: ingredients } = await supabase.from("ingredients").select("id,minimum_stock").eq("business_id", membership.business_id).eq("is_active", true);
  let lowStock = 0;
  if ((ingredients ?? []).length && storeIds.length) {
    const ids = (ingredients ?? []).map((item) => item.id);
    const { data: balances } = await supabase.from("inventory_balances").select("ingredient_id,quantity").in("ingredient_id", ids).in("store_id", storeIds);
    const qty = new Map<string, number>();
    for (const row of balances ?? []) qty.set(row.ingredient_id, (qty.get(row.ingredient_id) ?? 0) + Number(row.quantity ?? 0));
    lowStock = ids.filter((id) => (qty.get(id) ?? 0) <= Number((ingredients ?? []).find((item) => item.id === id)?.minimum_stock ?? 0)).length;
  }

  const cards = [
    ["penjualan hari ini", money(salesToday), "ringkasan transaksi outlet"],
    ["cash hari ini", money(cashToday), "pembayaran metode cash"],
    ["setoran hari ini", money(depositsToday), "cash yang sudah disetor"],
    ["cash belum disetor", money(Math.max(0, cashToday - depositsToday)), "indikator rekonsiliasi"],
    ["stok kritis", `${lowStock} item`, "menyentuh batas minimum"],
    ["shift aktif", `${activeShiftCount} shift`, `${stores?.length ?? 0} outlet aktif`],
  ];
  const modules = [
    ["Outlet", "kontrol outlet, status dan informasi toko", "/outlet"],
    ["Inventory", "stok bahan, penerimaan dan pergerakan", "/inventory"],
    ["Ingredients", "bahan, unit, current cost dan minimum stock", "/ingredients"],
    ["Recipes", "komposisi menu, HPP dan margin", "/recipes"],
    ["Stock Opname", "hitung fisik dan kendali variance", "/stock-opname"],
    ["Shift", "buka, pantau dan tutup shift", "/shift"],
    ["Kas & Setoran", "rekonsiliasi cash dan setoran outlet", "/cash"],
    ["Laporan", "monitoring transaksi dan performa", "/reports"],
  ];

  return <main>
    <section className="page-section" style={{ marginTop: 0 }}>
      <p className="brand-kicker">OVERVIEW OPERASIONAL</p>
      <h2 style={{ fontSize: 25, marginTop: 3 }}>{business?.name ?? "bisnis"}</h2>
      <p className="muted">kendali harian untuk {stores?.length ?? 0} outlet aktif · tanpa fungsi kasir/POS di manager</p>
    </section>
    <section className="kpi-grid" style={{ marginTop: 18 }}>{cards.map(([label, value, note]) => <article className="kpi-card" key={label}><span className="kpi-label">{label}</span><strong>{value}</strong><small>{note}</small></article>)}</section>
    <section className="page-section">
      <p className="brand-kicker">CONTROL CENTER</p><h2>modul operasional</h2><p className="muted">pilih area yang mau lu kontrol tanpa mencampur alur kasir.</p>
      <div className="feature-grid">{modules.map(([title, description, href]) => <a className="feature-card" href={href} key={href}><p className="brand-kicker">MODULE</p><h3>{title} →</h3><p>{description}</p></a>)}</div>
    </section>
  </main>;
}
