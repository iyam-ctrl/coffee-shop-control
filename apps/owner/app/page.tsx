import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";

export default async function OwnerDashboard() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub as string | undefined;
  if (!userId) redirect("/login");

  const { data: memberships } = await supabase
    .from("business_members")
    .select("business_id, role, is_active")
    .eq("user_id", userId)
    .eq("is_active", true);

  const ownerMembership = memberships?.find(
    (item) => String(item.role).toUpperCase() === "OWNER"
  );

  if (!ownerMembership) {
    if (memberships?.some((item) => ["MANAGER", "STAFF"].includes(String(item.role).toUpperCase()))) redirect("/not-authorized");
    redirect("/setup");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", ownerMembership.business_id)
    .maybeSingle();

  return (
    <main style={{ minHeight: "100vh", background: "#0b0d0f", color: "#f5f1e8", padding: 28 }}>
      <div style={{ maxWidth: 1150, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center", marginBottom: 32 }}>
          <div>
            <p style={{ color: "#b99a62", letterSpacing: 2, fontSize: 12 }}>COFFEE SHOP CONTROL</p>
            <h1 style={{ fontSize: 34, margin: "8px 0" }}>owner dashboard</h1>
            <p style={{ color: "#9299a3" }}>{business?.name ?? "bisnis"} · owner</p>
          </div>
          <form action="/auth/signout" method="post">
            <button style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid #353b43", background: "#15181c", color: "#f5f1e8" }}>keluar</button>
          </form>
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 16 }}>
          {[
            ["omzet", "Rp 0", "hari ini"], ["HPP", "Rp 0", "hari ini"], ["gross profit", "Rp 0", "hari ini"],
            ["net profit", "Rp 0", "hari ini"], ["nilai stok", "Rp 0", "estimasi saat ini"], ["waste", "Rp 0", "bulan berjalan"],
          ].map(([title, value, note]) => (
            <article key={title} style={{ padding: 22, borderRadius: 18, background: "#15181c", border: "1px solid #292e34" }}>
              <p style={{ color: "#9299a3", fontSize: 13 }}>{title}</p>
              <h2 style={{ fontSize: 25, margin: "10px 0 6px" }}>{value}</h2>
              <p style={{ color: "#707782", fontSize: 13 }}>{note}</p>
            </article>
          ))}
        </section>

        <section style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
          <a href="/products" style={{ textDecoration: "none", color: "inherit" }}>
            <article style={{ padding: 24, borderRadius: 18, background: "#15181c", border: "1px solid #c5a66b", cursor: "pointer" }}>
              <p style={{ color: "#c5a66b", fontSize: 12, letterSpacing: 1.5 }}>MASTER DATA</p>
              <h2 style={{ margin: "8px 0" }}>produk & menu →</h2>
              <p style={{ color: "#9299a3", lineHeight: 1.6 }}>tambah, nonaktifkan, cari produk, kelola kategori, dan isi contoh menu.</p>
            </article>
          </a>
          {[
            ["keuangan", "omzet, HPP, laba, biaya, kas & setoran"],
            ["inventory", "stok, pembelian, waste, opname & variance"],
            ["kontrol", "aktivitas manager, audit log & alert"],
          ].map(([title, text]) => (
            <article key={title} style={{ padding: 24, borderRadius: 18, background: "#15181c", border: "1px solid #292e34" }}>
              <h2 style={{ marginBottom: 8 }}>{title}</h2>
              <p style={{ color: "#9299a3", lineHeight: 1.6 }}>{text}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
