// src/lib/constants.ts
// Constantes globales de SuperGurú.

import type { MatchStage, MatchStatus } from '@/types/database'

// ---------------------------------------------------------------------------
// Etapas del torneo en orden
// ---------------------------------------------------------------------------
export const STAGES_IN_ORDER: MatchStage[] = [
  'group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final',
]

// ---------------------------------------------------------------------------
// Estados de partido que indican que los pronósticos ya son visibles para todos
// ---------------------------------------------------------------------------
export const VISIBLE_PREDICTION_STATUSES: MatchStatus[] = [
  'live', 'extra_time', 'penalties', 'finished',
]

// ---------------------------------------------------------------------------
// Minutos antes del kickoff en que se cierran los pronósticos
// ---------------------------------------------------------------------------
export const PREDICTION_LOCK_MINUTES = 1

// ---------------------------------------------------------------------------
// Puntos de pronósticos especiales (fijos — no dependen de la ronda)
// ---------------------------------------------------------------------------
export const SPECIAL_PREDICTION_POINTS = {
  champion:   15,
  top_scorer: 10,
} as const

// ---------------------------------------------------------------------------
// Polling de marcadores
// ---------------------------------------------------------------------------
export const SCORE_POLL_INTERVAL_SECONDS = 60
