import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Ignora estáticos (modelos 3D .fbx/.glb/.gltf/.bin/.hdr e o decoder Draco
    // .js/.wasm em /draco) para não passar assets pela verificação de sessão —
    // servidos direto e com cache. Sem isso, /models/*.fbx ou /draco/*.wasm
    // caíam no redirect de login (HTML no lugar do binário).
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|fbx|glb|gltf|bin|hdr|webmanifest|js|wasm)$).*)',
  ],
}
