// src/lib/utils/scoring.ts
// Lógica de puntuación de SuperGurú — actualizada jun 2026.
// Los puntos base se cargan desde scoring_config en la DB.
// Puntos adicionales por goles acertados se suman directamente.

import type { MatchStage, ScoringConfig } from '@/types/database'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type PointsTable = Record<
  MatchStage,
  { exact: number; winner: number }
>

export type MatchPointsResult = {
  points:    number
  base_pts:  number
  goal_pts:  number
  is_exact:  boolean
  result_ok: boolean
  home_ok:   boolean
  away_ok:   boolean
}

// ---------------------------------------------------------------------------
// Función principal de cálculo de puntos
// ---------------------------------------------------------------------------

/**
 * Calcula los puntos obtenidos por un pronóstico de partido.
 *
 * Sistema de puntuación:
 * - Puntos base: X si exacto, Y si solo resultado, 0 si nada
 * - Puntos por goles: suma de goles acertados de cada equipo
 *   (si exacto, los goles ya están incluidos en X)
 *
 * Tabla X-Y por ronda:
 *   Grupos: 5-3 | 16avos: 7-5 | Octavos: 9-7 | Cuartos: 12-9
 *   Semis+3er: 15-12 | Final: 20-15
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

  const isExact  = realHome === predHome && realAway === predAway
  const homeOk   = realHome === predHome
  const awayOk   = realAway === predAway

  const realWinner = realHome > realAway ? 'h' : realHome < realAway ? 'a' : 'd'
  const predWinner = predHome > predAway ? 'h' : predHome < predAway ? 'a' : 'd'
  const resultOk   = realWinner === predWinner

  // Puntos base
  let basePts = 0
  if (isExact)       basePts = P.exact
  else if (resultOk) basePts = P.winner

  // Puntos por goles acertados
  // Si exacto: suma de todos los goles (ya incluidos conceptualmente en exact)
  // Si no exacto: suma de goles de cada equipo que acertó
  let goalPts = 0
  if (isExact) {
    goalPts = realHome + realAway
  } else {
    if (homeOk) goalPts += realHome
    if (awayOk) goalPts += realAway
  }

  return {
    points:    basePts + goalPts,
    base_pts:  basePts,
    goal_pts:  goalPts,
    is_exact:  isExact,
    result_ok: resultOk,
    home_ok:   homeOk,
    away_ok:   awayOk,
  }
}

// ---------------------------------------------------------------------------
// Helper para construir la PointsTable desde registros de la DB
// ---------------------------------------------------------------------------

export function buildPointsTable(configs: ScoringConfig[]): PointsTable {
  const stages: MatchStage[] = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final']
  const table = {} as PointsTable

  for (const stage of stages) {
    const stageConfigs = configs.filter(c => c.stage === stage)
    table[stage] = {
      exact:  stageConfigs.find(c => c.tier === 'exact')?.points  ?? 0,
      winner: stageConfigs.find(c => c.tier === 'winner')?.points ?? 0,
    }
  }

  return table
}

// ---------------------------------------------------------------------------
// Labels legibles para la UI
// ---------------------------------------------------------------------------

export const STAGE_LABELS: Record<MatchStage, string> = {
  group: 'Fase de grupos',
  r32:   '16avos de final',
  r16:   'Octavos de final',
  qf:    'Cuartos de final',
  sf:    'Semifinal',
  '3rd': 'Tercer puesto',
  final: 'Final',
}

// Compatibilidad con código existente que importa TIER_LABELS
export const TIER_LABELS: Record<string, string> = {
  exact:    '¡Marcador exacto!',
  winner:   'Resultado correcto',
  none:     'Sin puntos',
}
