'use client'
// src/app/(app)/AppHeader.tsx

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface AppHeaderProps {
  fullName: string
  isSuperAdmin: boolean
}

export default function AppHeader({ fullName, isSuperAdmin }: AppHeaderProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)
  const [menuOpen, setMenuOpen]     = useState(false)

  async function handleLogOut() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(10, 14, 10, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--color-border)',
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '0 16px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}>

        {/* Logo */}
        <Link href="/dashboard" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.4rem',
            letterSpacing: '0.05em',
            color: 'var(--color-text)',
          }}>
            SUPER<span style={{ color: 'var(--color-green)' }}>GURÚ</span>
          </span>
        </Link>

        {/* Nav central — desktop */}
        <nav style={{
          display: 'flex',
          gap: '4px',
          flex: 1,
          justifyContent: 'center',
        }}>
          <NavLink href="/dashboard" active={pathname === '/dashboard'}>
            Mis Pollas
          </NavLink>
          {isSuperAdmin && (
            <NavLink href="/admin" active={pathname.startsWith('/admin')}>
              Admin
            </NavLink>
          )}
        </nav>

        {/* Derecha: avatar + log off */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>

          {/* Avatar con inicial */}
          <div
            title={fullName}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'var(--color-green-deep)',
              border: '1.5px solid var(--color-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-green)',
              letterSpacing: '0.05em',
              cursor: 'default',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          {/* Botón Log Off — siempre visible */}
          <button
            onClick={handleLogOut}
            disabled={loggingOut}
            style={{
              padding: '6px 14px',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.8125rem',
              cursor: loggingOut ? 'not-allowed' : 'pointer',
              transition: 'color 0.2s, border-color 0.2s',
              opacity: loggingOut ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              if (!loggingOut) {
                (e.target as HTMLButtonElement).style.color = 'var(--color-error)'
                ;(e.target as HTMLButtonElement).style.borderColor = 'rgba(239, 68, 68, 0.4)'
              }
            }}
            onMouseLeave={e => {
              ;(e.target as HTMLButtonElement).style.color = 'var(--color-text-muted)'
              ;(e.target as HTMLButtonElement).style.borderColor = 'var(--color-border)'
            }}
          >
            {loggingOut ? 'Saliendo…' : 'Log Off'}
          </button>
        </div>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// NavLink helper
// ---------------------------------------------------------------------------
function NavLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      style={{
        padding: '6px 14px',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.875rem',
        fontWeight: active ? 500 : 400,
        color: active ? 'var(--color-green)' : 'var(--color-text-muted)',
        background: active ? 'var(--color-green-deep)' : 'transparent',
        border: active ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid transparent',
        textDecoration: 'none',
        transition: 'color 0.2s, background 0.2s',
      }}
    >
      {children}
    </Link>
  )
}
