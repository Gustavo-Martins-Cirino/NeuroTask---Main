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
    // robots/sitemap/llms e a imagem de prévia são lidos por robô, que nunca
    // tem sessão: passando pelo proxy, todos eles recebiam a tela de login.
    '/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|llms\\.txt|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|fbx|glb|gltf|bin|hdr|webmanifest|js|wasm)$).*)',
  ],
}
