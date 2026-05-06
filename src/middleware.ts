// src/middleware.ts
// Protege todas las rutas bajo /(app)/ y /admin/.
// Refresca la sesión de Supabase en cada request para mantenerla activa.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

// Rutas que NO requieren autenticación
const PUBLIC_ROUTES = ['/login', '/register']

// Rutas que requieren ser SuperAdmin
const SUPERADMIN_ROUTES = ['/admin']

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = createClient(request, response)
  const { pathname } = request.nextUrl

  // Refrescar sesión (importante para que no expire)
  const { data: { user } } = await supabase.auth.getUser()

  const isPublicRoute = PUBLIC_ROUTES.some(r => pathname.startsWith(r))
  const isSuperAdminRoute = SUPERADMIN_ROUTES.some(r => pathname.startsWith(r))

  // Usuario no autenticado intentando acceder a ruta protegida
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Usuario autenticado intentando acceder a login/register → redirigir al dashboard
  if (user && isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Verificar SuperAdmin para rutas de admin
  if (user && isSuperAdminRoute) {
    const { data: userData } = await supabase
      .from('users')
      .select('is_superadmin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_superadmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    // Proteger todas las rutas excepto estáticos y _next
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
