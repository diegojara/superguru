// src/lib/supabase/server.ts
// Cliente Supabase para usar en Server Components, Server Actions y Route Handlers.
// Lee y escribe cookies para mantener la sesión del usuario.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // En Server Components el set falla silenciosamente — es esperado.
            // La sesión se refresca correctamente desde el middleware.
          }
        },
      },
    }
  )
}

// ---------------------------------------------------------------------------
// Cliente con service role — SOLO para cron jobs y operaciones privilegiadas.
// NUNCA usar en código accesible desde el browser.
// Bypasea RLS — usar con extremo cuidado.
// ---------------------------------------------------------------------------
export function createServiceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está definida')
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      auth: { persistSession: false },
    }
  )
}
