"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Unit = { id: string; name: string; symbol: string };
type Ingredient = {
  id: string;
  name: string;
  unit_id: string;
  current_cost: number;
  minimum_stock: number;
  is_active: boolean;
  units?: { name: string; symbol: string } | { name: string; symbol: string }[] | null;
};

const examples = [
  ["Coffee Beans House Blend", "g", 280, 500],
  ["Fresh Milk", "ml", 25, 2000],
  ["Granulated Sugar", "g", 18, 1000],
  ["Chocolate Powder", "g", 145, 500],
  ["Caramel Syrup", "ml", 75, 500],
  ["Vanilla Syrup", "ml", 72, 500],
  ["Black Tea", "g", 120, 300],
  ["Ice Cube", "g", 3, 5000],
  ["Paper Cup 12oz", "pcs", 900, 100],
  ["Cup Lid 12oz", "pcs", 450, 100],
];

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function unitName(units: Ingredient["units"]) {
  if (Array.isArray(units)) return units[0]?.name;
  return units?.name;
}

function unitSymbol(units: Ingredient["units"]) {
  if (Array.isArray(units)) return units[0]?.symbol;
  return units?.symbol;
}

export default function IngredientsPage() {
  const [businessId, setBusinessId] = useState("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [unitForm, setUnitForm] = useState({ name: "", symbol: "" });
  const [form, setForm] = useState({ name: "", unitId: "", cost: "", minimum: "" });

  async function loadData() {
    setLoading(true); setError("");
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) { window.location.href = "/login"; return; }
    const { data: memberships, error: memberError } = await supabase.from("business_members").select("business_id, role").eq("user_id", userId).eq("is_active", true);
    const owner = memberships?.find((m) => String(m.role).toUpperCase() === "OWNER");
    if (memberError || !owner) { setError("akun ini belum memiliki akses owner."); setLoading(false); return; }
    setBusinessId(owner.business_id);
    const [u, i] = await Promise.all([
      supabase.from("units").select("id, name, symbol").eq("business_id", owner.business_id).order("name"),
      supabase.from("ingredients").select("id, name, unit_id, current_cost, minimum_stock, is_active, units(name, symbol)").eq("business_id", owner.business_id).order("name"),
    ]);
    if (u.error) setError(u.error.message); else setUnits(u.data ?? []);
    if (i.error) setError(i.error.message); else setIngredients((i.data ?? []) as Ingredient[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ingredients.filter((i) => (showInactive || i.is_active) && (!q || [i.name, unitName(i.units) ?? "", unitSymbol(i.units) ?? ""].some((v) => v.toLowerCase().includes(q))));
  }, [ingredients, search, showInactive]);

  async function addUnit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    if (!unitForm.name.trim() || !unitForm.symbol.trim()) { setError("nama dan simbol unit wajib diisi."); setSaving(false); return; }
    const { error: e } = await supabase.from("units").insert({ business_id: businessId, name: unitForm.name.trim(), symbol: unitForm.symbol.trim() });
    if (e) setError(e.message); else { setUnitForm({ name: "", symbol: "" }); setMessage("unit berhasil ditambahkan."); await loadData(); }
    setSaving(false);
  }

  async function addIngredient(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    const cost = Number(form.cost || 0), minimum = Number(form.minimum || 0);
    if (!form.name.trim() || !form.unitId || !Number.isFinite(cost) || cost < 0 || !Number.isFinite(minimum) || minimum < 0) { setError("nama, unit, dan angka biaya/stok minimum harus valid."); setSaving(false); return; }
    const { error: e } = await supabase.from("ingredients").insert({ business_id: businessId, name: form.name.trim(), unit_id: form.unitId, current_cost: cost, minimum_stock: minimum, is_active: true });
    if (e) setError(e.message); else { setForm({ name: "", unitId: "", cost: "", minimum: "" }); setMessage("bahan berhasil ditambahkan."); await loadData(); }
    setSaving(false);
  }

  async function seedExamples() {
    setSaving(true); setError(""); setMessage("");
    const unitMap = new Map(units.map((u) => [u.symbol.toLowerCase(), u.id]));
    for (const symbol of ["g", "ml", "pcs"]) {
      if (!unitMap.has(symbol)) {
        const names: Record<string, string> = { g: "Gram", ml: "Milliliter", pcs: "Pieces" };
        const { data, error: e } = await supabase.from("units").insert({ business_id: businessId, name: names[symbol], symbol }).select("id, name, symbol").single();
        if (e) { setError(e.message); setSaving(false); return; }
        if (data) unitMap.set(symbol, data.id);
      }
    }
    const existing = new Set(ingredients.map((i) => i.name.toLowerCase()));
    const rows = examples.filter((x) => !existing.has(String(x[0]).toLowerCase())).map((x) => ({ business_id: businessId, name: x[0], unit_id: unitMap.get(String(x[1]).toLowerCase()), current_cost: x[2], minimum_stock: x[3], is_active: true }));
    const cleanRows = rows.filter((r) => r.unit_id);
    if (cleanRows.length) {
      const { error: e } = await supabase.from("ingredients").insert(cleanRows);
      if (e) { setError(e.message); setSaving(false); return; }
    }
    setMessage(cleanRows.length ? `${cleanRows.length} contoh bahan berhasil dimasukkan.` : "contoh bahan sudah ada."); await loadData(); setSaving(false);
  }

  async function toggleIngredient(item: Ingredient) {
    const { error: e } = await supabase.from("ingredients").update({ is_active: !item.is_active, updated_at: new Date().toISOString() }).eq("id", item.id).eq("business_id", businessId);
    if (e) setError(e.message); else { setMessage(item.is_active ? "bahan dinonaktifkan." : "bahan diaktifkan kembali."); await loadData(); }
  }

  const activeCount = ingredients.filter((i) => i.is_active).length;
  const unitLabel = (i: Ingredient) => unitSymbol(i.units) || unitName(i.units) || "—";

  return (
    <main style={{ minHeight: "100vh", background: "#090b0d", color: "#f5f1e8", padding: 24 }}>
      <div style={{ maxWidth: 1220, margin: "0 auto" }}>
        <header style={header}><div style={{ display: "flex", gap: 14, alignItems: "center" }}><img src="/coffee-shop-control-logo.svg" width="54" height="54" alt="Coffee Shop Control" style={{ borderRadius: 14 }} /><div><p style={goldLabel}>MASTER DATA · INVENTORY</p><h1 style={{ margin: "5px 0" }}>ingredients & units</h1><p style={muted}>biaya bahan yang menjadi fondasi HPP, recipe, dan kontrol stok.</p></div></div><button onClick={() => window.location.href = "/"} style={button}>dashboard</button></header>
        <section style={stats}><article style={card}><span style={muted}>bahan aktif</span><strong style={metric}>{activeCount}</strong></article><article style={card}><span style={muted}>total bahan</span><strong style={metric}>{ingredients.length}</strong></article><article style={card}><span style={muted}>unit</span><strong style={metric}>{units.length}</strong></article></section>
        {message && <p style={{ ...notice, color: "#9fe2b0" }}>{message}</p>}{error && <p style={{ ...notice, color: "#ff8d8d" }}>{error}</p>}
        <section style={{ ...card, marginBottom: 18 }}><div style={sectionHead}><div><h2>quick setup</h2><p style={muted}>isi unit dan bahan contoh sekali klik untuk mempercepat setup awal.</p></div><button onClick={seedExamples} disabled={saving || !businessId} style={primary}>{saving ? "memproses..." : "isi contoh bahan"}</button></div></section>
        <div style={layout}>
          <section style={card}><div style={sectionHead}><div><h2>daftar ingredients</h2><p style={muted}>{visible.length} bahan ditampilkan</p></div><label style={check}><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> tampilkan nonaktif</label></div><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="cari bahan atau unit..." style={{ ...input, marginTop: 14 }} />{loading ? <p style={{ padding: 24, color: "#9299a3" }}>memuat...</p> : visible.length === 0 ? <div style={empty}>belum ada ingredients.</div> : <div style={{ overflowX: "auto", marginTop: 12 }}><table style={table}><thead><tr>{["bahan", "unit", "cost / unit", "minimum stock", "status", "aksi"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{visible.map((i) => <tr key={i.id}><td style={td}><b>{i.name}</b></td><td style={td}>{unitLabel(i)}</td><td style={td}>{rupiah(Number(i.current_cost))}</td><td style={td}>{Number(i.minimum_stock).toLocaleString("id-ID")} {unitLabel(i)}</td><td style={td}><span style={{ ...badge, opacity: i.is_active ? 1 : .5 }}>{i.is_active ? "aktif" : "nonaktif"}</span></td><td style={td}><button onClick={() => toggleIngredient(i)} style={smallButton}>{i.is_active ? "nonaktifkan" : "aktifkan"}</button></td></tr>)}</tbody></table></div>}</section>
          <aside style={{ display: "grid", gap: 18 }}>
            <section style={card}><h2>tambah bahan</h2><p style={{ ...muted, margin: "6px 0 16px" }}>cost di sini berarti biaya untuk 1 unit bahan.</p><form onSubmit={addIngredient} style={formGrid}><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="nama bahan" style={input} /><select required value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })} style={input}><option value="">pilih unit</option>{units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}</select><input type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="cost per unit" style={input} /><input type="number" min="0" step="0.01" value={form.minimum} onChange={(e) => setForm({ ...form, minimum: e.target.value })} placeholder="minimum stock" style={input} /><button disabled={saving || !businessId} style={primary}>{saving ? "menyimpan..." : "tambah bahan"}</button></form></section>
            <section style={card}><h2>units</h2><p style={{ ...muted, margin: "6px 0 14px" }}>contoh: gram, milliliter, pieces.</p><form onSubmit={addUnit} style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 8 }}><input required value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} placeholder="nama" style={input} /><input required value={unitForm.symbol} onChange={(e) => setUnitForm({ ...unitForm, symbol: e.target.value })} placeholder="simbol" style={input} /><button disabled={saving} style={{ ...smallPrimary, gridColumn: "1 / -1" }}>tambah unit</button></form><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>{units.map((u) => <span key={u.id} style={badge}>{u.name} · {u.symbol}</span>)}</div></section>
          </aside>
        </div>
      </div>
    </main>
  );
}

const header = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" } as const;
const goldLabel = { color: "#c5a66b", letterSpacing: 2, fontSize: 11 } as const;
const card = { padding: 20, borderRadius: 18, background: "#14171b", border: "1px solid #292e34" } as const;
const muted = { color: "#9299a3", fontSize: 13 } as const;
const metric = { display: "block", fontSize: 28, marginTop: 8 } as const;
const stats = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 20 } as const;
const sectionHead = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" } as const;
const layout = { display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(290px,360px)", gap: 18, alignItems: "start" } as const;
const formGrid = { display: "grid", gap: 11 } as const;
const input = { width: "100%", padding: "12px 13px", borderRadius: 10, border: "1px solid #353b43", background: "#0d0f12", color: "#f5f1e8", outline: "none" } as const;
const button = { padding: "11px 16px", borderRadius: 10, border: "1px solid #353b43", background: "#15181c", color: "#f5f1e8", cursor: "pointer" } as const;
const primary = { padding: "12px 16px", border: 0, borderRadius: 10, background: "#c5a66b", color: "#111", fontWeight: 700, cursor: "pointer" } as const;
const smallPrimary = { ...primary, padding: "10px 13px" } as const;
const smallButton = { padding: "8px 10px", borderRadius: 8, border: "1px solid #353b43", background: "#1b1f24", color: "#f5f1e8", cursor: "pointer" } as const;
const check = { display: "flex", alignItems: "center", gap: 8, color: "#9299a3", fontSize: 13 } as const;
const notice = { padding: "11px 13px", borderRadius: 10, background: "#12151a", border: "1px solid #292e34", marginBottom: 14 } as const;
const badge = { display: "inline-flex", padding: "6px 9px", borderRadius: 999, background: "#20252b", border: "1px solid #353b43", fontSize: 12 } as const;
const table = { width: "100%", borderCollapse: "collapse", minWidth: 700 } as const;
const th = { textAlign: "left", padding: "11px 10px", color: "#707782", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid #292e34" } as const;
const td = { padding: "13px 10px", borderBottom: "1px solid #20242a", fontSize: 13 } as const;
const empty = { padding: 34, textAlign: "center", color: "#707782" } as const;
