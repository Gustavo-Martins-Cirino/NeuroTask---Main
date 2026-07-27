"use client"

import { useEffect, useMemo, useState } from "react"
import { Youtube, Play, Star, X } from "lucide-react"
import { cn } from "@/lib/utils"

// Player do YouTube EMBUTIDO (embed oficial) — toca vídeo/live direto do
// YouTube dentro do app, sem copiar/hospedar áudio (respeita direitos autorais;
// o criador é monetizado). Fica montado no Modo Foco, então o som segue tocando
// com o Foco minimizado enquanto você navega. Lembra o último link e permite
// favoritar (localStorage) — 1 clique pra tocar amanhã, sem abrir o YouTube.

const STORAGE_KEY = "neurotask:yt-url"
const FAV_KEY = "neurotask:yt-favorites"
const EMBED_PARAMS = "autoplay=1&rel=0&modestbranding=1&playsinline=1"

interface Fav {
  id: string
  url: string
  title: string
}

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
  const [favs, setFavs] = useState<Fav[]>([])

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setInput(saved)
      setCurrent(saved)
    }
    try {
      const raw = localStorage.getItem(FAV_KEY)
      if (raw) setFavs(JSON.parse(raw))
    } catch {
      /* ignora favoritos corrompidos */
    }
  }, [])

  const src = useMemo(() => toEmbedSrc(current), [current])
  const inputValido = toEmbedSrc(input) !== null
  // O link a salvar/favoritar é o do campo (se válido) ou o que está tocando.
  const linkAlvo = (toEmbedSrc(input) ? input : current).trim()
  const srcAlvo = toEmbedSrc(linkAlvo)
  const jaFavoritado = srcAlvo !== null && favs.some((f) => toEmbedSrc(f.url) === srcAlvo)

  const persistFavs = (next: Fav[]) => {
    setFavs(next)
    localStorage.setItem(FAV_KEY, JSON.stringify(next))
  }

  const tocar = (link: string) => {
    const v = link.trim()
    if (!toEmbedSrc(v)) return
    setInput(v)
    setCurrent(v)
    localStorage.setItem(STORAGE_KEY, v)
  }

  const alternarFavorito = async () => {
    if (!srcAlvo) return
    const existente = favs.find((f) => toEmbedSrc(f.url) === srcAlvo)
    if (existente) {
      persistFavs(favs.filter((f) => f.id !== existente.id))
      return
    }
    // Nome bonito via título real (com fallback pro link se falhar)
    let title = linkAlvo
    try {
      const r = await fetch(`/api/yt-title?url=${encodeURIComponent(linkAlvo)}`)
      const d = (await r.json()) as { title?: string | null }
      if (d.title) title = d.title
    } catch {
      /* mantém o link como nome */
    }
    persistFavs([...favs, { id: crypto.randomUUID(), url: linkAlvo, title }])
  }

  const removerFavorito = (id: string) => persistFavs(favs.filter((f) => f.id !== id))

  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); tocar(input) }} className="flex gap-2">
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
        <button
          type="button"
          onClick={alternarFavorito}
          disabled={!srcAlvo}
          title={jaFavoritado ? "Remover dos favoritos" : "Favoritar este link"}
          className="flex shrink-0 items-center justify-center rounded-lg border border-neutral-400/30 px-3 transition-colors hover:bg-black/5 disabled:opacity-40"
        >
          <Star className={cn("h-4 w-4", jaFavoritado && "fill-amber-400 text-amber-400")} />
        </button>
      </form>

      {favs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {favs.map((f) => {
            const ativo = src !== null && toEmbedSrc(f.url) === src
            return (
              <span
                key={f.id}
                className={cn(
                  "flex items-center gap-1 rounded-full border py-1 pl-2.5 pr-1 text-xs transition-colors",
                  ativo ? "border-primary/50 bg-primary/10" : "border-neutral-400/30 bg-black/5"
                )}
              >
                <button onClick={() => tocar(f.url)} className="max-w-[170px] truncate" title={f.title}>
                  {f.title}
                </button>
                <button
                  onClick={() => removerFavorito(f.id)}
                  title="Remover"
                  className="rounded-full p-0.5 opacity-50 transition hover:bg-black/10 hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}

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
              Cole um link, dê <b>Tocar</b> e clique na <b>★</b> pra favoritar. O áudio continua enquanto você trabalha — é só deixar o Foco <b>minimizado</b>.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
