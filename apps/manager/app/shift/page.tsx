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
type Shift = { id: string; store_id: string; opened_at: string; opening_cash: number; status: string; closing_cash: number | null };

export default function ShiftPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState("");
  const [shift, setShift] = useState<Shift | null>(null);
  const [opening, setOpening] = useState("");
  const [closing, setClosing] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function load() {
    setError("");
    const { data: claims } = await supabase.auth.getClaims();
    const uid = claims?.claims?.sub as string | undefined;
    if (!uid) { location.href = "/login"; return; }

    const { data: memberships } = await supabase
      .from("business_members")
      .select("business_id,role")
      .eq("user_id", uid).eq("is_active", true);
    const membership = memberships?.find((m) => ["OWNER", "MANAGER", "STAFF"].includes(String(m.role).toUpperCase()));
    if (!membership) { setError("akun tidak memiliki akses operasional"); return; }

    const { data: s } = await supabase.from("stores")
      .select("id,name").eq("business_id", membership.business_id).eq("is_active", true).order("name");
    setStores(s || []);
    const id = storeId || s?.[0]?.id || "";
    setStoreId(id);
    if (!id) return;

    const { data: sh } = await supabase.from("shifts")
      .select("id,store_id,opened_at,opening_cash,status,closing_cash")
      .eq("store_id", id).eq("user_id", uid).eq("status", "OPEN")
      .order("opened_at", { ascending: false }).limit(1).maybeSingle();
    setShift(sh as Shift | null);
  }

  useEffect(() => { load(); }, []);

  async function openShift() {
    setError(""); setOk("");
    if (!storeId) return setError("pilih outlet");
    const { data: claims } = await supabase.auth.getClaims();
    const uid = claims?.claims?.sub as string | undefined;
    if (!uid) return setError("sesi login tidak ditemukan");
    const { data: existing } = await supabase.from("shifts").select("id").eq("store_id", storeId).eq("status", "OPEN").limit(1);
    if (existing?.length) return setError("masih ada shift terbuka di outlet ini");
    const { data, error } = await supabase.from("shifts").insert({ store_id: storeId, user_id: uid, opening_cash: Number(opening) || 0, status: "OPEN" }).select("id,store_id,opened_at,opening_cash,status,closing_cash").single();
    if (error) setError(error.message); else { setShift(data as Shift); setOpening(""); setOk("shift berhasil dibuka"); }
  }

  async function closeShift() {
    setError(""); setOk("");
    if (!shift) return;
    const { error } = await supabase.from("shifts").update({ closing_cash: Number(closing) || 0, closed_at: new Date().toISOString(), status: "CLOSED" }).eq("id", shift.id);
    if (error) setError(error.message); else { setShift(null); setClosing(""); setOk("shift berhasil ditutup"); }
  }

  return <main style={main}><div style={{maxWidth:900,margin:"0 auto"}}>
    <header style={head}><div><p style={eyebrow}>COFFEE SHOP CONTROL</p><h1>shift kerja</h1><p style={muted}>buka dan tutup shift kasir per outlet.</p></div><button onClick={()=>location.href="/"} style={button}>dashboard</button></header>
    {error && <p style={err}>{error}</p>}{ok && <p style={success}>{ok}</p>}
    <section style={card}><select value={storeId} onChange={e=>{setStoreId(e.target.value);setTimeout(load,0)}} style={input}>{stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></section>
    {!shift ? <section style={{...card,marginTop:16}}><p style={eyebrow}>SHIFT BARU</p><h2 style={{margin:"8px 0 16px"}}>buka shift</h2><input type="number" value={opening} onChange={e=>setOpening(e.target.value)} placeholder="modal awal kas" style={input}/><button onClick={openShift} style={primary}>buka shift</button></section> : <section style={{...card,marginTop:16}}><p style={eyebrow}>SHIFT AKTIF</p><h2 style={{margin:"8px 0"}}>sedang berjalan</h2><p style={muted}>dibuka {new Date(shift.opened_at).toLocaleString("id-ID")}</p><h2 style={{margin:"18px 0"}}>{money(Number(shift.opening_cash))}</h2><input type="number" value={closing} onChange={e=>setClosing(e.target.value)} placeholder="kas akhir" style={input}/><button onClick={closeShift} style={primary}>tutup shift</button></section>}
  </div></main>;
}

const main={minHeight:"100vh",background:"#090b0d",color:"#f5f1e8",padding:24};
const head={display:"flex",justifyContent:"space-between",alignItems:"center",gap:18,marginBottom:22,flexWrap:"wrap"} as const;
const eyebrow={color:"#c5a66b",letterSpacing:2,fontSize:11} as const;
const muted={color:"#9299a3",fontSize:13} as const;
const card={padding:20,borderRadius:18,background:"#14171b",border:"1px solid #292e34"} as const;
const input={padding:12,borderRadius:10,border:"1px solid #353b43",background:"#0e1013",color:"#f5f1e8",width:"100%",marginBottom:10} as const;
const button={...input,width:"auto",marginBottom:0,cursor:"pointer"} as const;
const primary={padding:13,border:0,borderRadius:10,background:"#c5a66b",color:"#111",fontWeight:800,cursor:"pointer",width:"100%"} as const;
const err={padding:12,borderRadius:10,background:"#1d1515",color:"#ff8d8d",marginBottom:15};
const success={padding:12,borderRadius:10,background:"#151d18",color:"#9fe2b0",marginBottom:15};
