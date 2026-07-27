"use client"

import { useEffect, useMemo, useState } from "react"
import { Youtube, Play } from "lucide-react"

// Player do YouTube EMBUTIDO (embed oficial) — toca vídeo/live direto do
// YouTube dentro do app, sem copiar/hospedar áudio (respeita direitos autorais;
// o criador é monetizado). Fica montado no Modo Foco, então o som segue tocando
// com o Foco minimizado enquanto você navega. Lembra o último link (localStorage).

const STORAGE_KEY = "neurotask:yt-url"
const EMBED_PARAMS = "autoplay=1&rel=0&modestbranding=1&playsinline=1"

// Extrai o src do embed a partir de vários formatos de link do YouTube.
function toEmbedSrc(raw: string): string | null {
  const url = raw.trim()
  if (!url) return null
  let id = ""
  let list = ""
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`)
    const host = u.hostname.replace(/^www\./, "")
    if (host === "youtu.be") {
      id = u.pathname.slice(1)
    } else if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      list = u.searchParams.get("list") || ""
      if (u.pathname === "/watch") id = u.searchParams.get("v") || ""
      else if (u.pathname.startsWith("/live/")) id = u.pathname.split("/")[2] || ""
      else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2] || ""
      else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2] || ""
    }
  } catch {
    // Talvez tenham colado só o ID do vídeo (11 caracteres)
    if (/^[\w-]{11}$/.test(url)) id = url
  }
  id = id.split(/[&?/]/)[0]
  if (id && list) return `https://www.youtube.com/embed/${id}?list=${list}&${EMBED_PARAMS}`
  if (list) return `https://www.youtube.com/embed/videoseries?list=${list}&${EMBED_PARAMS}`
  if (id) return `https://www.youtube.com/embed/${id}?${EMBED_PARAMS}`
  return null
}

export function YouTubePlayer() {
  const [input, setInput] = useState("")
  const [current, setCurrent] = useState("")

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setInput(saved)
      setCurrent(saved)
    }
  }, [])

  const src = useMemo(() => toEmbedSrc(current), [current])
  const inputValido = toEmbedSrc(input) !== null

  const play = () => {
    const v = input.trim()
    if (!toEmbedSrc(v)) return
    setCurrent(v)
    localStorage.setItem(STORAGE_KEY, v)
  }

  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); play() }} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Cole o link do YouTube (vídeo ou live)…"
          className="min-w-0 flex-1 rounded-lg border border-neutral-400/30 bg-black/5 px-3 py-2 text-sm outline-none placeholder:opacity-50 focus:border-neutral-400/60"
        />
        <button
          type="submit"
          disabled={!inputValido}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.03] disabled:opacity-40"
        >
          <Play className="h-4 w-4" /> Tocar
        </button>
      </form>

      {src ? (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
          <iframe
            key={src}
            src={src}
            title="YouTube"
            className="h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-neutral-400/20 bg-black/5 text-center">
          <div className="flex max-w-xs flex-col items-center gap-2 px-4 opacity-60">
            <Youtube className="h-7 w-7" />
            <span className="text-xs leading-relaxed">
              Cole um link do YouTube e toque. O áudio continua enquanto você trabalha — é só deixar o Foco <b>minimizado</b>.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
