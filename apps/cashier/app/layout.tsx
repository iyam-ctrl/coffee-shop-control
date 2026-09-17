import type { Metadata } from 'next'
import { AppShell } from '@coffee-shop/ui'
import './globals.css'
export const metadata: Metadata={title:'Coffee Shop Control — Cashier',description:'Aplikasi transaksi kasir coffee shop.'}
const navItems=[{label:'Kasir',href:'/',description:'transaksi penjualan'},{label:'Riwayat',href:'/history',description:'transaksi terbaru'}]
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="id"><body><AppShell appName="cashier workspace" appLabel="CASHIER" navItems={navItems}>{children}</AppShell></body></html>}
