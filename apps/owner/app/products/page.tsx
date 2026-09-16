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

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: memberships } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", user.id)
    .eq("role", "OWNER")
    .limit(1);

  const businessId = memberships?.[0]?.business_id;
  if (!businessId) redirect("/");

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("id,name,sku,selling_price,is_active,category_id,product_categories(name)")
      .eq("business_id", businessId)
      .order("name"),
    supabase
      .from("product_categories")
      .select("id,name,is_active")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("name"),
  ]);

  const productRows = (products ?? []) as Product[];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-emerald-400">owner control</p>
            <h1 className="text-3xl font-semibold">products</h1>
            <p className="mt-1 text-sm text-slate-400">kelola menu dan harga produk.</p>
          </div>
          <Link href="/" className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900">
            dashboard
          </Link>
        </div>

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">total produk</p>
            <p className="mt-2 text-3xl font-semibold">{productRows.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">produk aktif</p>
            <p className="mt-2 text-3xl font-semibold">{productRows.filter((product) => product.is_active).length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">kategori aktif</p>
            <p className="mt-2 text-3xl font-semibold">{categories?.length ?? 0}</p>
          </div>
        </section>

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
                    <td className="px-5 py-4">
                      <p className="font-medium">{product.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{profile?.full_name ?? "owner"}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{product.sku ?? "-"}</td>
                    <td className="px-5 py-4 text-slate-400">{categoryName(product.product_categories) ?? "-"}</td>
                    <td className="px-5 py-4">Rp {Number(product.selling_price).toLocaleString("id-ID")}</td>
                    <td className="px-5 py-4">
                      <span className={product.is_active ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300" : "rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-300"}>
                        {product.is_active ? "aktif" : "nonaktif"}
                      </span>
                    </td>
                  </tr>
                ))}
                {!productRows.length && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-500">belum ada produk.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
