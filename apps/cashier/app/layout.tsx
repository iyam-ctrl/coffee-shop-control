import type { Metadata } from 'next'
import { AppShell } from '@coffee-shop/ui'
import './globals.css'

export const metadata: Metadata = { title: 'Coffee Shop Control — Cashier', description: 'Kasir coffee shop.' }

const navItems = [
  { label: 'Dashboard', href: '/', description: 'status shift & kas' },
  { label: 'Kasir', href: '/sales', description: 'transaksi penjualan' },
  { label: 'Riwayat', href: '/history', description: 'transaksi outlet' },
  { label: 'Shift', href: '/shift', description: 'buka & tutup shift' },
]

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body><AppShell appName="cashier workspace" appLabel="CASHIER" navItems={navItems}>{children}</AppShell></body></html>
}
