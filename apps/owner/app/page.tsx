import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";

const money = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

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
  const startMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const startTomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  let omzet = 0, hpp = 0, expenses = 0, waste = 0, stockValue = 0;
  if (storeIds.length) {
    const [{ data: sales }, { data: expenseRows }, { data: stockRows }, { data: wasteRows }] = await Promise.all([
      supabase.from("sales").select("id,total").in("store_id", storeIds).eq("status", "COMPLETED").gte("sold_at", startToday).lt("sold_at", startTomorrow),
      supabase.from("expenses").select("amount").in("store_id", storeIds).gte("spent_at", startToday).lt("spent_at", startTomorrow),
      supabase.from("inventory_balances").select("quantity,ingredient_id").in("store_id", storeIds),
      supabase.from("waste_records").select("quantity,ingredient_id").in("store_id", storeIds).gte("recorded_at", startMonth),
    ]);
    omzet = (sales ?? []).reduce((sum, row) => sum + Number(row.total ?? 0), 0);
    expenses = (expenseRows ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const saleIds = (sales ?? []).map((x) => x.id);
    if (saleIds.length) {
      const { data: saleItems } = await supabase.from("sale_items").select("hpp_total").in("sale_id", saleIds);
      hpp = (saleItems ?? []).reduce((sum, row) => sum + Number(row.hpp_total ?? 0), 0);
    }
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
  const cards = [
    ["omzet hari ini", money(omzet), "semua outlet aktif"],
    ["HPP hari ini", money(hpp), "berdasarkan recipe"],
    ["gross profit", money(grossProfit), "omzet − HPP"],
    ["net profit", money(netProfit), "setelah biaya operasional"],
    ["nilai stok", money(stockValue), "estimasi current cost"],
    ["waste bulan ini", money(waste), "nilai bahan terbuang"],
  ];
  const modules = [
    ["Outlet", "pantau cabang dan informasi bisnis", "/outlet"],
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
      <p className="muted">owner control · {stores?.length ?? 0} outlet aktif · seluruh indikator bisnis dalam satu workspace</p>
    </section>
    <section className="kpi-grid" style={{ marginTop: 18 }}>{cards.map(([label, value, note]) => <article className="kpi-card" key={label}><span className="kpi-label">{label}</span><strong>{value}</strong><small>{note}</small></article>)}</section>
    <section className="page-section">
      <p className="brand-kicker">BUSINESS CONTROL</p><h2>pusat kendali owner</h2><p className="muted">owner fokus ke performa, profit, stok dan laporan — bukan transaksi kasir.</p>
      <div className="feature-grid">{modules.map(([title, description, href]) => <a className="feature-card" href={href} key={href}><p className="brand-kicker">CONTROL</p><h3>{title} →</h3><p>{description}</p></a>)}</div>
    </section>
  </main>;
}
