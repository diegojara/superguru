// src/app/(app)/admin/layout.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AdminNav from './AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_superadmin) redirect('/dashboard')

  // Notificaciones no leídas
  const { count } = await supabase
    .from('admin_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-gold)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Panel SuperAdmin
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
            letterSpacing: '0.05em',
            lineHeight: 1,
          }}>
            ADMINISTRACIÓN
          </h1>
        </div>
      </div>

      <AdminNav unreadNotifications={count ?? 0} />

      {children}
    </div>
  )
}
