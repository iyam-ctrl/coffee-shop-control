import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { createBusiness } from "./actions";

export const dynamic = "force-dynamic";

type SetupPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  "lengkapi-nama-bisnis-toko-dan-kode-toko": "nama bisnis, nama toko, dan kode toko wajib diisi.",
  "gagal-memeriksa-membership": "gagal memeriksa akses akun. coba lagi.",
  "gagal-membuat-bisnis": "bisnis gagal dibuat. cek kembali lalu coba lagi.",
  "gagal-membuat-owner": "membership owner gagal dibuat. coba lagi.",
  "gagal-membuat-toko": "toko gagal dibuat. coba lagi.",
  "gagal-menghubungkan-owner-ke-toko": "owner gagal dihubungkan ke toko. coba lagi.",
};

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub as string | undefined;

  if (!userId) redirect("/login");

  const { data: memberships } = await supabase
    .from("business_members")
    .select("business_id, role, is_active")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (memberships?.some((item) => String(item.role).toUpperCase() === "OWNER")) {
    redirect("/");
  }

  if (memberships?.length) {
    redirect("/not-authorized");
  }

  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] ?? "terjadi kesalahan. coba lagi." : null;

  return (
    <main style={{ minHeight: "100vh", background: "#0b0d0f", color: "#f5f1e8", padding: 24 }}>
      <div style={{ maxWidth: 620, margin: "0 auto", paddingTop: 48 }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ color: "#b99a62", letterSpacing: 2, fontSize: 12 }}>COFFEE SHOP CONTROL</p>
          <h1 style={{ fontSize: 34, margin: "8px 0" }}>siapkan bisnis pertama</h1>
          <p style={{ color: "#9299a3", lineHeight: 1.6 }}>
            akun ini belum terhubung ke bisnis. buat bisnis dan toko pertama untuk mulai memakai dashboard owner.
          </p>
        </div>

        <form action={createBusiness} style={{ display: "grid", gap: 16, padding: 24, borderRadius: 20, background: "#15181c", border: "1px solid #292e34" }}>
          {errorMessage ? (
            <div style={{ padding: 14, borderRadius: 12, background: "#2a1717", border: "1px solid #6d2c2c", color: "#ffb4b4", fontSize: 14 }}>
              {errorMessage}
            </div>
          ) : null}

          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#c5cad1", fontSize: 13 }}>nama bisnis</span>
            <input name="business_name" required placeholder="contoh: Kopi Senja" style={inputStyle} />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ color: "#c5cad1", fontSize: 13 }}>nama toko / outlet</span>
              <input name="store_name" required placeholder="Outlet Utama" style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ color: "#c5cad1", fontSize: 13 }}>kode toko</span>
              <input name="store_code" required placeholder="OUTLET-01" style={{ ...inputStyle, textTransform: "uppercase" }} />
            </label>
          </div>

          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#c5cad1", fontSize: 13 }}>alamat <span style={{ color: "#707782" }}>(opsional)</span></span>
            <textarea name="address" rows={3} placeholder="alamat outlet" style={{ ...inputStyle, resize: "vertical" }} />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#c5cad1", fontSize: 13 }}>nomor telepon <span style={{ color: "#707782" }}>(opsional)</span></span>
            <input name="phone" placeholder="08xxxxxxxxxx" style={inputStyle} />
          </label>

          <button type="submit" style={{ marginTop: 6, padding: "14px 18px", borderRadius: 12, border: "1px solid #b99a62", background: "#b99a62", color: "#0b0d0f", fontWeight: 700, cursor: "pointer" }}>
            buat bisnis & toko
          </button>
        </form>

        <p style={{ color: "#626a75", fontSize: 12, marginTop: 16, lineHeight: 1.5 }}>
          setup ini hanya tersedia untuk akun yang belum memiliki membership bisnis.
        </p>
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 10,
  border: "1px solid #353b43",
  background: "#0f1215",
  color: "#f5f1e8",
  outline: "none",
  fontSize: 14,
};
