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
type Shift = { id: string; opening_cash: number; opened_at: string; status: string };
type Summary = { cash_sales: number; cash_deposits: number; opening_cash: number; expected_cash: number };

export default function CashPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState("");
  const [shift, setShift] = useState<Shift | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(selected?: string) {
    setLoading(true); setError("");
    const { data: claims } = await supabase.auth.getClaims();
    const uid = claims?.claims?.sub as string | undefined;
    if (!uid) { location.href = "/login"; return; }

    const { data: memberships, error: membershipError } = await supabase
      .from("business_members").select("business_id,role")
      .eq("user_id", uid).eq("is_active", true);
    if (membershipError) { setError(membershipError.message); setLoading(false); return; }
    const membership = memberships?.find(m => ["OWNER","MANAGER","STAFF"].includes(String(m.role).toUpperCase()));
    if (!membership) { setError("akun tidak memiliki akses operasional"); setLoading(false); return; }

    const { data: s, error: storesError } = await supabase.from("stores")
      .select("id,name").eq("business_id", membership.business_id).eq("is_active", true).order("name");
    if (storesError) { setError(storesError.message); setLoading(false); return; }
    setStores(s || []);
    const id = selected || storeId || s?.[0]?.id || "";
    setStoreId(id);
    if (!id) { setShift(null); setSummary(null); setLoading(false); return; }

    const { data: sh, error: shiftError } = await supabase.from("shifts")
      .select("id,opening_cash,opened_at,status").eq("store_id", id).eq("status","OPEN")
      .order("opened_at", { ascending: false }).limit(1).maybeSingle();
    if (shiftError) { setError(shiftError.message); setLoading(false); return; }
    setShift(sh as Shift | null);

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const { data: report, error: reportError } = await supabase.rpc("get_cash_summary", {
      p_store_id: id, p_from: start, p_to: end
    });
    if (reportError) { setError(reportError.message); setLoading(false); return; }
    const row = Array.isArray(report) ? report[0] : report;
    setSummary(row ? {
      cash_sales: Number(row.cash_sales ?? 0),
      cash_deposits: Number(row.cash_deposits ?? 0),
      opening_cash: Number(row.opening_cash ?? 0),
      expected_cash: Number(row.expected_cash ?? 0),
    } : null);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deposit() {
    setError(""); setOk("");
    if (!storeId) return setError("pilih outlet");
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setError("jumlah setoran harus lebih dari 0");
    if (!shift) return setError("buka shift terlebih dahulu");

    const { error: rpcError } = await supabase.rpc("record_cash_deposit", {
      p_store_id: storeId,
      p_shift_id: shift.id,
      p_amount: value,
      p_reference_no: reference.trim() || null,
      p_note: note.trim() || null,
    });
    if (rpcError) return setError(rpcError.message);
    setAmount(""); setReference(""); setNote(""); setOk("setoran berhasil dicatat");
    await load(storeId);
  }

  return <main style={main}><div style={{maxWidth:900,margin:"0 auto"}}>
    <header style={head}><div><p style={eyebrow}>COFFEE SHOP CONTROL</p><h1>kas & setoran</h1><p style={muted}>rekonsiliasi cash outlet untuk hari berjalan.</p></div><button onClick={()=>location.href="/"} style={button}>dashboard</button></header>
    {error && <p style={err}>{error}</p>}{ok && <p style={success}>{ok}</p>}
    <section style={card}><select disabled={loading} value={storeId} onChange={e=>{setStoreId(e.target.value);load(e.target.value)}} style={input}>{stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></section>
    {loading ? <section style={{...card,marginTop:16}}><p style={muted}>memuat rekonsiliasi...</p></section> : summary ? <>
      <section style={grid}>
        <article style={card}><p style={muted}>modal awal</p><h2>{money(summary.opening_cash)}</h2></article>
        <article style={card}><p style={muted}>penjualan cash</p><h2>{money(summary.cash_sales)}</h2></article>
        <article style={card}><p style={muted}>sudah disetor</p><h2>{money(summary.cash_deposits)}</h2></article>
        <article style={card}><p style={muted}>cash seharusnya</p><h2>{money(summary.expected_cash)}</h2></article>
      </section>
      <section style={{...card,marginTop:16}}>
        <p style={eyebrow}>SETOR CASH</p><h2 style={{margin:"8px 0 16px"}}>catat setoran</h2>
        {!shift && <p style={warn}>tidak ada shift aktif. buka shift sebelum mencatat setoran.</p>}
        <input type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="jumlah setoran" style={input}/>
        <input value={reference} onChange={e=>setReference(e.target.value)} placeholder="nomor referensi (opsional)" style={input}/>
        <input value={note} onChange={e=>setNote(e.target.value)} placeholder="catatan (opsional)" style={input}/>
        <button disabled={!shift} onClick={deposit} style={{...primary,opacity:shift?1:.5}}>simpan setoran</button>
      </section>
    </> : <section style={{...card,marginTop:16}}><p style={muted}>belum ada data kas.</p></section>}
  </div></main>;
}

const main={minHeight:"100vh",background:"#090b0d",color:"#f5f1e8",padding:24};
const head={display:"flex",justifyContent:"space-between",alignItems:"center",gap:18,marginBottom:22,flexWrap:"wrap"} as const;
const eyebrow={color:"#c5a66b",letterSpacing:2,fontSize:11} as const;
const muted={color:"#9299a3",fontSize:13} as const;
const card={padding:20,borderRadius:18,background:"#14171b",border:"1px solid #292e34"} as const;
const grid={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:14,marginTop:16} as const;
const input={padding:12,borderRadius:10,border:"1px solid #353b43",background:"#0e1013",color:"#f5f1e8",width:"100%",marginBottom:10} as const;
const button={...input,width:"auto",marginBottom:0,cursor:"pointer"} as const;
const primary={padding:13,border:0,borderRadius:10,background:"#c5a66b",color:"#111",fontWeight:800,cursor:"pointer",width:"100%"} as const;
const err={padding:12,borderRadius:10,background:"#1d1515",color:"#ff8d8d",marginBottom:15};
const success={padding:12,borderRadius:10,background:"#151d18",color:"#9fe2b0",marginBottom:15};
const warn={padding:12,borderRadius:10,background:"#211d13",color:"#e6c777",marginBottom:14,fontSize:13};
