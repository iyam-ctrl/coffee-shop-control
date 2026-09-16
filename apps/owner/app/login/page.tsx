"use client";

import { FormEvent, useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function OwnerLoginPage() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) { setError("email atau password salah."); setLoading(false); return; }
    window.location.href = "/";
  }
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#08090b", color: "#f5f1e8", padding: 24 }}><form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 440, padding: 34, borderRadius: 24, background: "#14171b", border: "1px solid #2b3037" }}><p style={{ color: "#c5a66b", letterSpacing: 2, fontSize: 12 }}>COFFEE SHOP CONTROL</p><h1 style={{ margin: "8px 0" }}>owner login</h1><p style={{ color: "#9299a3", marginBottom: 28 }}>kontrol bisnis, profit, stok, dan laporan.</p><label style={{ display: "block", marginBottom: 16 }}><span style={{ display: "block", marginBottom: 8 }}>email</span><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="email" style={{ width: "100%", padding: 13, borderRadius: 12, border: "1px solid #353b43", background: "#0e1013", color: "inherit" }} /></label><label style={{ display: "block", marginBottom: 18 }}><span style={{ display: "block", marginBottom: 8 }}>password</span><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required autoComplete="current-password" style={{ width: "100%", padding: 13, borderRadius: 12, border: "1px solid #353b43", background: "#0e1013", color: "inherit" }} /></label>{error && <p style={{ color: "#ff7d7d", marginBottom: 16 }}>{error}</p>}<button disabled={loading} style={{ width: "100%", padding: 14, border: 0, borderRadius: 12, background: "#c5a66b", color: "#111", fontWeight: 700 }}>{loading ? "memproses..." : "masuk"}</button></form></main>;
}
