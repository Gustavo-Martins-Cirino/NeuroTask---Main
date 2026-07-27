import { NextResponse } from "next/server"

export const runtime = "nodejs"

// Pega o título de um vídeo/live do YouTube via oEmbed (sem chave, sem CORS —
// a chamada é server-side). Usado só pra nomear os favoritos do player.
export async function GET(req: Request) {
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
