'use client'
// src/app/(app)/admin/notifications/NotificationsClient.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  pool_id: string
  message: string
  is_read: boolean
  created_at: string
  pools: { name: string } | null
  users: { full_name: string; email: string } | null
}

export default function NotificationsClient({ notifications }: { notifications: Notification[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [marking, setMarking] = useState<Record<string, boolean>>({})

  async function markRead(id: string) {
    setMarking(prev => ({ ...prev, [id]: true }))
    await supabase.from('admin_notifications').update({ is_read: true }).eq('id', id)
    router.refresh()
  }

  async function markAllRead() {
    await supabase.from('admin_notifications').update({ is_read: true }).eq('is_read', false)
    router.refresh()
  }

  const unread = notifications.filter(n => !n.is_read)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {unread.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={markAllRead} style={{ fontSize: '0.8125rem' }}>
            Marcar todas como leídas
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          No hay notificaciones aún.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notifications.map(n => (
            <div
              key={n.id}
              style={{
                background: n.is_read ? 'var(--color-bg-card)' : 'var(--color-bg-elevated)',
                border: `1px solid ${n.is_read ? 'var(--color-border)' : 'rgba(245, 158, 11, 0.2)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div style={{ flex: 1 }}>
                {!n.is_read && (
                  <span style={{
                    display: 'inline-block',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--color-gold)',
                    marginRight: '8px',
                    verticalAlign: 'middle',
                    marginTop: '-2px',
                  }} />
                )}
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>{n.message}</span>
                <div style={{ marginTop: '6px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {n.pools && (
                    <Link href={`/pools/${n.pool_id}`} style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-green)',
                      textDecoration: 'none',
                    }}>
                      Ver Polla →
                    </Link>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {new Date(n.created_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
                  </span>
                </div>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => markRead(n.id)}
                  disabled={marking[n.id]}
                  style={{
                    flexShrink: 0,
                    padding: '4px 10px',
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  {marking[n.id] ? '…' : 'Leída'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
