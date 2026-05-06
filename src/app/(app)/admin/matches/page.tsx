// src/app/(app)/admin/matches/page.tsx
import { createClient } from '@/lib/supabase/server'
import { formatKickoff } from '@/lib/utils/datetime'
import { STAGE_LABELS } from '@/lib/utils/scoring'
import MatchScoreEditor from './MatchScoreEditor'
import type { Match, MatchStage } from '@/types/database'

export default async function AdminMatchesPage() {
  const supabase = await createClient()

  // Partidos activos o recientes (live, extra_time, penalties, o scheduled próximos)
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('kickoff_at', { ascending: true })

  const allMatches = (matches ?? []) as Match[]

  // Agrupar por etapa
  const stageOrder: MatchStage[] = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final']
  const grouped = new Map<MatchStage, Match[]>()
  for (const m of allMatches) {
    if (!grouped.has(m.stage)) grouped.set(m.stage, [])
    grouped.get(m.stage)!.push(m)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
        Ingresa o corrige marcadores manualmente. Cada actualización recalcula los puntajes en todas las Pollas.
      </p>

      {stageOrder.map(stage => {
        const stageMatches = grouped.get(stage)
        if (!stageMatches || stageMatches.length === 0) return null

        return (
          <section key={stage}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.9rem',
                letterSpacing: '0.12em',
                color: 'var(--color-gold)',
              }}>
                {STAGE_LABELS[stage]}
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stageMatches.map(match => (
                <MatchScoreEditor key={match.id} match={match} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
