// src/lib/utils/datetime.ts
// Conversión UTC → COT (Colombia, UTC-5) y formateo de fechas.
// Colombia NO tiene horario de verano — la diferencia es fija.

const COT_OFFSET_HOURS = -5

/**
 * Convierte un timestamp UTC a Date en hora Bogotá (COT, UTC-5).
 * Usar para mostrar horarios en la UI.
 */
export function utcToCot(utcDateString: string): Date {
  const utcDate = new Date(utcDateString)
  const cotMs = utcDate.getTime() + COT_OFFSET_HOURS * 60 * 60 * 1000
  return new Date(cotMs)
}

/**
 * Formatea un timestamp UTC como hora legible en COT.
 * Ej: "Jue 11 Jun · 2:00 PM COT"
 */
export function formatKickoff(utcDateString: string): string {
  const cotDate = utcToCot(utcDateString)

  const dayName = cotDate.toLocaleDateString('es-CO', {
    weekday: 'short',
    timeZone: 'UTC',  // ya está convertido manualmente
  })
  const day = cotDate.getUTCDate()
  const month = cotDate.toLocaleDateString('es-CO', {
    month: 'short',
    timeZone: 'UTC',
  })
  const hours = cotDate.getUTCHours()
  const minutes = cotDate.getUTCMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  const minuteStr = minutes.toString().padStart(2, '0')

  return `${dayName} ${day} ${month} · ${hours12}:${minuteStr} ${ampm} COT`
}

/**
 * Formatea solo la hora en COT.
 * Ej: "2:00 PM COT"
 */
export function formatTime(utcDateString: string): string {
  const cotDate = utcToCot(utcDateString)
  const hours = cotDate.getUTCHours()
  const minutes = cotDate.getUTCMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  const minuteStr = minutes.toString().padStart(2, '0')
  return `${hours12}:${minuteStr} ${ampm} COT`
}

/**
 * Formatea solo la fecha en COT.
 * Ej: "Jueves 11 de junio"
 */
export function formatDate(utcDateString: string): string {
  const cotDate = utcToCot(utcDateString)
  return cotDate.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

/**
 * Devuelve true si el pronóstico para este partido ya está cerrado.
 * Se cierra 1 minuto antes del kickoff.
 */
export function isPredictionLocked(kickoffUtc: string): boolean {
  const kickoff = new Date(kickoffUtc)
  const lockTime = new Date(kickoff.getTime() - 60 * 1000) // 1 minuto antes
  return new Date() >= lockTime
}

/**
 * Devuelve el tiempo restante hasta el cierre de pronósticos.
 * Útil para mostrar un countdown en la UI.
 * Retorna null si ya está cerrado.
 */
export function timeUntilLock(kickoffUtc: string): string | null {
  const kickoff = new Date(kickoffUtc)
  const lockTime = new Date(kickoff.getTime() - 60 * 1000)
  const now = new Date()
  const diffMs = lockTime.getTime() - now.getTime()

  if (diffMs <= 0) return null

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (diffHours > 24) {
    const days = Math.floor(diffHours / 24)
    return `${days}d ${diffHours % 24}h`
  }
  if (diffHours > 0) return `${diffHours}h ${diffMinutes}m`
  return `${diffMinutes}m`
}
