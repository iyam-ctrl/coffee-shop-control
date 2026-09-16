"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  sku: string | null;
  selling_price: number;
  is_active: boolean;
  category_id: string | null;
  product_categories?: { name: string } | { name: string }[] | null;
};

const exampleProducts = [
  { name: "Espresso", sku: "ESP-001", selling_price: 18000, category: "Coffee" },
  { name: "Americano", sku: "AME-001", selling_price: 22000, category: "Coffee" },
  { name: "Cafe Latte", sku: "LAT-001", selling_price: 28000, category: "Coffee" },
  { name: "Cappuccino", sku: "CAP-001", selling_price: 28000, category: "Coffee" },
  { name: "Caramel Macchiato", sku: "MAC-001", selling_price: 32000, category: "Coffee" },
  { name: "Chocolate", sku: "CHO-001", selling_price: 26000, category: "Non Coffee" },
  { name: "Lemon Tea", sku: "TEA-001", selling_price: 18000, category: "Tea" },
];

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function categoryName(category: Product["product_categories"]) {
  return Array.isArray(category) ? category[0]?.name : category?.name;
}

export default function ProductsPage() {
  const [businessId, setBusinessId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [form, setForm] = useState({ name: "", sku: "", price: "", categoryId: "" });

  async function loadData() {
    setLoading(true);
    setError("");
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) {
      window.location.href = "/login";
      return;
    }

    const { data: memberships, error: memberError } = await supabase
      .from("business_members")
      .select("business_id, role")
      .eq("user_id", userId)
      .eq("is_active", true);

    const owner = memberships?.find((m) => String(m.role).toUpperCase() === "OWNER");
    if (memberError || !owner) {
      setError("akun ini belum memiliki akses owner.");
      setLoading(false);
      return;
    }

    setBusinessId(owner.business_id);

    const [categoryResult, productResult] = await Promise.all([
      supabase.from("product_categories").select("id, name").eq("business_id", owner.business_id).order("name"),
      supabase.from("products").select("id, name, sku, selling_price, is_active, category_id, product_categories(name)").eq("business_id", owner.business_id).order("name"),
    ]);

    if (categoryResult.error) setError(categoryResult.error.message);
    else setCategories(categoryResult.data ?? []);
    if (productResult.error) setError(productResult.error.message);
    else setProducts((productResult.data ?? []) as unknown as Product[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (!showInactive && !p.is_active) return false;
      if (!q) return true;
      return [p.name, p.sku ?? "", categoryName(p.product_categories) ?? ""].some((v) => v.toLowerCase().includes(q));
    });
  }, [products, search, showInactive]);

  async function addProduct(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    const price = Number(form.price);
    if (!form.name.trim() || !Number.isFinite(price) || price < 0) {
      setError("nama produk dan harga jual wajib diisi dengan benar.");
      setSaving(false); return;
    }
    const { error: insertError } = await supabase.from("products").insert({
      business_id: businessId,
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      selling_price: price,
      category_id: form.categoryId || null,
      is_active: true,
    });
    if (insertError) setError(insertError.message);
    else { setForm({ name: "", sku: "", price: "", categoryId: "" }); setMessage("produk berhasil ditambahkan."); await loadData(); }
    setSaving(false);
  }

  async function addCategory(event: FormEvent) {
    event.preventDefault();
    if (!newCategory.trim()) return;
    setSaving(true); setError("");
    const { error: insertError } = await supabase.from("product_categories").insert({ business_id: businessId, name: newCategory.trim() });
    if (insertError) setError(insertError.message);
    else { setNewCategory(""); setMessage("kategori berhasil ditambahkan."); await loadData(); }
    setSaving(false);
  }

  async function toggleProduct(product: Product) {
    setError(""); setMessage("");
    const { error: updateError } = await supabase.from("products").update({ is_active: !product.is_active }).eq("id", product.id).eq("business_id", businessId);
    if (updateError) setError(updateError.message);
    else { setMessage(product.is_active ? "produk dinonaktifkan." : "produk diaktifkan kembali."); await loadData(); }
  }

  async function seedExamples() {
    setSaving(true); setError(""); setMessage("");
    const categoryNames = [...new Set(exampleProducts.map((p) => p.category))];
    const existing = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
    for (const name of categoryNames) {
      if (!existing.has(name.toLowerCase())) {
        const { data, error: categoryError } = await supabase.from("product_categories").insert({ business_id: businessId, name }).select("id, name").single();
        if (categoryError) { setError(categoryError.message); setSaving(false); return; }
        if (data) existing.set(name.toLowerCase(), data.id);
      }
    }
    const existingSkus = new Set(products.map((p) => p.sku).filter(Boolean));
    const rows = exampleProducts.filter((p) => !existingSkus.has(p.sku)).map((p) => ({ business_id: businessId, name: p.name, sku: p.sku, selling_price: p.selling_price, category_id: existing.get(p.category.toLowerCase()) ?? null, is_active: true }));
    if (rows.length) {
      const { error: productError } = await supabase.from("products").insert(rows);
      if (productError) { setError(productError.message); setSaving(false); return; }
    }
    setMessage(rows.length ? `${rows.length} contoh produk berhasil dimasukkan.` : "contoh produk sudah ada.");
    await loadData();
    setSaving(false);
  }

  const activeCount = products.filter((p) => p.is_active).length;

  return (
    <main style={{ minHeight: "100vh", background: "#090b0d", color: "#f5f1e8", padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div>
            <p style={{ color: "#c5a66b", letterSpacing: 2, fontSize: 12 }}>MASTER DATA</p>
            <h1 style={{ margin: "6px 0" }}>produk & menu</h1>
            <p style={{ color: "#9299a3" }}>kelola menu yang nanti terhubung ke recipe, HPP, stok, dan transaksi.</p>
          </div>
          <button onClick={() => window.location.href = "/"} style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid #353b43", background: "#15181c", color: "#f5f1e8" }}>dashboard</button>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 20 }}>
          <article style={card}><span style={muted}>produk aktif</span><strong style={metric}>{activeCount}</strong></article>
          <article style={card}><span style={muted}>total produk</span><strong style={metric}>{products.length}</strong></article>
          <article style={card}><span style={muted}>kategori</span><strong style={metric}>{categories.length}</strong></article>
        </section>

        {message && <p style={{ ...notice, color: "#9fe2b0" }}>{message}</p>}
        {error && <p style={{ ...notice, color: "#ff8d8d" }}>{error}</p>}

        <section style={{ ...card, marginBottom: 18 }}>
          <div style={sectionHead}><div><h2>aksi cepat</h2><p style={muted}>mulai dari contoh atau isi data produk sendiri.</p></div><button onClick={seedExamples} disabled={saving || !businessId} style={primary}>{saving ? "memproses..." : "isi contoh produk"}</button></div>
          <p style={{ color: "#707782", lineHeight: 1.6, marginTop: 14 }}>contoh tidak akan menggandakan SKU yang sudah ada. data contoh nantinya bisa lu edit/nonaktifkan sesuai menu asli coffee shop.</p>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(280px,360px)", gap: 18, alignItems: "start" }}>
          <section style={card}>
            <div style={sectionHead}><div><h2>daftar produk</h2><p style={muted}>{visibleProducts.length} produk ditampilkan</p></div><label style={{ display: "flex", alignItems: "center", gap: 8, color: "#9299a3", fontSize: 13 }}><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> tampilkan nonaktif</label></div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="cari nama, SKU, kategori..." style={input} />
            {loading ? <p style={{ color: "#9299a3", padding: 24 }}>memuat...</p> : visibleProducts.length === 0 ? <div style={{ padding: 30, textAlign: "center", color: "#707782" }}>belum ada produk. lu bisa pakai tombol <b>isi contoh produk</b> atau tambah produk manual.</div> : (
              <div style={{ overflowX: "auto", marginTop: 12 }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650 }}><thead><tr>{["produk", "SKU", "kategori", "harga jual", "status", "aksi"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{visibleProducts.map((p) => <tr key={p.id}><td style={td}><b>{p.name}</b></td><td style={td}>{p.sku || "—"}</td><td style={td}>{categoryName(p.product_categories) || "Tanpa kategori"}</td><td style={td}>{rupiah(Number(p.selling_price))}</td><td style={td}><span style={{ ...badge, opacity: p.is_active ? 1 : 0.55 }}>{p.is_active ? "aktif" : "nonaktif"}</span></td><td style={td}><button onClick={() => toggleProduct(p)} style={smallButton}>{p.is_active ? "nonaktifkan" : "aktifkan"}</button></td></tr>)}</tbody></table></div>
            )}
          </section>

          <aside style={{ display: "grid", gap: 18 }}>
            <section style={card}><h2>tambah produk</h2><p style={{ ...muted, marginBottom: 16 }}>produk aktif bisa dipakai di transaksi setelah recipe dan inventory siap.</p><form onSubmit={addProduct} style={{ display: "grid", gap: 12 }}>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="nama produk" style={input} />
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU (opsional)" style={input} />
              <input required min="0" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="harga jual" style={input} />
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} style={input}><option value="">tanpa kategori</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <button disabled={saving || !businessId} style={primary}>{saving ? "menyimpan..." : "tambah produk"}</button>
            </form></section>

            <section style={card}><h2>kategori</h2><p style={{ ...muted, marginBottom: 14 }}>contoh: Coffee, Non Coffee, Tea, Food.</p><form onSubmit={addCategory} style={{ display: "flex", gap: 8 }}><input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="nama kategori" style={{ ...input, minWidth: 0 }} /><button disabled={saving} style={smallPrimary}>tambah</button></form><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>{categories.map((c) => <span key={c.id} style={badge}>{c.name}</span>)}</div></section>
          </aside>
        </div>
      </div>
    </main>
  );
}

const card = { padding: 20, borderRadius: 18, background: "#14171b", border: "1px solid #292e34" } as const;
const muted = { color: "#9299a3", fontSize: 13 } as const;
const metric = { display: "block", fontSize: 28, marginTop: 8 } as const;
const sectionHead = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" } as const;
const input = { width: "100%", padding: "12px 13px", borderRadius: 10, border: "1px solid #353b43", background: "#0d0f12", color: "#f5f1e8", outline: "none" } as const;
const primary = { padding: "12px 16px", border: 0, borderRadius: 10, background: "#c5a66b", color: "#111", fontWeight: 700, cursor: "pointer" } as const;
const smallPrimary = { ...primary, padding: "11px 13px" } as const;
const smallButton = { padding: "8px 10px", borderRadius: 8, border: "1px solid #353b43", background: "#1b1f24", color: "#f5f1e8", cursor: "pointer" } as const;
const notice = { padding: "12px 14px", borderRadius: 10, background: "#121519", border: "1px solid #292e34", marginBottom: 14 } as const;
const th = { textAlign: "left", padding: "12px 10px", borderBottom: "1px solid #292e34", color: "#9299a3", fontSize: 12 } as const;
const td = { padding: "13px 10px", borderBottom: "1px solid #20242a", fontSize: 13 } as const;
const badge = { display: "inline-flex", padding: "5px 8px", borderRadius: 999, border: "1px solid #365b43", color: "#b9d8c1", fontSize: 11 } as const;
