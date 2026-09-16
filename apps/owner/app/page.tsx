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

  let omzet = 0;
  let hpp = 0;
  let expenses = 0;
  let waste = 0;
  let stockValue = 0;

  if (storeIds.length) {
    const [{ data: sales }, { data: expenseRows }, { data: stockRows }, { data: wasteRows }] = await Promise.all([
      supabase.from("sales").select("id,total,sold_at").in("store_id", storeIds).eq("status", "COMPLETED").gte("sold_at", startToday),
      supabase.from("expenses").select("amount,spent_at").in("store_id", storeIds).gte("spent_at", startMonth),
      supabase.from("inventory_balances").select("quantity,ingredient_id").in("store_id", storeIds),
      supabase.from("waste_records").select("quantity,ingredient_id,recorded_at").in("store_id", storeIds).gte("recorded_at", startMonth),
    ]);

    omzet = (sales ?? []).reduce((sum, row) => sum + Number(row.total ?? 0), 0);
    expenses = (expenseRows ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

    const saleIds = (sales ?? []).map((x) => x.id);
    if (saleIds.length) {
      const { data: saleItems } = await supabase.from("sale_items").select("hpp_total,sale_id").in("sale_id", saleIds);
      hpp = (saleItems ?? []).reduce((sum, row) => sum + Number(row.hpp_total ?? 0), 0);
    }

    const ingredientIds = Array.from(new Set([
      ...(stockRows ?? []).map((x) => x.ingredient_id),
      ...(wasteRows ?? []).map((x) => x.ingredient_id),
    ]));
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
    ["omzet", money(omzet), "hari ini"],
    ["HPP", money(hpp), "hari ini"],
    ["gross profit", money(grossProfit), "omzet − HPP"],
    ["net profit", money(netProfit), "gross profit − biaya bulan berjalan"],
    ["nilai stok", money(stockValue), "estimasi dari current cost"],
    ["waste", money(waste), "bulan berjalan"],
  ];
  const links = [
    ["produk & menu", "menu, harga jual, kategori", "/products"],
    ["ingredients", "bahan, cost, minimum stock", "/ingredients"],
    ["recipe builder", "komposisi, HPP & margin", "/recipes"],
    ["inventory control", "stok, barang masuk & waste", "/inventory"],
    ["stock opname", "hitung fisik & variance", "/stock-opname"],
    ["sales control", "transaksi & pemakaian recipe", "/sales"],
    ["laporan bisnis", "omzet, HPP, laba & aktivitas", "/reports"],
  ];

  return <main style={main}><div style={{ maxWidth: 1200, margin: "0 auto" }}>
    <header style={head}>
      <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
        <img src="/coffee-shop-control-logo.svg" width="60" height="60" alt="Coffee Shop Control" style={{ borderRadius: 16 }} />
        <div><p style={eyebrow}>COFFEE SHOP CONTROL</p><h1 style={{ margin: "5px 0" }}>owner dashboard</h1><p style={muted}>{business?.name || "bisnis"} · owner · {stores?.length ?? 0} outlet aktif</p></div>
      </div>
      <form action="/auth/signout" method="post"><button style={button}>keluar</button></form>
    </header>

    <section style={stats}>{cards.map(([label, value, note]) => <article key={label} style={card}><p style={muted}>{label}</p><h2 style={{ margin: "8px 0 4px" }}>{value}</h2><p style={muted}>{note}</p></article>)}</section>

    <section style={{ marginTop: 25 }}><p style={eyebrow}>CONTROL CENTER</p><h2 style={{ margin: "5px 0" }}>operasional bisnis</h2><p style={muted}>satu alur dari menu sampai profit.</p>
      <div style={grid}>{links.map(([title, description, href]) => <a key={href} href={href} style={{ textDecoration: "none", color: "inherit" }}><article style={master}><p style={eyebrow}>CONTROL</p><h2 style={{ margin: "8px 0" }}>{title} →</h2><p style={{ ...muted, lineHeight: 1.6 }}>{description}</p></article></a>)}</div>
    </section>
  </div></main>;
}

const main = { minHeight: "100vh", background: "#090b0d", color: "#f5f1e8", padding: 24 };
const head = { display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center", marginBottom: 30, flexWrap: "wrap" } as const;
const eyebrow = { color: "#c5a66b", letterSpacing: 2, fontSize: 11 } as const;
const muted = { color: "#9299a3", fontSize: 13 } as const;
const card = { padding: 20, borderRadius: 18, background: "#14171b", border: "1px solid #292e34" } as const;
const master = { ...card, minHeight: 145, background: "linear-gradient(145deg,#171a1f,#101215)", cursor: "pointer" } as const;
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(245px,1fr))", gap: 14, marginTop: 15 } as const;
const stats = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 } as const;
const button = { padding: "11px 16px", borderRadius: 10, border: "1px solid #353b43", background: "#15181c", color: "#f5f1e8", cursor: "pointer" } as const;
