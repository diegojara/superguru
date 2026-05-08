import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PredictionsClient from './PredictionsClient'

interface Props { params: Promise<{ poolId: string }> }

export default async function PredictionsPage({ params }: Props) {
  const { poolId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase.from('pool_members').select('id, display_name').eq('pool_id', poolId).eq('user_id', user.id).maybeSingle() as any

  if (!member) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
        <p>Eres administrador de esta Polla pero no estás inscrito como participante.</p>
        <p style={{ marginTop: '8px' }}>Para ingresar pronósticos, inscríbete primero en <strong>Configuración</strong>.</p>
      </div>
    )
  }

  const { data: poolMatches } = await supabase.from('pool_matches').select('match_id, matches(*)').eq('pool_id', poolId).order('kickoff_at', { foreignTable: 'matches', ascending: true }) as any
  const matches = (poolMatches ?? []).map((pm: any) => pm.matches).filter(Boolean)
  const { data: predictions } = await supabase.from('predictions').select('*').eq('pool_member_id', member.id) as any
  const { data: otherMemberships } = await supabase.from('pool_members').select('id, pool_id, pools(name)').eq('user_id', user.id).neq('pool_id', poolId) as any

  return <PredictionsClient poolId={poolId} poolMemberId={member.id} matches={matches ?? []} initialPredictions={predictions ?? []} otherMemberships={otherMemberships ?? []} />
}
