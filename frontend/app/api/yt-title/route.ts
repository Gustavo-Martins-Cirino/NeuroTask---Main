import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

// Pega o título de um vídeo/live do YouTube via oEmbed (sem chave, sem CORS —
// a chamada é server-side). Usado só pra nomear os favoritos do player.
// Pede login: aberta, a rota servia de proxy do oEmbed para qualquer um, por
// conta deste servidor. O player só chama de dentro do app, e sem título o
// favorito fica com o link como nome — que é o que o 401 devolve.
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ title: null }, { status: 401 })
  const url = new URL(req.url).searchParams.get("url")
  if (!url) return NextResponse.json({ title: null })
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { cache: "no-store" }
    )
    if (!r.ok) return NextResponse.json({ title: null })
    const data = (await r.json()) as { title?: unknown }
    return NextResponse.json({ title: typeof data.title === "string" ? data.title : null })
  } catch {
    return NextResponse.json({ title: null })
  }
}
