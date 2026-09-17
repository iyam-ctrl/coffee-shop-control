import type { Metadata } from 'next'
import { AppShell } from '@coffee-shop/ui'
import './globals.css'

export const metadata: Metadata = {
  title: 'Coffee Shop Control — Owner',
  description: 'Kontrol bisnis coffee shop untuk owner.',
}

const navItems = [
  { label: 'Dashboard', href: '/', description: 'overview semua outlet' },
  { label: 'Outlet', href: '/outlet', description: 'cabang & performa' },
  { label: 'Produk & Menu', href: '/products', description: 'harga & katalog' },
  { label: 'Ingredients', href: '/ingredients', description: 'cost bahan' },
  { label: 'Recipes', href: '/recipes', description: 'HPP & margin' },
  { label: 'Inventory', href: '/inventory', description: 'stok & pergerakan' },
  { label: 'Stock Opname', href: '/stock-opname', description: 'variance stok' },
  { label: 'Laporan', href: '/reports', description: 'profit & kontrol' },
]

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <AppShell appName="owner workspace" appLabel="OWNER" navItems={navItems}>
          {children}
        </AppShell>
      </body>
    </html>
  )
}
