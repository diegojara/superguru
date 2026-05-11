'use client'
// src/app/(app)/pools/[poolId]/PoolNav.tsx

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  poolId: string
  canAdmin: boolean
}

export default function PoolNav({ poolId, canAdmin }: Props) {
  const pathname = usePathname()
  const base = `/pools/${poolId}`

  const tabs = [
    { href: `${base}/predictions`,     label: 'Pronósticos' },
    { href: `${base}/leaderboard`,     label: 'Posiciones' },
    ...(canAdmin ? [{ href: `${base}/settings`, label: 'Configuración' }] : []),
  ]

  return (
    <nav style={{
      display: 'flex',
      gap: '4px',
      borderBottom: '1px solid var(--color-border)',
      paddingBottom: '0',
      overflowX: 'auto',
    }}>
      {tabs.map(tab => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              padding: '8px 16px',
              fontSize: '0.875rem',
              fontWeight: active ? 600 : 400,
              color: active ? 'var(--color-green)' : 'var(--color-text-muted)',
              textDecoration: 'none',
              borderBottom: active ? '2px solid var(--color-green)' : '2px solid transparent',
              marginBottom: '-1px',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
