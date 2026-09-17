"use client";

import { FormEvent, useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function ManagerLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.user) {
      setError(signInError?.message ?? "email atau password salah.");
      setLoading(false);
      return;
    }

    // Registration stores the initial setup values in Auth user metadata.
    // If the account has not been bootstrapped yet (for example because
    // email confirmation was required), finish the setup automatically
    // on the first successful login.
    const metadata = data.user.user_metadata ?? {};
    const fullName = String(metadata.full_name ?? "").trim();
    const businessName = String(metadata.business_name ?? "").trim();
    const storeName = String(metadata.store_name ?? "").trim();

    if (fullName && businessName && storeName) {
      const { data: memberships, error: membershipError } = await supabase
        .from("business_members")
        .select("business_id, role, is_active")
        .eq("user_id", data.user.id)
        .eq("is_active", true);

      if (!membershipError && !(memberships ?? []).length) {
        const { error: bootstrapError } = await supabase.rpc("bootstrap_manager_account", {
          p_full_name: fullName,
          p_business_name: businessName,
          p_store_name: storeName,
        });

        if (bootstrapError) {
          await supabase.auth.signOut();
          setError("akun berhasil login, tetapi setup bisnis gagal. coba lagi.");
          setLoading(false);
          return;
        }
      }
    }

    window.location.href = "/";
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b0d0f", color: "#f5f1e8", padding: 24 }}>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 420, padding: 32, borderRadius: 24, background: "#15181c", border: "1px solid #292e34" }}>
        <p style={{ color: "#b99a62", letterSpacing: 2, fontSize: 12 }}>COFFEE SHOP CONTROL</p>
        <h1 style={{ margin: "8px 0 8px", fontSize: 32 }}>manager login</h1>
        <p style={{ color: "#9299a3", marginBottom: 28 }}>masuk ke sistem operasional toko.</p>

        <label style={{ display: "block", marginBottom: 16 }}>
          <span style={{ display: "block", marginBottom: 8 }}>email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="email" style={{ width: "100%", padding: 13, borderRadius: 12, border: "1px solid #353b43", background: "#0f1114", color: "inherit" }} />
        </label>

        <label style={{ display: "block", marginBottom: 18 }}>
          <span style={{ display: "block", marginBottom: 8 }}>password</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required autoComplete="current-password" style={{ width: "100%", padding: 13, borderRadius: 12, border: "1px solid #353b43", background: "#0f1114", color: "inherit" }} />
        </label>

        {error && <p style={{ color: "#ff7d7d", marginBottom: 16 }}>{error}</p>}

        <button disabled={loading} style={{ width: "100%", padding: 14, border: 0, borderRadius: 12, background: "#b99a62", color: "#111", fontWeight: 700, cursor: "pointer" }}>
          {loading ? "memproses..." : "masuk"}
        </button>

        <a href="/register" style={{ display: "block", textAlign: "center", marginTop: 16, color: "#b99a62", textDecoration: "none", fontSize: 14 }}>
          belum punya akun? daftar akun
        </a>
      </form>
    </main>
  );
}
