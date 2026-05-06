// src/lib/supabase/client.ts
// Cliente Supabase para usar en componentes 'use client'.
// Crea UNA sola instancia por sesión de browser (singleton).

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
