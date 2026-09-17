# COFFEE SHOP CONTROL

sistem kontrol operasional coffee shop dengan tiga aplikasi yang memakai satu backend dan satu sumber data.

## arsitektur

```text
COFFEE SHOP CONTROL
├── Owner App
├── Manager App
├── Cashier App
└── Shared Backend / Supabase
    └── PostgreSQL + Auth + RLS
```

## tujuan

bukan cuma mengetahui berapa yang terjual, tetapi membantu owner melihat hubungan antara penjualan, resep, HPP, persediaan, waste, kas, dan profit.

## apps

- `apps/owner` — kontrol bisnis: dashboard, produk, ingredients, recipes, inventory, stock opname, pengeluaran, sales control, dan laporan.
- `apps/manager` — operasional toko sehari-hari: outlet, shift, kas, setoran, dan rekonsiliasi.
- `apps/cashier` — POS transaksi: pilih produk, keranjang, pembayaran, kembalian, dan riwayat transaksi.

ketiga aplikasi menggunakan database Supabase yang sama sehingga transaksi kasir menjadi sumber data operasional manager dan laporan owner.

## shared packages

- `packages/ui` — komponen shell dan navigasi UI bersama.
- `packages/auth` — autentikasi dan session.
- `packages/database` — Supabase client dan database types.
- `packages/business` — business rules.
- `packages/types` — shared domain types.

## backend

Supabase project: `coffee-shop-control`.

database foundation: migration `20260916155409_initial_schema_v0_1`.

core database flow:

```text
kasir
  ↓
record_sale RPC
  ↓
sale + sale_items + payment
  ↓
recipe → HPP snapshot + inventory consumption
  ↓
shift / cash deposit / reconciliation
  ↓
manager monitoring
  ↓
owner reporting
```

## responsive UI

seluruh workspace memakai pola responsive yang sama:

- desktop: sidebar + dashboard workspace.
- tablet: layout workspace yang menyempit tanpa menghilangkan fungsi utama.
- mobile: topbar, drawer menu, dan bottom navigation untuk akses cepat.
- visual: light professional UI dengan navy/blue/teal, tanpa gold sebagai warna utama.

## environment

aplikasi membutuhkan:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

jangan menaruh `service_role` atau secret key di browser/client app.

## local development

prasyarat: Node.js 22 dan pnpm 10.15.1.

```bash
pnpm install
pnpm dev:manager
```

manager berjalan di port `3000`.

```bash
pnpm dev:owner
```

owner berjalan di port `3001`.

```bash
pnpm dev:cashier
```

cashier berjalan di port `3002`.

build semua workspace:

```bash
pnpm build
```

## security

semua tabel bisnis utama memakai RLS. client role hanya menerima grant yang dibutuhkan, sementara operasi transaksi penting memakai database function/RPC dengan pemeriksaan autentikasi dan membership.

## status

operational foundation sudah mencakup auth, role routing, multi-outlet foundation, dashboard owner berbasis data nyata, HPP snapshot, inventory receipt/waste, stock opname, POS cashier, shift, cash deposit, reconciliation, dan monitoring manager.

UI sekarang diarahkan ke satu design system profesional yang konsisten untuk desktop, tablet, dan mobile tanpa mengganti database atau memulai ulang project.
