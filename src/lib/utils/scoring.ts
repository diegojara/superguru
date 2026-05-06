// src/lib/utils/scoring.ts
// Lógica de puntuación de SuperGurú.
// calcMatchPoints es la función de referencia definida en el documento de diseño.
// Los puntos se cargan desde scoring_config en la DB — NUNCA hardcodeados aquí.

import type { MatchStage, ScoringTier, ScoringConfig } from '@/types/database'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type PointsTable = Record<
  MatchStage,
  { exact: number; partial_win: number; winner: number; partial: number }
>

export type MatchPointsResult = {
  points: number
  tier: ScoringTier | 'none'
}

// ---------------------------------------------------------------------------
// Función principal — no modificar sin revisión explícita (ver doc de diseño §5)
// ---------------------------------------------------------------------------

/**
 * Calcula los puntos obtenidos por un pronóstico de partido.
 *
 * Los criterios son mutuamente excluyentes — se aplica solo el de mayor puntaje.
 * El marcador para partidos con tiempo extra es el del final del tiempo extra,
 * antes de penales.
 *
 * @param realHome  - Goles reales del equipo local
 * @param realAway  - Goles reales del equipo visitante
 * @param predHome  - Goles pronosticados del equipo local
 * @param predAway  - Goles pronosticados del equipo visitante
 * @param stage     - Ronda del partido
 * @param pointsTable - Tabla de puntos cargada desde scoring_config
 */
export function calcMatchPoints(
  realHome: number,
  realAway: number,
  predHome: number,
  predAway: number,
  stage: MatchStage,
  pointsTable: PointsTable
): MatchPointsResult {
  const P = pointsTable[stage]

  const isExact = realHome === predHome && realAway === predAway

  const realWinner = realHome > realAway ? 'h' : realHome < realAway ? 'a' : 'd'
  const predWinner = predHome > predAway ? 'h' : predHome < predAway ? 'a' : 'd'
  const winnerOk = realWinner === predWinner

  const homeGoalsOk = realHome === predHome
  const awayGoalsOk = realAway === predAway

  // Exactamente uno de los dos equipos — no el caso cruzado (ej. 2-1 vs 1-2 = 0 pts)
  const exactlyOneTeamGoalsOk =
    (homeGoalsOk && !awayGoalsOk) || (!homeGoalsOk && awayGoalsOk)

  if (isExact)
    return { points: P.exact, tier: 'exact' }

  if (winnerOk && exactlyOneTeamGoalsOk)
    return { points: P.partial_win, tier: 'partial_win' }

  if (winnerOk)
    return { points: P.winner, tier: 'winner' }

  if (exactlyOneTeamGoalsOk)
    return { points: P.partial, tier: 'partial' }

  return { points: 0, tier: 'none' }
}

// ---------------------------------------------------------------------------
// Helpers para construir la PointsTable desde los registros de la DB
// ---------------------------------------------------------------------------

/**
 * Convierte un array de ScoringConfig (de la DB) en un PointsTable.
 * Usar antes de llamar a calcMatchPoints.
 */
export function buildPointsTable(configs: ScoringConfig[]): PointsTable {
  const stages: MatchStage[] = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final']

  const table = {} as PointsTable

  for (const stage of stages) {
    const stageConfigs = configs.filter(c => c.stage === stage)

    table[stage] = {
      exact:       stageConfigs.find(c => c.tier === 'exact')?.points       ?? 0,
      partial_win: stageConfigs.find(c => c.tier === 'partial_win')?.points ?? 0,
      winner:      stageConfigs.find(c => c.tier === 'winner')?.points      ?? 0,
      partial:     stageConfigs.find(c => c.tier === 'partial')?.points     ?? 0,
    }
  }

  return table
}

// ---------------------------------------------------------------------------
// Labels legibles para los tiers — para mostrar en la UI
// ---------------------------------------------------------------------------

export const TIER_LABELS: Record<ScoringTier | 'none', string> = {
  exact:       '¡Marcador exacto!',
  partial_win: 'Ganador + goles parciales',
  winner:      'Solo ganador',
  partial:     'Goles parciales',
  none:        'Sin puntos',
}

export const STAGE_LABELS: Record<MatchStage, string> = {
  group: 'Fase de grupos',
  r32:   '16avos de final',
  r16:   'Octavos de final',
  qf:    'Cuartos de final',
  sf:    'Semifinal',
  '3rd': 'Tercer puesto',
  final: 'Final',
}
