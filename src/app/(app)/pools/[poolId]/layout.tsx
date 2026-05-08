// src/app/(app)/pools/[poolId]/layout.tsx
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PoolNav from './PoolNav'
import JoinPoolForm from './JoinPoolForm'

interface Props {
  children: React.ReactNode
  params: Promise<{ poolId: string }>
}

export default async function PoolLayout({ children, params }: Props) {
  const { poolId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: pool } = await supabase
    .from('pools')
    .select('id, name, welcome_message, member_count, invite_code')
    .eq('id', poolId)
    .single() as any

  if (!pool) notFound()

  const [{ data: isMember }, { data: isAdmin }, { data: profile }] = await Promise.all([
    supabase.from('pool_members').select('id').eq('pool_id', poolId).eq('user_id', user.id).maybeSingle(),
    supabase.from('pool_admins').select('id').eq('pool_id', poolId).eq('user_id', user.id).maybeSingle(),
    supabase.from('users').select('is_superadmin').eq('id', user.id).single(),
  ]) as any

  const isSuperAdmin = (profile as any)?.is_superadmin ?? false
  const hasAccess = !!isMember || !!isAdmin || isSuperAdmin

  if (!hasAccess) {
    return (
      <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <Link href="/dashboard" style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '10px' }}>
            ← Mis Pollas
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', letterSpacing: '0.05em', lineHeight: 1, marginBottom: '6px' }}>
            {pool.name.toUpperCase()}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            {pool.member_count} participante{pool.member_count !== 1 ? 's' : ''} inscritos
          </p>
        </div>

        {pool.welcome_message && (
          <div style={{ padding: '14px 18px', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', color: 'var(--color-text)', lineHeight: 1.6 }}>
            {pool.welcome_message}
          </div>
        )}

        <JoinPoolForm
          poolId={poolId}
          userId={user.id}
          inviteCode={pool.invite_code ?? ''}
        />
      </div>
    )
  }

  const canAdmin = !!isAdmin || isSuperAdmin

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <Link href="/dashboard" style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '10px' }}>
          ← Mis Pollas
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', letterSpacing: '0.05em', lineHeight: 1 }}>
          {pool.name.toUpperCase()}
        </h1>
      </div>
      <PoolNav poolId={poolId} canAdmin={canAdmin} />
      {children}
    </div>
  )
}
