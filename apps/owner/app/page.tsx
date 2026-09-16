import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";

export default async function OwnerDashboard() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub as string | undefined;
  if (!userId) redirect("/login");

  const { data: memberships } = await supabase.from("business_members").select("business_id, role, is_active").eq("user_id", userId).eq("is_active", true);
  const ownerMembership = memberships?.find((item) => String(item.role).toUpperCase() === "OWNER");
  if (!ownerMembership) {
    if (memberships?.some((item) => ["MANAGER", "STAFF"].includes(String(item.role).toUpperCase()))) redirect("/not-authorized");
    redirect("/setup");
  }
  const { data: business } = await supabase.from("businesses").select("name").eq("id", ownerMembership.business_id).maybeSingle();

  const masterCards = [
    ["produk & menu", "menu, harga jual, kategori", "/products"],
    ["ingredients", "bahan, cost, minimum stock", "/ingredients"],
    ["recipe builder", "komposisi, HPP & margin", "/recipes"],
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#090b0d", color: "#f5f1e8", padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center", marginBottom: 30, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
            <img src="/coffee-shop-control-logo.svg" width="62" height="62" alt="Coffee Shop Control" style={{ borderRadius: 17, boxShadow: "0 10px 35px rgba(197,166,107,.10)" }} />
            <div><p style={{ color: "#c5a66b", letterSpacing: 2, fontSize: 11 }}>COFFEE SHOP CONTROL</p><h1 style={{ fontSize: 32, margin: "5px 0" }}>owner dashboard</h1><p style={{ color: "#9299a3" }}>{business?.name ?? "bisnis"} · owner</p></div>
          </div>
          <form action="/auth/signout" method="post"><button style={button}>keluar</button></form>
        </header>

        <section style={stats}>
          {[["omzet", "Rp 0", "hari ini"], ["HPP", "Rp 0", "hari ini"], ["gross profit", "Rp 0", "hari ini"], ["net profit", "Rp 0", "hari ini"], ["nilai stok", "Rp 0", "estimasi saat ini"], ["waste", "Rp 0", "bulan berjalan"]].map(([title, value, note]) => <article key={title} style={card}><p style={muted}>{title}</p><h2 style={{ fontSize: 25, margin: "10px 0 6px" }}>{value}</h2><p style={{ color: "#707782", fontSize: 13 }}>{note}</p></article>)}
        </section>

        <section style={{ marginTop: 22 }}><div style={{ marginBottom: 13 }}><p style={goldLabel}>CONTROL CENTER</p><h2 style={{ margin: "5px 0" }}>master data</h2><p style={muted}>alur utama bisnis: produk → recipe → HPP → inventory → transaksi → profit.</p></div><div style={masterGrid}>{masterCards.map(([title, text, href]) => <a key={href} href={href} style={{ textDecoration: "none", color: "inherit" }}><article style={masterCard}><p style={goldLabel}>MASTER DATA</p><h2 style={{ margin: "8px 0" }}>{title} →</h2><p style={{ color: "#9299a3", lineHeight: 1.6 }}>{text}</p></article></a>)}</div></section>

        <section style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
          {[["keuangan", "omzet, HPP, laba, biaya, kas & setoran"], ["inventory", "stok, pembelian, waste, opname & variance"], ["kontrol", "aktivitas manager, audit log & alert"]].map(([title, text]) => <article key={title} style={card}><h2 style={{ marginBottom: 8 }}>{title}</h2><p style={{ color: "#9299a3", lineHeight: 1.6 }}>{text}</p></article>)}
        </section>
      </div>
    </main>
  );
}

const goldLabel = { color: "#c5a66b", letterSpacing: 2, fontSize: 11 } as const;
const muted = { color: "#9299a3", fontSize: 13 } as const;
const card = { padding: 20, borderRadius: 18, background: "#14171b", border: "1px solid #292e34" } as const;
const masterCard = { padding: 23, minHeight: 155, borderRadius: 18, background: "linear-gradient(145deg,#171a1f,#101215)", border: "1px solid #343a42", boxShadow: "0 12px 40px rgba(0,0,0,.20)" } as const;
const masterGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 14 } as const;
const stats = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14 } as const;
const button = { padding: "11px 16px", borderRadius: 10, border: "1px solid #353b43", background: "#15181c", color: "#f5f1e8", cursor: "pointer" } as const;
