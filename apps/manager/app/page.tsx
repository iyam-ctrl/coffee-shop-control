import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";

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

  return (
    <main style={{ minHeight: "100vh", background: "#0b0d0f", color: "#f5f1e8", padding: 28 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center", marginBottom: 32 }}>
          <div>
            <p style={{ color: "#b99a62", letterSpacing: 2, fontSize: 12 }}>COFFEE SHOP CONTROL</p>
            <h1 style={{ fontSize: 34, margin: "8px 0" }}>manager dashboard</h1>
            <p style={{ color: "#9299a3" }}>{business?.name ?? "toko"} · {String(managerMembership.role).toLowerCase()}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid #353b43", background: "#15181c", color: "#f5f1e8" }}>keluar</button>
          </form>
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 16 }}>
          {[
            ["penjualan hari ini", "Rp 0", "menunggu transaksi pertama"],
            ["kas & setoran", "Rp 0", "belum ada setoran"],
            ["stok kritis", "0 item", "semua aman untuk saat ini"],
            ["shift aktif", "belum ada", "buka shift untuk mulai"],
          ].map(([title, value, note]) => (
            <article key={title} style={{ padding: 22, borderRadius: 18, background: "#15181c", border: "1px solid #292e34" }}>
              <p style={{ color: "#9299a3", fontSize: 13 }}>{title}</p>
              <h2 style={{ fontSize: 25, margin: "10px 0 6px" }}>{value}</h2>
              <p style={{ color: "#707782", fontSize: 13 }}>{note}</p>
            </article>
          ))}
        </section>

        <section style={{ marginTop: 22, padding: 24, borderRadius: 18, background: "#15181c", border: "1px solid #292e34" }}>
          <h2 style={{ marginBottom: 8 }}>operasional</h2>
          <p style={{ color: "#9299a3", lineHeight: 1.6 }}>
            modul penjualan, stok, penerimaan barang, waste, stock opname, shift, dan setoran akan terhubung ke satu alur data yang sama.
          </p>
        </section>
      </div>
    </main>
  );
}
