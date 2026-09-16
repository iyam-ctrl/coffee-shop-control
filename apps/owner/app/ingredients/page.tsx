"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

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

const getSupabase = () => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const examples: [string, string, number, number][] = [
  ["Coffee Beans House Blend", "g", 280, 500], ["Fresh Milk", "ml", 25, 2000],
  ["Granulated Sugar", "g", 18, 1000], ["Chocolate Powder", "g", 145, 500],
  ["Caramel Syrup", "ml", 75, 500], ["Vanilla Syrup", "ml", 72, 500],
  ["Black Tea", "g", 120, 300], ["Ice Cube", "g", 3, 5000],
  ["Paper Cup 12oz", "pcs", 900, 100], ["Cup Lid 12oz", "pcs", 450, 100]
];

function unitName(u: Ingredient["units"]) { return Array.isArray(u) ? u[0]?.name : u?.name; }
function unitSymbol(u: Ingredient["units"]) { return Array.isArray(u) ? u[0]?.symbol : u?.symbol; }
function rupiah(v: number) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v); }

export default function IngredientsPage() {
  const [businessId, setBusinessId] = useState("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", unitId: "", cost: "", minimum: "" });
  const [unitForm, setUnitForm] = useState({ name: "", symbol: "" });

  async function loadData() {
    const supabase = getSupabase(); setLoading(true); setError("");
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) { window.location.href = "/login"; return; }
    const { data: memberships, error: memberError } = await supabase.from("business_members").select("business_id, role").eq("user_id", userId).eq("is_active", true);
    const owner = memberships?.find((m) => String(m.role).toUpperCase() === "OWNER");
    if (memberError || !owner) { setError("akun ini belum memiliki akses owner."); setLoading(false); return; }
    setBusinessId(owner.business_id);
    const [u, i] = await Promise.all([
      supabase.from("units").select("id,name,symbol").eq("business_id", owner.business_id).order("name"),
      supabase.from("ingredients").select("id,name,unit_id,current_cost,minimum_stock,is_active,units(name,symbol)").eq("business_id", owner.business_id).order("name")
    ]);
    if (u.error) setError(u.error.message); else setUnits(u.data ?? []);
    if (i.error) setError(i.error.message); else setIngredients((i.data ?? []) as Ingredient[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);
  const visible = useMemo(() => { const q = search.trim().toLowerCase(); return ingredients.filter(i => (showInactive || i.is_active) && (!q || [i.name, unitName(i.units) ?? "", unitSymbol(i.units) ?? ""].some(v => v.toLowerCase().includes(q)))); }, [ingredients, search, showInactive]);

  async function addUnit(e: FormEvent) {
    e.preventDefault(); const supabase = getSupabase(); setSaving(true); setError("");
    if (!unitForm.name.trim() || !unitForm.symbol.trim()) { setError("nama dan simbol unit wajib diisi."); setSaving(false); return; }
    const { error: err } = await supabase.from("units").insert({ business_id: businessId, name: unitForm.name.trim(), symbol: unitForm.symbol.trim() });
    if (err) setError(err.message); else { setUnitForm({ name: "", symbol: "" }); setMessage("unit berhasil ditambahkan."); await loadData(); } setSaving(false);
  }

  async function addIngredient(e: FormEvent) {
    e.preventDefault(); const supabase = getSupabase(); setSaving(true); setError("");
    const cost = Number(form.cost || 0), minimum = Number(form.minimum || 0);
    if (!form.name.trim() || !form.unitId || !Number.isFinite(cost) || cost < 0 || !Number.isFinite(minimum) || minimum < 0) { setError("nama, unit, dan angka biaya/stok minimum harus valid."); setSaving(false); return; }
    const { error: err } = await supabase.from("ingredients").insert({ business_id: businessId, name: form.name.trim(), unit_id: form.unitId, current_cost: cost, minimum_stock: minimum, is_active: true });
    if (err) setError(err.message); else { setForm({ name: "", unitId: "", cost: "", minimum: "" }); setMessage("bahan berhasil ditambahkan."); await loadData(); } setSaving(false);
  }

  async function seedExamples() {
    const supabase = getSupabase(); setSaving(true); setError("");
    const map = new Map(units.map(u => [u.symbol.toLowerCase(), u.id]));
    for (const symbol of ["g", "ml", "pcs"]) if (!map.has(symbol)) { const names: Record<string,string> = { g: "Gram", ml: "Milliliter", pcs: "Pieces" }; const { data, error: err } = await supabase.from("units").insert({ business_id: businessId, name: names[symbol], symbol }).select("id").single(); if (err) { setError(err.message); setSaving(false); return; } if (data) map.set(symbol, data.id); }
    const existing = new Set(ingredients.map(i => i.name.toLowerCase()));
    const rows = examples.filter(x => !existing.has(x[0].toLowerCase())).map(x => ({ business_id: businessId, name: x[0], unit_id: map.get(x[1]), current_cost: x[2], minimum_stock: x[3], is_active: true })).filter(x => x.unit_id);
    if (rows.length) { const { error: err } = await supabase.from("ingredients").insert(rows); if (err) { setError(err.message); setSaving(false); return; } }
    setMessage(rows.length ? `${rows.length} contoh bahan berhasil dimasukkan.` : "contoh bahan sudah ada."); await loadData(); setSaving(false);
  }

  async function toggleIngredient(i: Ingredient) { const supabase = getSupabase(); const { error: err } = await supabase.from("ingredients").update({ is_active: !i.is_active, updated_at: new Date().toISOString() }).eq("id", i.id).eq("business_id", businessId); if (err) setError(err.message); else await loadData(); }
  const activeCount = ingredients.filter(i => i.is_active).length;

  return <main style={styles.main}><div style={styles.wrap}>
    <header style={styles.header}><div><small style={styles.gold}>MASTER DATA · INVENTORY</small><h1>ingredients & units</h1><p style={styles.muted}>biaya bahan yang menjadi fondasi HPP, recipe, dan kontrol stok.</p></div><button onClick={() => window.location.href = "/"} style={styles.button}>dashboard</button></header>
    <section style={styles.stats}><div style={styles.card}><span style={styles.muted}>bahan aktif</span><b style={styles.metric}>{activeCount}</b></div><div style={styles.card}><span style={styles.muted}>total bahan</span><b style={styles.metric}>{ingredients.length}</b></div><div style={styles.card}><span style={styles.muted}>unit</span><b style={styles.metric}>{units.length}</b></div></section>
    {message && <p style={styles.ok}>{message}</p>}{error && <p style={styles.err}>{error}</p>}
    <section style={styles.card}><div style={styles.row}><div><h2>quick setup</h2><p style={styles.muted}>isi unit dan bahan contoh untuk setup awal.</p></div><button disabled={saving || !businessId} onClick={seedExamples} style={styles.primary}>{saving ? "memproses..." : "isi contoh bahan"}</button></div></section>
    <div style={styles.grid}><section style={styles.card}><div style={styles.row}><h2>daftar ingredients</h2><label><input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} /> tampilkan nonaktif</label></div><input value={search} onChange={e => setSearch(e.target.value)} placeholder="cari bahan atau unit..." style={styles.input}/>{loading ? <p style={styles.muted}>memuat...</p> : visible.length === 0 ? <p style={styles.muted}>belum ada ingredients.</p> : <div style={{overflowX:"auto"}}><table style={styles.table}><thead><tr><th>bahan</th><th>unit</th><th>cost / unit</th><th>minimum</th><th>status</th><th>aksi</th></tr></thead><tbody>{visible.map(i => <tr key={i.id}><td><b>{i.name}</b></td><td>{unitSymbol(i.units) || unitName(i.units) || "—"}</td><td>{rupiah(Number(i.current_cost))}</td><td>{Number(i.minimum_stock).toLocaleString("id-ID")}</td><td>{i.is_active ? "aktif" : "nonaktif"}</td><td><button onClick={() => toggleIngredient(i)} style={styles.small}>{i.is_active ? "nonaktifkan" : "aktifkan"}</button></td></tr>)}</tbody></table></div>}</section>
    <aside style={{display:"grid",gap:18}}><section style={styles.card}><h2>tambah bahan</h2><form onSubmit={addIngredient} style={styles.form}><input required value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="nama bahan" style={styles.input}/><select required value={form.unitId} onChange={e => setForm({...form,unitId:e.target.value})} style={styles.input}><option value="">pilih unit</option>{units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}</select><input type="number" min="0" step="0.01" value={form.cost} onChange={e => setForm({...form,cost:e.target.value})} placeholder="cost per unit" style={styles.input}/><input type="number" min="0" step="0.01" value={form.minimum} onChange={e => setForm({...form,minimum:e.target.value})} placeholder="minimum stock" style={styles.input}/><button disabled={saving || !businessId} style={styles.primary}>tambah bahan</button></form></section>
    <section style={styles.card}><h2>units</h2><form onSubmit={addUnit} style={styles.form}><input required value={unitForm.name} onChange={e => setUnitForm({...unitForm,name:e.target.value})} placeholder="nama unit" style={styles.input}/><input required value={unitForm.symbol} onChange={e => setUnitForm({...unitForm,symbol:e.target.value})} placeholder="simbol" style={styles.input}/><button disabled={saving} style={styles.primary}>tambah unit</button></form></section></aside></div>
  </div></main>;
}

const styles = {
  main:{minHeight:"100vh",background:"#090b0d",color:"#f5f1e8",padding:24}, wrap:{maxWidth:1220,margin:"0 auto"}, header:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,marginBottom:24,flexWrap:"wrap" as const}, gold:{color:"#c5a66b",letterSpacing:2,fontSize:11}, muted:{color:"#9299a3",fontSize:13}, card:{padding:20,borderRadius:18,background:"#14171b",border:"1px solid #292e34",marginBottom:18}, stats:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:14}, metric:{display:"block",fontSize:28,marginTop:8}, row:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap" as const}, grid:{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(290px,360px)",gap:18,alignItems:"start"}, form:{display:"grid",gap:10,marginTop:14}, input:{width:"100%",padding:"12px 13px",borderRadius:10,border:"1px solid #353b43",background:"#0d0f12",color:"#f5f1e8"}, button:{padding:"11px 16px",borderRadius:10,border:"1px solid #353b43",background:"#15181c",color:"#f5f1e8"}, primary:{padding:"12px 16px",border:0,borderRadius:10,background:"#c5a66b",color:"#111",fontWeight:700}, small:{padding:"7px 10px",borderRadius:8,border:"1px solid #353b43",background:"#15181c",color:"#f5f1e8"}, table:{width:"100%",borderCollapse:"collapse" as const,marginTop:14}, ok:{color:"#9fe2b0"}, err:{color:"#ff8d8d"}
} as const;
