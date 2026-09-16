# COFFEE SHOP CONTROL

Sistem kontrol operasional coffee shop dengan dua aplikasi yang memakai satu backend dan satu sumber data.

## Arsitektur

```text
COFFEE SHOP CONTROL
├── Manager App
├── Owner App
└── Shared Backend / Supabase
    └── PostgreSQL + Auth + Storage + RLS
```

## Tujuan

Bukan cuma mengetahui berapa yang terjual, tetapi membantu owner melihat hubungan antara penjualan, resep, HPP, persediaan, waste, kas, dan profit.

## Apps

- `apps/manager` — operasional toko sehari-hari.
- `apps/owner` — kontrol bisnis, laporan, analitik, dan monitoring.

## Shared packages

- `packages/ui` — komponen UI bersama.
- `packages/auth` — autentikasi dan session.
- `packages/database` — Supabase client dan database types.
- `packages/business` — business rules.
- `packages/types` — shared domain types.

## Backend

Supabase project: `coffee-shop-control`

Database foundation: migration `20260916155409_initial_schema_v0_1`.

## Status

Foundation v0.1 — repository dan database sudah dipisahkan dengan jelas. Fitur aplikasi dibangun bertahap setelah pondasi ini stabil.
