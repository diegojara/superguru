// src/app/(app)/pools/[poolId]/predictions/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PredictionsClient from './PredictionsClient'

interface Props {
  params: Promise<{ poolId: string }>
}

export default async function PredictionsPage({ params }: Props) {
  const { poolId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Miembro actual
  const { data: member } = await supabase
    .from('pool_members').select('id, display_name')
    .eq('pool_id', poolId).eq('user_id', user.id)
    .maybeSingle() as any

  if (!member) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
        <p>Eres administrador de esta Polla pero no estás inscrito como participante.</p>
        <p style={{ marginTop: '8px' }}>Para ingresar pronósticos, inscríbete primero en <strong>Configuración</strong>.</p>
      </div>
    )
  }

  // Partidos de la Polla ordenados por fecha
  const { data: poolMatches } = await supabase
    .from('pool_matches').select('match_id, matches(*)')
    .eq('pool_id', poolId)
    .order('matches(kickoff_at)', { ascending: true }) as any

  const matches = (poolMatches ?? []).map((pm: any) => pm.matches).filter(Boolean)

  // Mis pronósticos
  const { data: myPredictions } = await supabase
    .from('predictions').select('*')
    .eq('pool_member_id', member.id) as any

  // Mis puntos
  const { data: myScores } = await supabase
    .from('scores').select('match_id, points_earned, breakdown')
    .eq('pool_member_id', member.id) as any

  // Todos los participantes de la Polla (para el selector)
  const { data: allMembers } = await supabase
    .from('pool_members').select('id, display_name')
    .eq('pool_id', poolId)
    .neq('id', member.id) as any

  // Pronósticos de todos los demás participantes (solo partidos no scheduled)
  const otherMemberIds = (allMembers ?? []).map((m: any) => m.id)
  const { data: otherPredictions } = otherMemberIds.length > 0
    ? await supabase
        .from('predictions').select('pool_member_id, match_id, predicted_home, predicted_away')
        .in('pool_member_id', otherMemberIds)
        .not('locked_at', 'is', null) as any
    : { data: [] as any[] }

  return (
    <PredictionsClient
      poolId={poolId}
      myMember={{ id: member.id, display_name: member.display_name }}
      matches={matches ?? []}
      myPredictions={myPredictions ?? []}
      myScores={myScores ?? []}
      allMembers={allMembers ?? []}
      otherPredictions={otherPredictions ?? []}
    />
  )
}
