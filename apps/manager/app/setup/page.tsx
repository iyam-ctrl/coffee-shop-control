"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function SetupPage() {
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const metadata = data.user?.user_metadata ?? {};
      setFullName(String(metadata.full_name ?? ""));
      setBusinessName(String(metadata.business_name ?? ""));
      setStoreName(String(metadata.store_name ?? ""));
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const cleanFullName = fullName.trim();
    const cleanBusinessName = businessName.trim();
    const cleanStoreName = storeName.trim();

    if (!cleanFullName || !cleanBusinessName || !cleanStoreName) {
      setError("nama lengkap, nama bisnis, dan nama outlet wajib diisi.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError("sesi login tidak ditemukan. silakan login kembali.");
      setLoading(false);
      return;
    }

    const { error: bootstrapError } = await supabase.rpc("bootstrap_manager_account", {
      p_full_name: cleanFullName,
      p_business_name: cleanBusinessName,
      p_store_name: cleanStoreName,
    });

    if (bootstrapError) {
      setError(bootstrapError.message || "setup bisnis gagal. coba lagi.");
      setLoading(false);
      return;
    }

    await supabase.auth.updateUser({
      data: {
        full_name: cleanFullName,
        business_name: cleanBusinessName,
        store_name: cleanStoreName,
      },
    });

    window.location.href = "/";
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b0d0f", color: "#f5f1e8", padding: 24 }}>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 460, padding: 32, borderRadius: 24, background: "#15181c", border: "1px solid #292e34" }}>
        <p style={{ color: "#b99a62", letterSpacing: 2, fontSize: 12 }}>COFFEE SHOP CONTROL</p>
        <h1 style={{ margin: "8px 0" }}>siapkan akun</h1>
        <p style={{ color: "#9299a3", marginBottom: 24, lineHeight: 1.5 }}>
          lengkapi bisnis dan outlet pertama. akun ini akan dibuat sebagai manager.
        </p>

        <Field label="nama lengkap" value={fullName} onChange={setFullName} required />
        <Field label="nama bisnis" value={businessName} onChange={setBusinessName} required />
        <Field label="nama outlet" value={storeName} onChange={setStoreName} required />

        {error && <p style={{ color: "#ff7d7d", marginBottom: 16, lineHeight: 1.5 }}>{error}</p>}

        <button disabled={loading} style={{ width: "100%", padding: 14, border: 0, borderRadius: 12, background: "#b99a62", color: "#111", fontWeight: 700, cursor: "pointer" }}>
          {loading ? "menyiapkan akun..." : "lanjut ke dashboard"}
        </button>

        <a href="/auth/signout" style={{ display: "block", textAlign: "center", marginTop: 16, color: "#9299a3", textDecoration: "none", fontSize: 14 }}>
          keluar
        </a>
      </form>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", marginBottom: 7, fontSize: 14 }}>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} type={type} required={required} style={{ width: "100%", padding: 13, borderRadius: 12, border: "1px solid #353b43", background: "#0f1114", color: "inherit" }} />
    </label>
  );
}
