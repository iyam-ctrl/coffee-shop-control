# COFFEE SHOP CONTROL

sistem kontrol operasional coffee shop dengan dua aplikasi yang memakai satu backend dan satu sumber data.

## arsitektur

```text
COFFEE SHOP CONTROL
├── Manager App
├── Owner App
└── Shared Backend / Supabase
    └── PostgreSQL + Auth + RLS
```

## tujuan

bukan cuma mengetahui berapa yang terjual, tetapi membantu owner melihat hubungan antara penjualan, resep, HPP, persediaan, waste, kas, dan profit.

## apps

- `apps/manager` — operasional toko sehari-hari: penjualan, shift, kas & setoran.
- `apps/owner` — kontrol bisnis, inventory, laporan, HPP, profit, dan monitoring.

## shared packages

- `packages/ui` — komponen UI bersama.
- `packages/auth` — autentikasi dan session.
- `packages/database` — Supabase client dan database types.
- `packages/business` — business rules.
- `packages/types` — shared domain types.

## backend

Supabase project: `coffee-shop-control`.

database foundation: migration `20260916155409_initial_schema_v0_1`.

core database flow:

```text
sale
  ↓
recipe
  ↓
HPP snapshot + inventory consumption
  ↓
cash/payment
  ↓
deposit + shift reconciliation
  ↓
owner reporting
```

## environment

manager dan owner membutuhkan:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

jangan menaruh `service_role` atau secret key di browser/client app.

## local development

prasyarat: Node.js 20 dan pnpm 10.15.0.

```bash
pnpm install
pnpm dev:manager
```

manager berjalan di port `3000`.

```bash
pnpm dev:owner
```

owner berjalan di port `3001`.

build semua workspace:

```bash
pnpm build
```

## security

semua tabel bisnis utama memakai RLS. client role hanya menerima grant yang dibutuhkan, sementara operasi transaksi penting memakai database function/RPC dengan pemeriksaan autentikasi dan membership.

## status

v0.1 operational foundation:

- auth dan role routing
- multi-outlet foundation
- owner dashboard berbasis data nyata
- HPP snapshot pada transaksi
- inventory receipt dan waste
- stock opname + finalisasi
- manager sales
- shift open/close
- cash deposit + reconciliation
- manager operational dashboard
- owner business reports
- least-privilege client grants
- GitHub Actions build verification

fitur berikutnya bisa ditambahkan setelah build dan alur utama tervalidasi di environment deployment.
