import { redirect } from "next/navigation";
import { createClient } from "./lib/supabase/server";

const money = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

type IngredientRow = { id: string; name: string; minimum_stock: number | null };

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
  let salesToday = 0, cashToday = 0, depositsToday = 0, activeShiftCount = 0, lowStockCount = 0;
  let recentSales: { id: string; transaction_no: string; total: number; sold_at: string }[] = [];
  let lowStockItems: { name: string; quantity: number; minimum: number }[] = [];
  if (storeIds.length) {
    const [{ data: sales }, { data: deposits }, { count: shiftCount }] = await Promise.all([
      supabase.from("sales").select("id,transaction_no,total,sold_at").in("store_id", storeIds).eq("status", "COMPLETED").gte("sold_at", start).lt("sold_at", end).order("sold_at", { ascending: false }),
      supabase.from("cash_deposits").select("amount").in("store_id", storeIds).gte("deposited_at", start).lt("deposited_at", end),
      supabase.from("shifts").select("id", { count: "exact", head: true }).in("store_id", storeIds).eq("status", "OPEN"),
    ]);
    recentSales = (sales ?? []).slice(0, 6).map((row) => ({ ...row, total: Number(row.total ?? 0) }));
    salesToday = (sales ?? []).reduce((sum, row) => sum + Number(row.total ?? 0), 0);
    const saleIds = (sales ?? []).map((row) => row.id);
    if (saleIds.length) {
      const { data: payments } = await supabase.from("payments").select("amount,method").in("sale_id", saleIds);
      cashToday = (payments ?? []).filter((row) => String(row.method).toUpperCase() === "CASH").reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    }
    depositsToday = (deposits ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    activeShiftCount = shiftCount ?? 0;
  }
  const { data: ingredientsData } = await supabase.from("ingredients").select("id,name,minimum_stock").eq("business_id", membership.business_id).eq("is_active", true).order("name");
  const ingredients: IngredientRow[] = (ingredientsData ?? []) as IngredientRow[];
  if (ingredients.length && storeIds.length) {
    const { data: balances } = await supabase.from("inventory_balances").select("ingredient_id,quantity").in("ingredient_id", ingredients.map((item) => item.id)).in("store_id", storeIds);
    const qty = new Map<string, number>();
    for (const row of balances ?? []) qty.set(row.ingredient_id, (qty.get(row.ingredient_id) ?? 0) + Number(row.quantity ?? 0));
    const critical = ingredients.filter((item) => (qty.get(item.id) ?? 0) <= Number(item.minimum_stock ?? 0));
    lowStockCount = critical.length;
    lowStockItems = critical.map((item) => ({ name: item.name, quantity: qty.get(item.id) ?? 0, minimum: Number(item.minimum_stock ?? 0) })).slice(0, 6);
  }

  const cards = [
    ["penjualan hari ini", money(salesToday), "monitor transaksi kasir"],
    ["cash hari ini", money(cashToday), "pembayaran metode cash"],
    ["setoran hari ini", money(depositsToday), "cash yang sudah disetor"],
    ["cash belum disetor", money(Math.max(0, cashToday - depositsToday)), "indikator rekonsiliasi"],
    ["stok kritis", `${lowStockCount} item`, "menyentuh batas minimum"],
    ["shift aktif", `${activeShiftCount} shift`, `${stores?.length ?? 0} outlet aktif`],
  ];
  const modules = [
    ["Outlet & Bisnis", "informasi outlet dan konfigurasi bisnis", "/setup"],
    ["Shift", "buka, pantau dan tutup shift operasional", "/shift"],
    ["Kas & Setoran", "rekonsiliasi cash dan setoran outlet", "/cash"],
  ];
  return <main>
    <section className="hero-panel"><div><p className="brand-kicker">MANAGER CONTROL CENTER</p><h2>{business?.name ?? "bisnis"}</h2><p className="muted">operasional harian · {stores?.length ?? 0} outlet aktif · {today.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p></div><div className="hero-status"><span className="status-dot"/> sistem aktif</div></section>
    <section className="kpi-grid manager-kpis" style={{ marginTop: 14 }}>{cards.map(([label, value, note]) => <article className="kpi-card" key={label}><span className="kpi-label">{label}</span><strong>{value}</strong><small>{note}</small></article>)}</section>
    <section className="ops-grid">
      <article className="data-panel"><div className="panel-head"><h3>transaksi terbaru</h3><span>{recentSales.length} transaksi</span></div><div className="table-list">{recentSales.length ? recentSales.map((row) => <div className="table-row" key={row.id}><b>{row.transaction_no}</b><span>{new Date(row.sold_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span><span>{money(row.total)}</span></div>) : <p className="muted">belum ada transaksi hari ini.</p>}</div></article>
      <article className="data-panel"><div className="panel-head"><h3>stok kritis</h3><span>{lowStockCount} item</span></div><div className="table-list">{lowStockItems.length ? lowStockItems.map((item) => <div className="table-row" key={item.name}><b>{item.name}</b><span>{item.quantity}</span><span className="status-pill warning">min {item.minimum}</span></div>) : <p className="muted">semua bahan di atas minimum stock.</p>}</div></article>
    </section>
    <section className="ops-alert"><div><b>perhatian operasional</b><p>{lowStockCount ? `${lowStockCount} bahan perlu dipantau atau direstock.` : "tidak ada peringatan minimum stock dari data saat ini."}</p></div><a href="/cash">buka rekonsiliasi →</a></section>
    <section className="page-section"><p className="brand-kicker">OPERATIONS</p><h2>pusat kerja manager</h2><p className="muted">fungsi kasir/POS dipisahkan ke aplikasi kasir agar kontrol operasional tetap rapi.</p><div className="feature-grid">{modules.map(([title, description, href], i) => <a className="feature-card ops-card" href={href} key={href}><span className="module-number">0{i + 1}</span><p className="brand-kicker">MODULE</p><h3>{title} →</h3><p>{description}</p></a>)}</div></section>
  </main>;
}
