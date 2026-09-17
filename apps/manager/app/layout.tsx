import type { Metadata } from 'next'
import { AppShell } from '@coffee-shop/ui'
import './globals.css'

export const metadata: Metadata = {
  title: 'Coffee Shop Control — Manager',
  description: 'Operasional coffee shop untuk manager.',
}

const navItems = [
  { label: 'Dashboard', href: '/', description: 'ringkasan operasional' },
  { label: 'Outlet', href: '/outlet', description: 'kontrol toko' },
  { label: 'Inventory', href: '/inventory', description: 'stok & penerimaan' },
  { label: 'Ingredients', href: '/ingredients', description: 'bahan & biaya' },
  { label: 'Recipes', href: '/recipes', description: 'resep & HPP' },
  { label: 'Stock Opname', href: '/stock-opname', description: 'hitung fisik' },
  { label: 'Shift', href: '/shift', description: 'shift operasional' },
  { label: 'Kas & Setoran', href: '/cash', description: 'rekonsiliasi kas' },
  { label: 'Laporan', href: '/reports', description: 'monitoring bisnis' },
]

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <AppShell appName="manager workspace" appLabel="MANAGER" navItems={navItems}>
          {children}
        </AppShell>
      </body>
    </html>
  )
}
