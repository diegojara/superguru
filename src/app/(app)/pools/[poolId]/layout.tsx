// src/app/(app)/pools/[poolId]/layout.tsx
// Layout de la Polla: verifica acceso y provee navegación interna.

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PoolNav from './PoolNav'

interface Props {
  children: React.ReactNode
  params: Promise<{ poolId: string }>
}

export default async function PoolLayout({ children, params }: Props) {
  const { poolId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verificar que la Polla existe
  const { data: pool } = await supabase
    .from('pools')
    .select('id, name')
    .eq('id', poolId)
    .single() as { data: { id: string; name: string } | null }

  if (!pool) notFound()

  // Verificar que el usuario tiene acceso (miembro o admin o superadmin)
  const [{ data: isMember }, { data: isAdmin }, { data: profileData }] = await Promise.all([
    supabase.from('pool_members').select('id').eq('pool_id', poolId).eq('user_id', user.id).maybeSingle(),
    supabase.from('pool_admins').select('id').eq('pool_id', poolId).eq('user_id', user.id).maybeSingle(),
    supabase.from('users').select('is_superadmin').eq('id', user.id).single() as Promise<{ data: { is_superadmin: boolean } | null, error: unknown }>,
  ])

  const isSuperAdmin = (profileData as { is_superadmin: boolean } | null)?.is_superadmin ?? false
  const hasAccess = !!isMember || !!isAdmin || isSuperAdmin
  if (!hasAccess) redirect('/dashboard')

  const canAdmin = !!isAdmin || isSuperAdmin

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Nombre de la Polla + breadcrumb */}
      <div>
        <Link
          href="/dashboard"
          style={{
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            marginBottom: '10px',
          }}
        >
          ← Mis Pollas
        </Link>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
          letterSpacing: '0.05em',
          lineHeight: 1,
        }}>
          {pool.name.toUpperCase()}
        </h1>
      </div>

      {/* Navegación interna de la Polla */}
      <PoolNav poolId={poolId} canAdmin={canAdmin} />

      {/* Contenido de la sub-ruta */}
      {children}
    </div>
  )
}
