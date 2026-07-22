import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Ignora estáticos (inclui modelos 3D .fbx/.glb/.gltf/.bin/.hdr) para não
    // passar assets grandes pela verificação de sessão — servidos direto e com
    // cache. Sem isso, /models/*.fbx caía no redirect de login.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|fbx|glb|gltf|bin|hdr|webmanifest)$).*)',
  ],
}
