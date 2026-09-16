"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const money = (n: number) => new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", maximumFractionDigits: 0
}).format(n);

type Store = { id: string; name: string };
type Expense = { id: string; category: string; amount: number; description: string | null; spent_at: string };

export default function ExpensesPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState("");
  const [rows, setRows] = useState<Expense[]>([]);
  const [category, setCategory] = useState("OPERASIONAL");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(selected?: string) {
    setLoading(true); setError("");
    const { data: claims } = await supabase.auth.getClaims();
    const uid = claims?.claims?.sub as string | undefined;
    if (!uid) { location.href = "/login"; return; }
    const { data: memberships, error: membershipError } = await supabase.from("business_members")
      .select("business_id,role").eq("user_id", uid).eq("is_active", true);
    if (membershipError) { setError(membershipError.message); setLoading(false); return; }
    const owner = memberships?.find(x => String(x.role).toUpperCase() === "OWNER");
    if (!owner) { location.href = "/not-authorized"; return; }
    const { data: s, error: storesError } = await supabase.from("stores")
      .select("id,name").eq("business_id", owner.business_id).eq("is_active", true).order("name");
    if (storesError) { setError(storesError.message); setLoading(false); return; }
    setStores(s || []);
    const id = selected || storeId || s?.[0]?.id || "";
    setStoreId(id);
    if (!id) { setRows([]); setLoading(false); return; }
    const { data, error: expenseError } = await supabase.from("expenses")
      .select("id,category,amount,description,spent_at").eq("store_id", id)
      .order("spent_at", { ascending: false }).limit(100);
    if (expenseError) setError(expenseError.message);
    setRows((data || []) as Expense[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addExpense() {
    setError(""); setOk("");
    const value = Number(amount);
    if (!storeId) return setError("pilih outlet");
    if (!Number.isFinite(value) || value <= 0) return setError("jumlah biaya harus lebih dari 0");
    const { data: claims } = await supabase.auth.getClaims();
    const uid = claims?.claims?.sub as string | undefined;
    if (!uid) return setError("session tidak ditemukan");
    const { error: insertError } = await supabase.from("expenses").insert({
      store_id: storeId,
      category: category.trim().toUpperCase(),
      amount: value,
      description: description.trim() || null,
      spent_at: new Date().toISOString(),
      created_by: uid,
    });
    if (insertError) return setError(insertError.message);
    setAmount(""); setDescription(""); setOk("biaya berhasil dicatat");
    await load(storeId);
  }

  return <main style={main}><div style={{maxWidth:1000,margin:"0 auto"}}>
    <header style={head}><div><p style={eyebrow}>OWNER CONTROL</p><h1>biaya operasional</h1><p style={muted}>catat biaya outlet agar profit bersih tidak hanya berdasarkan penjualan.</p></div><button onClick={()=>location.href="/"} style={button}>dashboard</button></header>
    {error && <p style={err}>{error}</p>}{ok && <p style={success}>{ok}</p>}
    <section style={card}><select disabled={loading} value={storeId} onChange={e=>{setStoreId(e.target.value);load(e.target.value)}} style={input}>{stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></section>
    <section style={{...card,marginTop:16}}><p style={eyebrow}>BIAYA BARU</p><div style={grid}><input value={category} onChange={e=>setCategory(e.target.value)} placeholder="kategori" style={input}/><input type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="jumlah" style={input}/><input value={description} onChange={e=>setDescription(e.target.value)} placeholder="deskripsi" style={input}/></div><button onClick={addExpense} style={primary}>simpan biaya</button></section>
    <section style={{...card,marginTop:16,overflowX:"auto"}}><p style={eyebrow}>RIWAYAT</p><table style={table}><thead><tr><th style={th}>tanggal</th><th style={th}>kategori</th><th style={th}>deskripsi</th><th style={th}>jumlah</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td style={td}>{new Date(r.spent_at).toLocaleString("id-ID")}</td><td style={td}>{r.category}</td><td style={td}>{r.description || "-"}</td><td style={td}>{money(Number(r.amount))}</td></tr>)}{!rows.length&&!loading&&<tr><td style={td} colSpan={4}>belum ada biaya.</td></tr>}</tbody></table></section>
  </div></main>;
}

const main={minHeight:"100vh",background:"#090b0d",color:"#f5f1e8",padding:24};
const head={display:"flex",justifyContent:"space-between",alignItems:"center",gap:18,marginBottom:22,flexWrap:"wrap"} as const;
const eyebrow={color:"#c5a66b",letterSpacing:2,fontSize:11} as const;
const muted={color:"#9299a3",fontSize:13} as const;
const card={padding:20,borderRadius:18,background:"#14171b",border:"1px solid #292e34"} as const;
const grid={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10,margin:"14px 0"} as const;
const input={padding:12,borderRadius:10,border:"1px solid #353b43",background:"#0e1013",color:"#f5f1e8",width:"100%"} as const;
const button={...input,width:"auto",cursor:"pointer"} as const;
const primary={padding:13,border:0,borderRadius:10,background:"#c5a66b",color:"#111",fontWeight:800,cursor:"pointer",width:"100%"} as const;
const table={width:"100%",borderCollapse:"collapse",marginTop:14} as const;
const th={textAlign:"left",padding:"11px 9px",borderBottom:"1px solid #30353b",color:"#9299a3",fontSize:12} as const;
const td={padding:"12px 9px",borderBottom:"1px solid #24282d",fontSize:13} as const;
const err={padding:12,borderRadius:10,background:"#1d1515",color:"#ff8d8d",marginBottom:15};
const success={padding:12,borderRadius:10,background:"#151d18",color:"#9fe2b0",marginBottom:15};
