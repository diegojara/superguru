// src/app/(app)/dashboard/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import JoinByLinkButton from './JoinByLinkButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberRows } = await supabase
    .from('pool_members')
    .select('id, display_name, pool_id, pools(*)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false }) as any

  const { data: adminRows } = await supabase
    .from('pool_admins')
    .select('pool_id, pools(*)')
    .eq('user_id', user.id) as any

  const memberPoolIds = new Set(((memberRows as any[]) ?? []).map((m: any) => m.pool_id))
  const adminOnlyRows = ((adminRows as any[]) ?? []).filter((a: any) => !memberPoolIds.has(a.pool_id))

  const poolMemberIds = ((memberRows as any[]) ?? []).map((m: any) => m.id)
  const allPoolIds    = [...memberPoolIds] as string[]

  const [{ data: myScores }, { data: allLeaderboard }] = await Promise.all([
    poolMemberIds.length > 0
      ? supabase.from('leaderboard_by_pool').select('pool_id, pool_member_id, total_points').in('pool_member_id', poolMemberIds)
      : Promise.resolve({ data: [] as any[] }),
    allPoolIds.length > 0
      ? supabase.from('leaderboard_by_pool').select('pool_id, pool_member_id, total_points').in('pool_id', allPoolIds)
      : Promise.resolve({ data: [] as any[] }),
  ]) as any[]

  function getStanding(poolMemberId: string, poolId: string): { pos: number; total: number } {
    const myPts   = ((myScores as any[]) ?? []).find((s: any) => s.pool_member_id === poolMemberId)?.total_points ?? 0
    const entries = ((allLeaderboard as any[]) ?? []).filter((e: any) => e.pool_id === poolId)
    const total   = entries.length
    const pos     = entries.filter((e: any) => e.total_points > myPts).length + 1
    return { pos, total }
  }

  const now = new Date().toISOString()
  const { data: systemMessages } = await supabase
    .from('system_messages')
    .select('id, content, is_pinned')
    .or(`is_pinned.eq.true,expires_at.gt.${now}`)
    .order('is_pinned', { ascending: false })
    .limit(3) as any

  const hasPools = ((memberRows as any[]) ?? []).length > 0 || adminOnlyRows.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {systemMessages && (systemMessages as any[]).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(systemMessages as any[]).map((msg: any) => (
            <div key={msg.id} style={{ padding: '10px 14px', background: 'var(--color-green-deep)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--color-text)', display: 'flex', gap: '8px' }}>
              <span>📢</span><span>{msg.content}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', letterSpacing: '0.05em', lineHeight: 1 }}>
          MIS POLLAS
        </h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <JoinByLinkButton />
          <Link href="/pools/new" style={{ textDecoration: 'none' }}>
            <button style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 18px', background: 'var(--color-green)', color: '#052e16',
              border: 'none', borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
            }}>
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span>
              Nueva Polla
            </button>
          </Link>
        </div>
      </div>

      {!hasPools ? (
        <EmptyState />
      ) : (
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 88px', padding: '11px 20px', background: 'var(--color-green-dim)', gap: '8px' }}>
            {[{ label: 'Polla', align: 'left' }, { label: 'Puntos', align: 'center' }, { label: 'Posición', align: 'center' }].map(h => (
              <span key={h.label} style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#dcfce7', textAlign: h.align as any, letterSpacing: '0.03em' }}>{h.label}</span>
            ))}
          </div>

          {((memberRows as any[]) ?? []).map((entry: any, i: number) => {
            const pool = entry.pools
            if (!pool) return null
            const myPoints = ((myScores as any[]) ?? []).find((s: any) => s.pool_member_id === entry.id)?.total_points ?? 0
            const { pos, total } = getStanding(entry.id, pool.id)
            const posLabel = total > 0 ? `${pos}/${total}` : '–'
            const isActive = new Date(pool.ends_at) > new Date()
            const isLast   = i === ((memberRows as any[]) ?? []).length - 1 && adminOnlyRows.length === 0
            return <PoolRow key={pool.id} poolId={pool.id} name={pool.name} displayName={entry.display_name} points={myPoints} posLabel={posLabel} pos={pos} isActive={isActive} role="member" isLast={isLast} index={i} />
          })}

          {adminOnlyRows.map((entry: any, i: number) => {
            const pool = entry.pools
            if (!pool) return null
            const isActive = new Date(pool.ends_at) > new Date()
            const isLast   = i === adminOnlyRows.length - 1
            return <PoolRow key={pool.id} poolId={pool.id} name={pool.name} displayName={null} points={null} posLabel="–" pos={null} isActive={isActive} role="admin" isLast={isLast} index={((memberRows as any[]) ?? []).length + i} />
          })}
        </div>
      )}
    </div>
  )
}

function PoolRow({ poolId, name, displayName, points, posLabel, pos, isActive, role, isLast, index }: {
  poolId: string; name: string; displayName: string | null; points: number | null
  posLabel: string; pos: number | null; isActive: boolean; role: 'member' | 'admin'
  isLast: boolean; index: number
}) {
  const posColor = pos === 1 ? 'var(--color-gold)' : pos !== null && pos <= 3 ? 'var(--color-green)' : 'var(--color-text)'
  return (
    <Link href={`/pools/${poolId}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div className="animate-fade-up" style={{
        animationDelay: `${index * 0.05}s`,
        display: 'grid', gridTemplateColumns: '1fr 80px 88px',
        padding: '14px 20px', gap: '8px', alignItems: 'center',
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
        cursor: 'pointer',
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: displayName ? '3px' : 0, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            {role === 'admin' && <span style={{ padding: '1px 7px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '99px', fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-gold)', letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>Admin</span>}
            {!isActive && <span style={{ padding: '1px 7px', background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.15)', borderRadius: '99px', fontSize: '0.65rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>Finalizada</span>}
          </div>
          {displayName && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{displayName}</span>}
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--color-text)', lineHeight: 1 }}>{points ?? '–'}</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: role === 'admin' ? 'var(--color-text-muted)' : posColor, lineHeight: 1 }}>{posLabel}</span>
        </div>
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '56px 24px', background: 'var(--color-bg-card)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '14px' }}>⚽</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.06em', marginBottom: '10px' }}>AÚN NO ESTÁS EN NINGUNA POLLA</h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', maxWidth: '320px', margin: '0 auto 24px', lineHeight: 1.6 }}>
        Crea la tuya, o pide el enlace a alguien que ya tenga una.
      </p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <JoinByLinkButton />
        <Link href="/pools/new" style={{ textDecoration: 'none' }}>
          <button className="btn-primary" style={{ maxWidth: '220px' }}>Crear mi primera Polla</button>
        </Link>
      </div>
    </div>
  )
}
