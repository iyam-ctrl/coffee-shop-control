import type { Metadata } from 'next'
import { AppShell } from '@coffee-shop/ui'
import './globals.css'

export const metadata: Metadata = { title: 'Coffee Shop Control — Manager', description: 'Operasional coffee shop untuk manager.' }
const navItems = [
  { label: 'Dashboard', href: '/', description: 'ringkasan operasional' },
  { label: 'Outlet & Bisnis', href: '/setup', description: 'konfigurasi outlet' },
  { label: 'Shift', href: '/shift', description: 'kontrol shift operasional' },
  { label: 'Kas & Setoran', href: '/cash', description: 'rekonsiliasi kas outlet' },
]
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body><AppShell appName="manager workspace" appLabel="MANAGER" navItems={navItems}>{children}</AppShell></body></html>
}
