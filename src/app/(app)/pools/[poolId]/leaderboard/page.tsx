// src/app/(app)/pools/[poolId]/leaderboard/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface Props { params: Promise<{ poolId: string }> }

export default async function LeaderboardPage({ params }: Props) {
  const { poolId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: leaderboard } = await supabase
    .from('leaderboard_by_pool').select('*')
    .eq('pool_id', poolId)
    .order('total_points', { ascending: false }) as any

  const entries: any[] = (leaderboard as any[]) ?? []
  const memberIds = entries.map((e: any) => e.pool_member_id)

  const { data: exactScores } = memberIds.length > 0
    ? await supabase.from('scores').select('pool_member_id, breakdown').in('pool_member_id', memberIds) as any
    : { data: [] as any[] }

  const exactCount: Record<string, number> = {}
  for (const s of (exactScores as any[]) ?? []) {
    if (s.breakdown?.tier === 'exact') {
      exactCount[s.pool_member_id] = (exactCount[s.pool_member_id] ?? 0) + 1
    }
  }

  const { data: myMember } = await supabase
    .from('pool_members').select('id').eq('pool_id', poolId).eq('user_id', user.id).maybeSingle() as any

  const myId = myMember?.id

  const positions: number[] = []
  let currentPos = 1
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].total_points < entries[i - 1].total_points) currentPos = i + 1
    positions[i] = currentPos
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {entries.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
          Aún no hay puntajes. Los puntos aparecen cuando finalicen los partidos.
        </div>
      ) : (
        <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 72px 72px', padding: '10px 16px', background: 'var(--color-green-dim)', gap: '8px' }}>
            {[{ label: 'Pos', align: 'center' }, { label: 'Participante', align: 'left' }, { label: 'Puntos', align: 'center' }, { label: 'Exactos', align: 'center' }].map(h => (
              <span key={h.label} style={{ fontSize: '0.8rem', fontWeight: 700, color: '#dcfce7', textAlign: h.align as any, letterSpacing: '0.03em' }}>{h.label}</span>
            ))}
          </div>
          {entries.map((entry: any, i: number) => {
            const isMe = entry.pool_member_id === myId
            const pos = positions[i]
            const exact = exactCount[entry.pool_member_id] ?? 0
            const rowBg = i % 2 === 0 ? 'rgba(22, 48, 22, 0.6)' : 'rgba(16, 36, 16, 0.8)'
            return (
              <div key={entry.pool_member_id} className="animate-fade-up" style={{
                animationDelay: `${i * 0.03}s`,
                display: 'grid', gridTemplateColumns: '44px 1fr 72px 72px',
                padding: '12px 16px', gap: '8px', alignItems: 'center',
                background: isMe ? 'rgba(34, 197, 94, 0.12)' : rowBg,
                borderBottom: i < entries.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                borderLeft: isMe ? '3px solid var(--color-green)' : '3px solid transparent',
              }}>
                <div style={{ textAlign: 'center' }}>
                  {pos === 1 ? <span style={{ fontSize: '1.2rem' }}>🏆</span>
                    : <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: pos <= 3 ? 'var(--color-green)' : 'var(--color-text-muted)' }}>{pos}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: isMe ? 600 : 400, color: isMe ? 'var(--color-green)' : 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.display_name}</span>
                  {isMe && <span style={{ fontSize: '0.65rem', padding: '1px 6px', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '99px', color: 'var(--color-green)', flexShrink: 0 }}>Tú</span>}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--color-text)', lineHeight: 1 }}>{entry.total_points}</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: exact > 0 ? 'var(--color-gold)' : 'var(--color-text-muted)', lineHeight: 1 }}>{exact}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
