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
    // robots/sitemap/llms, a imagem de prévia e o /.well-known/ são lidos por
    // robô, que nunca tem sessão: passando pelo proxy, todos eles recebiam a
    // tela de login — com 200, que o Lighthouse lia como um ai-catalog.json
    // "inválido". Fora do proxy, o que existe em public/ é servido e o resto é 404.
    '/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|llms\\.txt|opengraph-image|\\.well-known/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|fbx|glb|gltf|bin|hdr|webmanifest|js|wasm)$).*)',
  ],
}
