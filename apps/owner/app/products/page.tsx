import Link from "next/link";
import { createClient } from "@coffee-shop/auth/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  selling_price: number;
  is_active: boolean;
  category_id: string | null;
  product_categories?: { name: string } | { name: string }[] | null;
};

function categoryName(category: Product["product_categories"]) {
  return Array.isArray(category) ? category[0]?.name : category?.name;
}

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("role", "OWNER")
    .limit(1)
    .maybeSingle();

  if (!membership?.business_id) redirect("/");

  const businessId = membership.business_id;
  const { data: products } = await supabase
    .from("products")
    .select("id,name,sku,selling_price,is_active,category_id,product_categories(name)")
    .eq("business_id", businessId)
    .order("name");

  const productRows: Product[] = (products ?? []).map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    selling_price: Number(product.selling_price),
    is_active: product.is_active,
    category_id: product.category_id,
    product_categories: product.product_categories as Product["product_categories"],
  }));

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-emerald-400">owner control</p>
            <h1 className="text-3xl font-semibold">products</h1>
          </div>
          <Link href="/" className="rounded-xl border border-slate-700 px-4 py-2 text-sm">dashboard</Link>
        </div>
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="px-5 py-4 font-medium">produk</th>
                  <th className="px-5 py-4 font-medium">sku</th>
                  <th className="px-5 py-4 font-medium">kategori</th>
                  <th className="px-5 py-4 font-medium">harga jual</th>
                  <th className="px-5 py-4 font-medium">status</th>
                </tr>
              </thead>
              <tbody>
                {productRows.map((product) => (
                  <tr key={product.id} className="border-b border-slate-800/70 last:border-0">
                    <td className="px-5 py-4 font-medium">{product.name}</td>
                    <td className="px-5 py-4 text-slate-400">{product.sku ?? "-"}</td>
                    <td className="px-5 py-4 text-slate-400">{categoryName(product.product_categories) ?? "-"}</td>
                    <td className="px-5 py-4">Rp {Number(product.selling_price).toLocaleString("id-ID")}</td>
                    <td className="px-5 py-4">{product.is_active ? "aktif" : "nonaktif"}</td>
                  </tr>
                ))}
                {!productRows.length && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">belum ada produk.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
