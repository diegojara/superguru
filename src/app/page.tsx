// src/app/page.tsx
// Punto de entrada raíz. El middleware maneja la redirección según auth,
// pero dejamos un redirect explícito como fallback.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
