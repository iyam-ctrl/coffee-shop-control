'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export type AppNavItem = {
  label: string
  href: string
  description?: string
}

export type AppShellProps = {
  appName: string
  appLabel: string
  navItems: AppNavItem[]
  children: React.ReactNode
}

export function AppShell({ appName, appLabel, navItems, children }: AppShellProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const authPage = ['/login', '/register', '/setup'].some((path) => pathname === path || pathname.startsWith(`${path}/`))

  useEffect(() => setOpen(false), [pathname])

  if (authPage) return <>{children}</>

  return (
    <div className="app-shell">
      <header className="mobile-topbar">
        <button className="menu-button" type="button" onClick={() => setOpen((value) => !value)} aria-label="buka menu">
          <span /><span /><span />
        </button>
        <div>
          <p className="brand-kicker">COFFEE SHOP CONTROL</p>
          <strong>{appName}</strong>
        </div>
        <a className="mobile-logout" href="/auth/signout">keluar</a>
      </header>

      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">CSC</div>
          <div>
            <p className="brand-kicker">COFFEE SHOP</p>
            <strong>CONTROL</strong>
          </div>
        </div>
        <div className="app-badge">
          <span>{appLabel}</span>
          <small>workspace aktif</small>
        </div>
        <nav className="side-nav" aria-label="navigasi utama">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`))
            return (
              <a key={item.href} href={item.href} className={`nav-item ${active ? 'nav-item-active' : ''}`}>
                <span className="nav-dot" />
                <span>
                  <strong>{item.label}</strong>
                  {item.description && <small>{item.description}</small>}
                </span>
              </a>
            )
          })}
        </nav>
        <div className="sidebar-bottom">
          <a className="account-card" href="/settings">
            <span className="avatar">A</span>
            <span><strong>Akun & pengaturan</strong><small>profil dan akses</small></span>
          </a>
          <a className="logout-link" href="/auth/signout">keluar dari sistem</a>
        </div>
      </aside>

      {open && <button className="drawer-backdrop" type="button" aria-label="tutup menu" onClick={() => setOpen(false)} />}
      <main className="app-content">
        <div className="content-head">
          <div>
            <p className="brand-kicker">{appLabel}</p>
            <h1>{appName}</h1>
          </div>
          <div className="desktop-actions">
            <a className="header-action" href="/settings">pengaturan</a>
            <a className="header-action header-action-primary" href="/auth/signout">keluar</a>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
