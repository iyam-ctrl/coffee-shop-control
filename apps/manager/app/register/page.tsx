"use client";

import { FormEvent, useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleanFullName = fullName.trim();
    const cleanBusinessName = businessName.trim();
    const cleanStoreName = storeName.trim();
    const cleanEmail = email.trim();

    if (password.length < 8) {
      setError("password minimal 8 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setError("konfirmasi password tidak sama.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanFullName,
          business_name: cleanBusinessName,
          store_name: cleanStoreName,
        },
      },
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "gagal membuat akun.");
      setLoading(false);
      return;
    }

    if (!data.session) {
      setSuccess("akun berhasil dibuat. cek email untuk verifikasi, lalu login kembali agar setup bisnis otomatis selesai.");
      setLoading(false);
      return;
    }

    const { error: bootstrapError } = await supabase.rpc("bootstrap_manager_account", {
      p_full_name: cleanFullName,
      p_business_name: cleanBusinessName,
      p_store_name: cleanStoreName,
    });

    if (bootstrapError) {
      setError("akun berhasil dibuat, tetapi setup bisnis gagal. coba login kembali.");
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b0d0f", color: "#f5f1e8", padding: 24 }}>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 460, padding: 32, borderRadius: 24, background: "#15181c", border: "1px solid #292e34" }}>
        <p style={{ color: "#b99a62", letterSpacing: 2, fontSize: 12 }}>COFFEE SHOP CONTROL</p>
        <h1 style={{ margin: "8px 0" }}>daftar akun manager</h1>
        <p style={{ color: "#9299a3", marginBottom: 24 }}>buat akun dan outlet pertama untuk sistem operasional toko.</p>
        <Field label="nama lengkap" value={fullName} onChange={setFullName} required />
        <Field label="nama bisnis" value={businessName} onChange={setBusinessName} required />
        <Field label="nama outlet" value={storeName} onChange={setStoreName} required />
        <Field label="email" value={email} onChange={setEmail} type="email" autoComplete="email" required />
        <Field label="password" value={password} onChange={setPassword} type="password" autoComplete="new-password" required />
        <Field label="konfirmasi password" value={confirmPassword} onChange={setConfirmPassword} type="password" autoComplete="new-password" required />
        {error && <p style={{ color: "#ff7d7d", marginBottom: 16, lineHeight: 1.5 }}>{error}</p>}
        {success && <p style={{ color: "#a8d5a2", marginBottom: 16, lineHeight: 1.5 }}>{success}</p>}
        <button disabled={loading} style={{ width: "100%", padding: 14, border: 0, borderRadius: 12, background: "#b99a62", color: "#111", fontWeight: 700, cursor: "pointer" }}>
          {loading ? "membuat akun..." : "daftar akun"}
        </button>
        <a href="/login" style={{ display: "block", textAlign: "center", marginTop: 16, color: "#b99a62", textDecoration: "none", fontSize: 14 }}>sudah punya akun? masuk</a>
      </form>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", autoComplete, required }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string; required?: boolean }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", marginBottom: 7, fontSize: 14 }}>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} type={type} autoComplete={autoComplete} required={required} style={{ width: "100%", padding: 13, borderRadius: 12, border: "1px solid #353b43", background: "#0f1114", color: "inherit" }} />
    </label>
  );
}
