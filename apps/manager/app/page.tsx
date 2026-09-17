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
  if (!membership) redirect("/not-authorized");

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
    const ids = ingredients.map((item) => item.id);
    const { data: balances } = await supabase.from("inventory_balances").select("ingredient_id,quantity").in("ingredient_id", ids).in("store_id", storeIds);
    const qty = new Map<string, number>();
    for (const row of balances ?? []) qty.set(row.ingredient_id, (qty.get(row.ingredient_id) ?? 0) + Number(row.quantity ?? 0));
    lowStock = ids.filter((id) => (qty.get(id) ?? 0) <= Number(ingredients.find((item) => item.id === id)?.minimum_stock ?? 0)).length;
  }

  const cards = [
    ["penjualan hari ini", money(salesToday), "monitor transaksi kasir"],
    ["cash hari ini", money(cashToday), "pembayaran metode cash"],
    ["setoran hari ini", money(depositsToday), "cash yang sudah disetor"],
    ["cash belum disetor", money(Math.max(0, cashToday - depositsToday)), "indikator rekonsiliasi"],
    ["stok kritis", `${lowStock} item`, "menyentuh batas minimum"],
    ["shift aktif", `${activeShiftCount} shift`, `${stores?.length ?? 0} outlet aktif`],
  ];
  const modules = [
    ["Outlet & Bisnis", "informasi outlet dan konfigurasi bisnis", "/setup"],
    ["Shift", "buka, pantau dan tutup shift operasional", "/shift"],
    ["Kas & Setoran", "rekonsiliasi cash dan setoran outlet", "/cash"],
  ];
  return <main>
    <section className="hero-panel"><div><p className="brand-kicker">MANAGER CONTROL CENTER</p><h2>{business?.name ?? "bisnis"}</h2><p className="muted">operasional harian · {stores?.length ?? 0} outlet aktif · {today.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p></div><div className="hero-status"><span className="status-dot"/> sistem aktif</div></section>
    <section className="kpi-grid manager-kpis">{cards.map(([label, value, note]) => <article className="kpi-card" key={label}><span className="kpi-label">{label}</span><strong>{value}</strong><small>{note}</small></article>)}</section>
    <section className="ops-alert"><div><b>perhatian operasional</b><p>{lowStock ? `${lowStock} bahan berada di bawah atau sama dengan minimum stock.` : "tidak ada peringatan minimum stock dari data saat ini."}</p></div><a href="/cash">buka rekonsiliasi →</a></section>
    <section className="page-section"><p className="brand-kicker">OPERATIONS</p><h2>pusat kerja manager</h2><p className="muted">fungsi kasir/POS dipisahkan sepenuhnya ke aplikasi kasir.</p><div className="feature-grid">{modules.map(([title, description, href], i) => <a className="feature-card ops-card" href={href} key={href}><span className="module-number">0{i + 1}</span><p className="brand-kicker">MODULE</p><h3>{title} →</h3><p>{description}</p></a>)}</div></section>
  </main>;
}
