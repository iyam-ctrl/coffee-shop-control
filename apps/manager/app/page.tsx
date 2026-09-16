import { redirect } from "next/navigation";
import { createClient } from "./lib/supabase/server";

const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export default async function ManagerDashboard() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub as string | undefined;

  if (!userId) redirect("/login");

  const { data: memberships } = await supabase
    .from("business_members")
    .select("business_id, role, is_active")
    .eq("user_id", userId)
    .eq("is_active", true);

  const managerMembership = memberships?.find((item) =>
    ["MANAGER", "STAFF"].includes(String(item.role).toUpperCase())
  );

  if (!managerMembership) {
    const ownerMembership = memberships?.find(
      (item) => String(item.role).toUpperCase() === "OWNER"
    );
    if (ownerMembership) redirect("/not-authorized");
    redirect("/setup");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", managerMembership.business_id)
    .maybeSingle();

  const { data: stores } = await supabase
    .from("stores")
    .select("id, name")
    .eq("business_id", managerMembership.business_id)
    .eq("is_active", true)
    .order("name");

  const storeIds = (stores ?? []).map((store) => store.id);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  let salesToday = 0;
  let cashToday = 0;
  let depositsToday = 0;
  let activeShiftCount = 0;

  if (storeIds.length) {
    const { data: sales } = await supabase
      .from("sales")
      .select("id,total,store_id")
      .in("store_id", storeIds)
      .eq("status", "COMPLETED")
      .gte("sold_at", start)
      .lt("sold_at", end);

    salesToday = (sales ?? []).reduce((sum, sale) => sum + Number(sale.total ?? 0), 0);
    const saleIds = (sales ?? []).map((sale) => sale.id);

    if (saleIds.length) {
      const { data: payments } = await supabase
        .from("payments")
        .select("amount,method")
        .in("sale_id", saleIds);
      cashToday = (payments ?? [])
        .filter((payment) => String(payment.method).toUpperCase() === "CASH")
        .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
    }

    const { data: deposits } = await supabase
      .from("cash_deposits")
      .select("amount")
      .in("store_id", storeIds)
      .gte("deposited_at", start)
      .lt("deposited_at", end);
    depositsToday = (deposits ?? []).reduce((sum, deposit) => sum + Number(deposit.amount ?? 0), 0);

    const { count } = await supabase
      .from("shifts")
      .select("id", { count: "exact", head: true })
      .in("store_id", storeIds)
      .eq("status", "OPEN");
    activeShiftCount = count ?? 0;
  }

  const { data: ingredients } = await supabase
    .from("ingredients")
    .select("id, minimum_stock, is_active")
    .eq("business_id", managerMembership.business_id)
    .eq("is_active", true);

  const ingredientIds = (ingredients ?? []).map((ingredient) => ingredient.id);
  let lowStock = 0;
  if (ingredientIds.length && storeIds.length) {
    const { data: balances } = await supabase
      .from("inventory_balances")
      .select("ingredient_id, quantity, store_id")
      .in("ingredient_id", ingredientIds)
      .in("store_id", storeIds);
    const minimums = new Map((ingredients ?? []).map((item) => [item.id, Number(item.minimum_stock ?? 0)]));
    const quantities = new Map<string, number>();
    for (const row of balances ?? []) {
      quantities.set(row.ingredient_id, (quantities.get(row.ingredient_id) ?? 0) + Number(row.quantity ?? 0));
    }
    lowStock = ingredientIds.filter((id) => (quantities.get(id) ?? 0) <= (minimums.get(id) ?? 0)).length;
  }

  const expectedCash = cashToday - depositsToday;

  return (
    <main style={{ minHeight: "100vh", background: "#0b0d0f", color: "#f5f1e8", padding: 28 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center", marginBottom: 32 }}>
          <div>
            <p style={{ color: "#b99a62", letterSpacing: 2, fontSize: 12 }}>COFFEE SHOP CONTROL</p>
            <h1 style={{ fontSize: 34, margin: "8px 0" }}>manager dashboard</h1>
            <p style={{ color: "#9299a3" }}>{business?.name ?? "toko"} · {String(managerMembership.role).toLowerCase()}</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => {}} style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid #353b43", background: "#15181c", color: "#f5f1e8" }}>operasional</button>
            <form action="/auth/signout" method="post">
              <button style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid #353b43", background: "#15181c", color: "#f5f1e8" }}>keluar</button>
            </form>
          </div>
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 16 }}>
          <article style={card}>
            <p style={label}>penjualan hari ini</p>
            <h2 style={value}>{money(salesToday)}</h2>
            <p style={note}>transaksi selesai hari ini</p>
          </article>
          <article style={card}>
            <p style={label}>cash hari ini</p>
            <h2 style={value}>{money(cashToday)}</h2>
            <p style={note}>pembayaran metode cash</p>
          </article>
          <article style={card}>
            <p style={label}>setoran hari ini</p>
            <h2 style={value}>{money(depositsToday)}</h2>
            <p style={note}>cash yang sudah disetor</p>
          </article>
          <article style={card}>
            <p style={label}>cash belum disetor</p>
            <h2 style={value}>{money(Math.max(0, expectedCash))}</h2>
            <p style={note}>cash − setoran hari ini</p>
          </article>
          <article style={card}>
            <p style={label}>stok kritis</p>
            <h2 style={value}>{lowStock} item</h2>
            <p style={note}>menyentuh batas minimum</p>
          </article>
          <article style={card}>
            <p style={label}>shift aktif</p>
            <h2 style={value}>{activeShiftCount} shift</h2>
            <p style={note}>{stores?.length ?? 0} outlet aktif</p>
          </article>
        </section>

        <section style={{ marginTop: 22, padding: 24, borderRadius: 18, background: "#15181c", border: "1px solid #292e34" }}>
          <h2 style={{ marginBottom: 8 }}>operasional</h2>
          <p style={{ color: "#9299a3", lineHeight: 1.6 }}>
            gunakan modul penjualan, shift, stok, penerimaan barang, waste, stock opname, dan setoran untuk menjaga seluruh aktivitas outlet tercatat dalam satu alur data.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <a href="/sales" style={link}>penjualan</a>
            <a href="/shift" style={link}>shift</a>
            <a href="/inventory" style={link}>stok</a>
            <a href="/cash" style={link}>kas & setoran</a>
          </div>
        </section>
      </div>
    </main>
  );
}

const card = { padding: 22, borderRadius: 18, background: "#15181c", border: "1px solid #292e34" } as const;
const label = { color: "#9299a3", fontSize: 13 } as const;
const value = { fontSize: 25, margin: "10px 0 6px" } as const;
const note = { color: "#707782", fontSize: 13 } as const;
const link = { padding: "10px 14px", borderRadius: 10, border: "1px solid #353b43", color: "#f5f1e8", textDecoration: "none", background: "#0e1013", fontSize: 13 } as const;
