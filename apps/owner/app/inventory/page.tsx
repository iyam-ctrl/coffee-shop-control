"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

type Store = { id: string; name: string };
type Ingredient = { id: string; name: string; unit_id: string; current_cost: number; minimum_stock: number; is_active: boolean; units?: { name: string; symbol: string } | null };
type Balance = { ingredient_id: string; quantity: number };
type Movement = { id: string; ingredient_id: string; movement_type: string; quantity: number; unit_cost: number; note: string | null; created_at: string; ingredients?: { name: string; units?: { symbol: string } | null } | null };

const money = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const num = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(n);

export default function InventoryPage() {
  const [businessId, setBusinessId] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"stock" | "receive" | "waste">("stock");
  const [receive, setReceive] = useState({ supplier: "", receiptNo: "", ingredientId: "", quantity: "", unitCost: "" });
  const [waste, setWaste] = useState({ ingredientId: "", quantity: "", reason: "" });

  async function getOwner() {
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub as string | undefined;
    if (!userId) { window.location.href = "/login"; return null; }
    const { data: memberships } = await supabase.from("business_members").select("business_id, role").eq("user_id", userId).eq("is_active", true);
    const owner = memberships?.find((m) => String(m.role).toUpperCase() === "OWNER");
    if (!owner) { setError("akun ini belum memiliki akses owner."); setLoading(false); return null; }
    setBusinessId(owner.business_id); return owner.business_id as string;
  }

  async function loadData(selectedStore?: string) {
    setLoading(true); setError("");
    const bid = businessId || await getOwner(); if (!bid) return;
    const [{ data: storeData, error: storeError }, { data: ingredientData, error: ingredientError }] = await Promise.all([
      supabase.from("stores").select("id,name").eq("business_id", bid).order("name"),
      supabase.from("ingredients").select("id,name,unit_id,current_cost,minimum_stock,is_active,units(name,symbol)").eq("business_id", bid).eq("is_active", true).order("name"),
    ]);
    if (storeError) setError(storeError.message);
    if (ingredientError) setError(ingredientError.message);
    setStores(storeData ?? []); setIngredients((ingredientData ?? []) as Ingredient[]);
    const sid = selectedStore || storeId || storeData?.[0]?.id || "";
    setStoreId(sid);
    if (!sid) { setBalances([]); setMovements([]); setLoading(false); return; }
    const [{ data: b, error: be }, { data: m, error: me }] = await Promise.all([
      supabase.from("inventory_balances").select("ingredient_id,quantity").eq("store_id", sid),
      supabase.from("inventory_movements").select("id,ingredient_id,movement_type,quantity,unit_cost,note,created_at,ingredients(name,units(symbol))").eq("store_id", sid).order("created_at", { ascending: false }).limit(30),
    ]);
    if (be) setError(be.message); if (me) setError(me.message);
    setBalances(b ?? []); setMovements((m ?? []) as Movement[]); setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const stockRows = useMemo(() => ingredients.map((i) => ({ ...i, quantity: Number(balances.find((b) => b.ingredient_id === i.id)?.quantity ?? 0) })).filter((i) => {
    const q = search.toLowerCase().trim(); return !q || i.name.toLowerCase().includes(q);
  }), [ingredients, balances, search]);

  async function submitReceive(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(""); setMessage("");
    const qty = Number(receive.quantity), cost = Number(receive.unitCost);
    if (!storeId || !receive.ingredientId || qty <= 0 || cost < 0) { setError("lengkapi toko, bahan, quantity, dan harga modal."); setSaving(false); return; }
    const { error: rpcError } = await supabase.rpc("record_goods_receipt", { p_store_id: storeId, p_supplier_name: receive.supplier, p_receipt_no: receive.receiptNo, p_items: [{ ingredient_id: receive.ingredientId, quantity: qty, unit_cost: cost }] });
    if (rpcError) setError(rpcError.message); else { setMessage("barang masuk berhasil dicatat dan stok otomatis bertambah."); setReceive({ supplier: "", receiptNo: "", ingredientId: "", quantity: "", unitCost: "" }); await loadData(storeId); }
    setSaving(false);
  }

  async function submitWaste(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(""); setMessage("");
    const qty = Number(waste.quantity);
    if (!storeId || !waste.ingredientId || qty <= 0 || !waste.reason.trim()) { setError("lengkapi bahan, quantity, dan alasan waste."); setSaving(false); return; }
    const current = Number(balances.find((b) => b.ingredient_id === waste.ingredientId)?.quantity ?? 0);
    if (qty > current) { setError("quantity waste melebihi stok saat ini."); setSaving(false); return; }
    const { error: rpcError } = await supabase.rpc("record_waste", { p_store_id: storeId, p_ingredient_id: waste.ingredientId, p_quantity: qty, p_reason: waste.reason.trim() });
    if (rpcError) setError(rpcError.message); else { setMessage("waste berhasil dicatat dan stok otomatis berkurang."); setWaste({ ingredientId: "", quantity: "", reason: "" }); await loadData(storeId); }
    setSaving(false);
  }

  const lowStock = stockRows.filter((i) => Number(i.quantity) <= Number(i.minimum_stock));
  const stockValue = stockRows.reduce((s, i) => s + Number(i.quantity) * Number(i.current_cost), 0);

  return <main style={{ minHeight: "100vh", background: "#090b0d", color: "#f5f1e8", padding: 24 }}><div style={{ maxWidth: 1250, margin: "0 auto" }}>
    <header style={header}><div><p style={eyebrow}>INVENTORY CONTROL</p><h1 style={{ margin: "6px 0" }}>stok & pergerakan</h1><p style={muted}>pantau stok bahan, penerimaan barang, dan waste per outlet.</p></div><button onClick={() => window.location.href = "/"} style={button}>dashboard</button></header>
    {stores.length === 0 && <div style={{ ...card, borderColor: "#8c6a2f", marginBottom: 18 }}><h2>belum ada outlet</h2><p style={{ ...muted, marginTop: 8 }}>inventory membutuhkan store/outlet. buat store dulu di setup bisnis sebelum mencatat stok.</p><button onClick={() => window.location.href = "/setup"} style={{ ...primary, marginTop: 14 }}>buka setup bisnis</button></div>}
    {message && <p style={{ ...notice, color: "#9fe2b0" }}>{message}</p>}{error && <p style={{ ...notice, color: "#ff8d8d" }}>{error}</p>}
    {stores.length > 0 && <>
      <section style={stats}><article style={card}><span style={muted}>nilai stok</span><strong style={metric}>{money(stockValue)}</strong></article><article style={card}><span style={muted}>bahan aktif</span><strong style={metric}>{stockRows.length}</strong></article><article style={card}><span style={muted}>stok menipis</span><strong style={{ ...metric, color: lowStock.length ? "#e8bd69" : "#9fe2b0" }}>{lowStock.length}</strong></article><article style={card}><span style={muted}>aktivitas terakhir</span><strong style={metric}>{movements.length}</strong></article></section>
      <section style={{ ...card, marginBottom: 18 }}><div style={sectionHead}><div><h2>outlet</h2><p style={muted}>semua saldo inventory dipisahkan per store.</p></div><select value={storeId} onChange={(e) => { setStoreId(e.target.value); loadData(e.target.value); }} style={input}>{stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div></section>
      <nav style={tabs}><button onClick={() => setTab("stock")} style={tab === "stock" ? activeTab : tabButton}>stok saat ini</button><button onClick={() => setTab("receive")} style={tab === "receive" ? activeTab : tabButton}>barang masuk</button><button onClick={() => setTab("waste")} style={tab === "waste" ? activeTab : tabButton}>waste</button></nav>
      {tab === "stock" && <div style={grid}><section style={card}><div style={sectionHead}><div><h2>saldo bahan</h2><p style={muted}>{stockRows.length} bahan ditampilkan</p></div><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="cari bahan..." style={{ ...input, maxWidth: 300 }} /></div>{loading ? <p style={muted}>memuat...</p> : <div style={{ overflowX: "auto", marginTop: 14 }}><table style={table}><thead><tr>{["bahan","stok","minimum","modal/unit","status"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{stockRows.map((i) => { const low = Number(i.quantity) <= Number(i.minimum_stock); return <tr key={i.id}><td style={td}><b>{i.name}</b></td><td style={td}>{num(i.quantity)} {i.units?.symbol ?? ""}</td><td style={td}>{num(Number(i.minimum_stock))} {i.units?.symbol ?? ""}</td><td style={td}>{money(Number(i.current_cost))}</td><td style={td}><span style={{ ...badge, borderColor: low ? "#8c6a2f" : "#365b43" }}>{low ? "stok menipis" : "aman"}</span></td></tr>})}</tbody></table></div>}</section><section style={card}><h2>aktivitas terbaru</h2><p style={{ ...muted, marginBottom: 12 }}>30 pergerakan terakhir.</p>{movements.length === 0 ? <p style={muted}>belum ada pergerakan stok.</p> : movements.map((m) => <div key={m.id} style={activity}><div><b>{m.ingredients?.name ?? "bahan"}</b><p style={muted}>{m.note ?? m.movement_type} · {new Date(m.created_at).toLocaleString("id-ID")}</p></div><strong style={{ color: Number(m.quantity) < 0 ? "#ff8d8d" : "#9fe2b0" }}>{Number(m.quantity) > 0 ? "+" : ""}{num(Number(m.quantity))} {m.ingredients?.units?.symbol ?? ""}</strong></div>)}</section></div>}
      {tab === "receive" && <section style={card}><h2>catat barang masuk</h2><p style={{ ...muted, marginBottom: 18 }}>satu penerimaan bisa dikembangkan menjadi multi-item; untuk sekarang form ini fokus pada satu bahan per pencatatan agar alurnya aman.</p><form onSubmit={submitReceive} style={formGrid}><input value={receive.supplier} onChange={(e) => setReceive({ ...receive, supplier: e.target.value })} placeholder="supplier (opsional)" style={input} /><input value={receive.receiptNo} onChange={(e) => setReceive({ ...receive, receiptNo: e.target.value })} placeholder="nomor penerimaan (opsional)" style={input} /><select required value={receive.ingredientId} onChange={(e) => setReceive({ ...receive, ingredientId: e.target.value })} style={input}><option value="">pilih bahan</option>{ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} · {i.units?.symbol ?? ""}</option>)}</select><input required min="0.001" step="any" type="number" value={receive.quantity} onChange={(e) => setReceive({ ...receive, quantity: e.target.value })} placeholder="quantity" style={input} /><input required min="0" step="any" type="number" value={receive.unitCost} onChange={(e) => setReceive({ ...receive, unitCost: e.target.value })} placeholder="harga modal per unit" style={input} /><button disabled={saving} style={primary}>{saving ? "menyimpan..." : "simpan barang masuk"}</button></form></section>}
      {tab === "waste" && <section style={card}><h2>catat waste</h2><p style={{ ...muted, marginBottom: 18 }}>stok akan berkurang dan biaya waste tercatat menggunakan current cost bahan.</p><form onSubmit={submitWaste} style={formGrid}><select required value={waste.ingredientId} onChange={(e) => setWaste({ ...waste, ingredientId: e.target.value })} style={input}><option value="">pilih bahan</option>{stockRows.map((i) => <option key={i.id} value={i.id}>{i.name} · stok {num(i.quantity)} {i.units?.symbol ?? ""}</option>)}</select><input required min="0.001" step="any" type="number" value={waste.quantity} onChange={(e) => setWaste({ ...waste, quantity: e.target.value })} placeholder="quantity waste" style={input} /><input required value={waste.reason} onChange={(e) => setWaste({ ...waste, reason: e.target.value })} placeholder="alasan, contoh: rusak / tumpah / expired" style={input} /><button disabled={saving} style={primary}>{saving ? "menyimpan..." : "simpan waste"}</button></form></section>}
    </>}
  </div></main>;
}

const header = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" } as const;
const eyebrow = { color: "#c5a66b", letterSpacing: 2, fontSize: 12 } as const;
const muted = { color: "#9299a3", fontSize: 13 } as const;
const card = { padding: 20, borderRadius: 18, background: "#14171b", border: "1px solid #292e34" } as const;
const stats = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 18 } as const;
const metric = { display: "block", fontSize: 25, marginTop: 8 } as const;
const grid = { display: "grid", gridTemplateColumns: "minmax(0,1.45fr) minmax(300px,.75fr)", gap: 18, alignItems: "start" } as const;
const sectionHead = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" } as const;
const input = { width: "100%", padding: "12px 13px", borderRadius: 10, border: "1px solid #353b43", background: "#0d0f12", color: "#f5f1e8", outline: "none" } as const;
const button = { padding: "11px 16px", borderRadius: 10, border: "1px solid #353b43", background: "#15181c", color: "#f5f1e8", cursor: "pointer" } as const;
const primary = { padding: "12px 16px", border: 0, borderRadius: 10, background: "#c5a66b", color: "#111", fontWeight: 700, cursor: "pointer" } as const;
const notice = { padding: "12px 14px", borderRadius: 10, background: "#14171b", border: "1px solid #292e34", marginBottom: 14 } as const;
const tabs = { display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" } as const;
const tabButton = { ...button, borderColor: "#292e34" } as const;
const activeTab = { ...button, background: "#c5a66b", color: "#111", borderColor: "#c5a66b", fontWeight: 700 } as const;
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, maxWidth: 900 } as const;
const table = { width: "100%", borderCollapse: "collapse", minWidth: 650 } as const;
const th = { textAlign: "left", padding: "12px 10px", borderBottom: "1px solid #292e34", color: "#707782", fontSize: 12 } as const;
const td = { padding: "13px 10px", borderBottom: "1px solid #20242a", fontSize: 13 } as const;
const badge = { display: "inline-flex", padding: "5px 8px", borderRadius: 999, border: "1px solid #365b43", color: "#b9d8c1", fontSize: 11 } as const;
const activity = { display: "flex", justifyContent: "space-between", gap: 12, padding: "13px 0", borderBottom: "1px solid #20242a" } as const;
