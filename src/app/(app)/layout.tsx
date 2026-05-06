// src/app/(app)/layout.tsx
// Layout compartido para todas las rutas protegidas.
// Incluye el header con navegación y el botón de Log Off siempre visible.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppHeader from './AppHeader'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Cargar perfil del usuario (para saber si es SuperAdmin)
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, is_superadmin')
    .eq('id', user.id)
    .single()

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppHeader
        fullName={profile?.full_name ?? ''}
        isSuperAdmin={profile?.is_superadmin ?? false}
      />
      <main style={{
        flex: 1,
        maxWidth: '900px',
        width: '100%',
        margin: '0 auto',
        padding: '32px 16px 64px',
      }}>
        {children}
      </main>
    </div>
  )
}
