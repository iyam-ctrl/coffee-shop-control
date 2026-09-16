"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function createBusiness(formData: FormData) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub as string | undefined;

  if (!userId) redirect("/login");

  const businessName = clean(formData.get("business_name"));
  const storeName = clean(formData.get("store_name"));
  const storeCode = clean(formData.get("store_code")).toUpperCase();
  const address = clean(formData.get("address"));
  const phone = clean(formData.get("phone"));

  if (!businessName || !storeName || !storeCode) {
    redirect("/setup?error=lengkapi-nama-bisnis-toko-dan-kode-toko");
  }

  const { data: existingMemberships, error: membershipError } = await supabase
    .from("business_members")
    .select("business_id, role, is_active")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (membershipError) {
    redirect("/setup?error=gagal-memeriksa-membership");
  }

  if (existingMemberships?.some((item) => String(item.role).toUpperCase() === "OWNER")) {
    redirect("/");
  }

  if (existingMemberships?.length) {
    redirect("/not-authorized");
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .insert({
      name: businessName,
      owner_user_id: userId,
    })
    .select("id")
    .single();

  if (businessError || !business) {
    redirect("/setup?error=gagal-membuat-bisnis");
  }

  const { error: ownerError } = await supabase.from("business_members").insert({
    business_id: business.id,
    user_id: userId,
    role: "OWNER",
    is_active: true,
  });

  if (ownerError) {
    redirect("/setup?error=gagal-membuat-owner");
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .insert({
      business_id: business.id,
      name: storeName,
      code: storeCode,
      address: address || null,
      phone: phone || null,
      is_active: true,
    })
    .select("id")
    .single();

  if (storeError || !store) {
    redirect("/setup?error=gagal-membuat-toko");
  }

  const { error: storeMemberError } = await supabase.from("store_members").insert({
    store_id: store.id,
    user_id: userId,
  });

  if (storeMemberError) {
    redirect("/setup?error=gagal-menghubungkan-owner-ke-toko");
  }

  redirect("/");
}
