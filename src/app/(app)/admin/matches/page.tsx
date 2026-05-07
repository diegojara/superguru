// src/app/(app)/admin/matches/page.tsx
import { createClient } from '@/lib/supabase/server'
import { STAGE_LABELS } from '@/lib/utils/scoring'
import MatchScoreEditor from './MatchScoreEditor'

const STAGE_ORDER = ['group','r32','r16','qf','sf','3rd','final']

export default async function AdminMatchesPage() {
  const supabase = await createClient()
  const { data: matches } = await supabase.from('matches').select('*').order('kickoff_at', { ascending: true }) as any

  const allMatches: any[] = (matches as any[]) ?? []
  const grouped = new Map<string, any[]>()
  for (const m of allMatches) {
    if (!grouped.has(m.stage)) grouped.set(m.stage, [])
    grouped.get(m.stage)!.push(m)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
        Ingresa o corrige marcadores manualmente. Cada actualización recalcula los puntajes en todas las Pollas.
      </p>
      {STAGE_ORDER.map(stage => {
        const stageMatches = grouped.get(stage)
        if (!stageMatches || stageMatches.length === 0) return null
        return (
          <section key={stage}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.12em', color: 'var(--color-gold)' }}>
                {(STAGE_LABELS as any)[stage]}
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stageMatches.map((match: any) => <MatchScoreEditor key={match.id} match={match} />)}
            </div>
          </section>
        )
      })}
    </div>
  )
}
