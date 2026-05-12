'use client'
// src/app/(app)/admin/AdminNav.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminNav({ unreadNotifications }: { unreadNotifications: number }) {
  const pathname = usePathname()

  const tabs = [
    { href: '/admin',               label: 'Resumen' },
    { href: '/admin/matches',       label: 'Marcadores' },
    { href: '/admin/scoring',       label: 'Puntuación' },
    { href: '/admin/notifications', label: 'Notificaciones', badge: unreadNotifications },
  ]

  return (
    <nav style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--color-border)', overflowX: 'auto' }}>
      {tabs.map(tab => {
        const active = tab.href === '/admin' ? pathname === '/admin' : pathname.startsWith(tab.href)
        return (
          <Link key={tab.href} href={tab.href} style={{
            padding: '8px 16px',
            fontSize: '0.875rem',
            fontWeight: active ? 600 : 400,
            color: active ? 'var(--color-gold)' : 'var(--color-text-muted)',
            textDecoration: 'none',
            borderBottom: active ? '2px solid var(--color-gold)' : '2px solid transparent',
            marginBottom: '-1px',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'color 0.15s',
            scrollbarWidth: 'none',
          }}>
            {tab.label}
            {tab.badge ? (
              <span style={{
                background: 'var(--color-gold)',
                color: '#000',
                borderRadius: '99px',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '1px 6px',
                lineHeight: 1.4,
              }}>
                {tab.badge}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
