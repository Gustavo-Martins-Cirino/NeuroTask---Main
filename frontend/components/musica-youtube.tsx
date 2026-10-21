"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { ListMusic, Pause, Play, Plus, SkipBack, SkipForward, X, Youtube } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useDicionario } from "@/hooks/use-idioma"
import { enfatizar } from "@/lib/enfase"
import { idsDoYoutube } from "@/lib/youtube-embed"
import {
  SEGUNDOS_PARA_RECOMECAR,
  adicionaFaixa,
  inicioDaRetomada,
  leFaixas,
  leRetomada,
  miniaturaDaFaixa,
  tituloProvisorio,
  vizinha,
  type Faixa,
  type Retomada,
} from "@/lib/fila-musica"

// Reprodutor de músicas do YouTube no Modo Foco: uma lista, e o app mandando no
// player — pausar, continuar, pular, voltar — pela API oficial do YouTube.
//
// O que havia antes era um <iframe> solto, e as reclamações de "não consigo
// parar a música" tinham três causas: a pausa só existia DENTRO do vídeo, o
// vídeo ficava num painel fechado, e minimizar o Foco deixava a música tocando
// sem nenhum botão à vista. Somava-se o link guardado tocando sozinho a cada
// vez que o Foco abria. Agora nada toca sem um toque, e o mini reprodutor fica
// à vista no Foco e no relógio minimizado.
//
// O player vive DENTRO do painel (escondido quando o painel fecha), porque
// mudar um iframe de lugar o recarrega. Minimizar o Foco só esconde a tela, e o
// som segue; fechar o Foco desmonta tudo, e a música para — como já era.

const CHAVE_LISTA = "neurotask:yt-favorites"
const CHAVE_RETOMADA = "neurotask:yt-retomada"
/** O player antigo guardava só o último link. Ele entra na lista uma vez e sai. */
const CHAVE_ANTIGA = "neurotask:yt-url"

// ---- A API do player: só o pedaço que usamos ----

interface PlayerDoYoutube {
  playVideo(): void
  pauseVideo(): void
  stopVideo(): void
  destroy(): void
  seekTo(segundos: number, permitirAdiante: boolean): void
  loadVideoById(o: { videoId: string; startSeconds?: number }): void
  loadPlaylist(o: { list: string; listType: "playlist" }): void
  nextVideo(): void
  previousVideo(): void
  getCurrentTime(): number
  getPlaylist(): string[] | null
  getPlaylistIndex(): number
  getVideoData?: () => { title?: string }
}

interface ApiDoYoutube {
  Player: new (alvo: HTMLElement, opcoes: Record<string, unknown>) => PlayerDoYoutube
}

declare global {
  interface Window {
    YT?: ApiDoYoutube
    onYouTubeIframeAPIReady?: () => void
  }
}

let carregandoApi: Promise<ApiDoYoutube> | null = null

/** O script do YouTube entra só quando alguém toca a primeira música. */
function carregaApi(): Promise<ApiDoYoutube> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (carregandoApi) return carregandoApi
  carregandoApi = new Promise((resolve, reject) => {
    const anterior = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      anterior?.()
      if (window.YT?.Player) resolve(window.YT)
    }
    const script = document.createElement("script")
    script.src = "https://www.youtube.com/iframe_api"
    script.async = true
    script.onerror = () => {
      carregandoApi = null
      script.remove()
      reject(new Error("api do youtube"))
    }
    document.head.appendChild(script)
  })
  return carregandoApi
}

/** Os estados que o player anuncia (YT.PlayerState). */
const YT = { naoIniciado: -1, terminou: 0, tocando: 1, pausado: 2, carregando: 3, pronto: 5 } as const

function carregaNoPlayer(p: PlayerDoYoutube, faixa: Faixa, inicio?: number) {
  const ids = idsDoYoutube(faixa.url)
  if (ids?.video) p.loadVideoById({ videoId: ids.video, startSeconds: inicio ?? 0 })
  else if (ids?.lista) p.loadPlaylist({ list: ids.lista, listType: "playlist" })
}

/** Faixa que é uma playlist do YouTube: próxima/anterior andam dentro dela antes de sair. */
const ehPlaylist = (faixa: Faixa | undefined) => !!faixa && !idsDoYoutube(faixa.url)?.video

function lerGuardado(chave: string): string | null {
  try {
    return localStorage.getItem(chave)
  } catch {
    return null
  }
}

function guardar(chave: string, valor: string | null) {
  try {
    if (valor === null) localStorage.removeItem(chave)
    else localStorage.setItem(chave, valor)
  } catch {
    /* sem armazenamento: a lista só não sobrevive a recarregar */
  }
}

// ---- Estado compartilhado: o painel, o mini reprodutor do Foco e o da ilha ----

export type EstadoDaMusica = "parado" | "carregando" | "tocando" | "pausado"

interface MusicaYoutube {
  faixas: Faixa[]
  /** A que está no player — ou a última tocada, pronta para continuar. */
  atual: Faixa | null
  estado: EstadoDaMusica
  /** Há algo carregado no player (tocando, pausado ou carregando). */
  ativa: boolean
  recusadas: ReadonlySet<string>
  tocar: (faixa: Faixa) => void
  alternar: () => void
  proxima: () => void
  anterior: () => void
  adicionar: (link: string) => Promise<boolean>
  remover: (id: string) => void
  registraHost: (el: HTMLDivElement | null) => void
}

const Contexto = createContext<MusicaYoutube | null>(null)

export function useMusicaYoutube(): MusicaYoutube {
  const c = useContext(Contexto)
  if (!c) throw new Error("useMusicaYoutube deve ser usado dentro de MusicaYoutubeProvider")
  return c
}

/** `ativo` é o Foco aberto: ao fechar, o player é desmontado e a música para. */
export function MusicaYoutubeProvider({ ativo, children }: { ativo: boolean; children: React.ReactNode }) {
  const t = useDicionario().foco.youtube
  const [faixas, setFaixas] = useState<Faixa[]>([])
  const [atualId, setAtualId] = useState<string | null>(null)
  const [estado, setEstado] = useState<EstadoDaMusica>("parado")
  const [ativa, setAtiva] = useState(false)
  const [recusadas, setRecusadas] = useState<ReadonlySet<string>>(() => new Set())

  const playerRef = useRef<PlayerDoYoutube | null>(null)
  const prontoRef = useRef(false)
  const criandoRef = useRef(false)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const pendenteRef = useRef<{ faixa: Faixa; inicio?: number } | null>(null)
  /** A faixa que está DE FATO no player — pode não ser a atual enquanto ele carrega. */
  const noPlayerRef = useRef<string | null>(null)
  const retomadaRef = useRef<Retomada | null>(null)
  // Os eventos do player são ligados uma vez só; eles leem o estado por aqui.
  const faixasRef = useRef(faixas)
  faixasRef.current = faixas
  const atualIdRef = useRef(atualId)
  atualIdRef.current = atualId
  const recusadasRef = useRef(recusadas)
  recusadasRef.current = recusadas
  const ativoRef = useRef(ativo)
  ativoRef.current = ativo
  const ativaRef = useRef(ativa)
  ativaRef.current = ativa
  const textosRef = useRef(t)
  textosRef.current = t

  useEffect(() => {
    let lista = leFaixas(lerGuardado(CHAVE_LISTA))
    const antigo = lerGuardado(CHAVE_ANTIGA)
    if (antigo) {
      if (idsDoYoutube(antigo)) lista = adicionaFaixa(lista, { id: crypto.randomUUID(), url: antigo, title: antigo }).faixas
      guardar(CHAVE_ANTIGA, null)
      guardar(CHAVE_LISTA, JSON.stringify(lista))
    }
    setFaixas(lista)
    const retomada = leRetomada(lerGuardado(CHAVE_RETOMADA))
    retomadaRef.current = retomada
    if (retomada && lista.some((f) => f.id === retomada.id)) setAtualId(retomada.id)
  }, [])

  const mudaLista = useCallback((muda: (lista: Faixa[]) => Faixa[]) => {
    setFaixas((lista) => {
      const nova = muda(lista)
      if (nova !== lista) guardar(CHAVE_LISTA, JSON.stringify(nova))
      return nova
    })
  }, [])

  const guardaRetomada = useCallback(() => {
    const p = playerRef.current
    const id = atualIdRef.current
    if (!p || !id || !prontoRef.current) return
    let segundos = 0
    try {
      segundos = p.getCurrentTime()
    } catch {
      return
    }
    retomadaRef.current = { id, segundos }
    guardar(CHAVE_RETOMADA, JSON.stringify(retomadaRef.current))
  }, [])

  const silencia = useCallback(() => {
    setEstado("parado")
    setAtiva(false)
    noPlayerRef.current = null
    try {
      playerRef.current?.stopVideo()
    } catch {
      /* player já desmontado */
    }
  }, [])

  const criaPlayer = useCallback(() => {
    if (playerRef.current || criandoRef.current) return
    criandoRef.current = true
    carregaApi()
      .then((api) => {
        criandoRef.current = false
        const host = hostRef.current
        if (!host || !ativoRef.current || playerRef.current) return
        // O YouTube TROCA o elemento que recebe pelo iframe: ele ganha um filho
        // só dele, para não brigar com o React pelo div que o React controla.
        host.replaceChildren()
        const alvo = document.createElement("div")
        host.appendChild(alvo)
        playerRef.current = new api.Player(alvo, {
          width: "100%",
          height: "100%",
          host: "https://www.youtube-nocookie.com",
          // Sem `origin`, o player do nocookie não sabe para quem mandar os
          // eventos: ele tocava, mas o app nunca ficava sabendo que estava
          // tocando, pausado ou no fim (medido na bancada, 21/10).
          playerVars: { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1, origin: window.location.origin },
          events: {
            onReady: () => {
              prontoRef.current = true
              const pendente = pendenteRef.current
              pendenteRef.current = null
              if (pendente && playerRef.current) {
                carregaNoPlayer(playerRef.current, pendente.faixa, pendente.inicio)
                noPlayerRef.current = pendente.faixa.id
              }
            },
            onStateChange: (e: { data: number }) => aoMudarRef.current(e.data),
            onError: () => aoErrarRef.current(),
          },
        })
      })
      .catch(() => {
        criandoRef.current = false
        setEstado("parado")
        setAtiva(false)
        toast.error(textosRef.current.semPlayer)
      })
  }, [])

  const tocar = useCallback(
    (faixa: Faixa) => {
      if (!ativoRef.current) return
      // Tocar de novo uma que o YouTube recusou é uma nova tentativa.
      if (recusadasRef.current.has(faixa.id)) {
        const sem = new Set(recusadasRef.current)
        sem.delete(faixa.id)
        recusadasRef.current = sem
        setRecusadas(sem)
      }
      const inicio = inicioDaRetomada(retomadaRef.current, faixa.id)
      atualIdRef.current = faixa.id
      setAtualId(faixa.id)
      setEstado("carregando")
      setAtiva(true)
      const p = playerRef.current
      if (p && prontoRef.current) {
        carregaNoPlayer(p, faixa, inicio)
        noPlayerRef.current = faixa.id
        return
      }
      pendenteRef.current = { faixa, inicio }
      criaPlayer()
    },
    [criaPlayer]
  )

  const avanca = useCallback(
    (direcao: 1 | -1) => {
      const alvo = vizinha(faixasRef.current, atualIdRef.current, direcao, recusadasRef.current)
      if (!alvo) {
        silencia()
        return
      }
      if (alvo.id === atualIdRef.current && ativaRef.current) {
        // Lista de uma música só: "próxima" é ela de novo, do começo.
        try {
          playerRef.current?.seekTo(0, true)
          playerRef.current?.playVideo()
        } catch {
          /* idem */
        }
        return
      }
      tocar(alvo)
    },
    [silencia, tocar]
  )

  const aoMudarRef = useRef<(s: number) => void>(() => {})
  aoMudarRef.current = (s: number) => {
    if (s === YT.tocando) {
      setEstado("tocando")
      // O título que o player conhece entra no lugar do link colado.
      const titulo = playerRef.current?.getVideoData?.()?.title?.trim()
      const id = atualIdRef.current
      if (titulo && id && !ehPlaylist(faixasRef.current.find((f) => f.id === id))) {
        mudaLista((lista) =>
          lista.some((f) => f.id === id && tituloProvisorio(f))
            ? lista.map((f) => (f.id === id ? { ...f, title: titulo.slice(0, 200) } : f))
            : lista
        )
      }
    } else if (s === YT.pausado || s === YT.pronto) {
      setEstado("pausado")
      guardaRetomada()
    } else if (s === YT.carregando || s === YT.naoIniciado) {
      setEstado("carregando")
    } else if (s === YT.terminou) {
      const p = playerRef.current
      const faixa = faixasRef.current.find((f) => f.id === atualIdRef.current)
      if (p && ehPlaylist(faixa)) {
        const lista = p.getPlaylist?.()
        const i = p.getPlaylistIndex?.()
        if (lista && typeof i === "number" && i >= 0 && i < lista.length - 1) {
          p.nextVideo()
          return
        }
      }
      retomadaRef.current = null
      guardar(CHAVE_RETOMADA, null)
      avanca(1)
    }
  }

  const aoErrarRef = useRef<() => void>(() => {})
  aoErrarRef.current = () => {
    const id = atualIdRef.current
    if (!id) return
    toast(textosRef.current.naoToca)
    const novas = new Set(recusadasRef.current).add(id)
    recusadasRef.current = novas
    setRecusadas(novas)
    const alvo = vizinha(faixasRef.current, id, 1, novas)
    if (!alvo) {
      silencia()
      return
    }
    setTimeout(() => {
      if (ativoRef.current && atualIdRef.current === id) tocar(alvo)
    }, 1200)
  }

  const alternar = useCallback(() => {
    const p = playerRef.current
    const carregada = !!p && prontoRef.current && noPlayerRef.current !== null && noPlayerRef.current === atualIdRef.current
    if (!carregada) {
      // Pausar antes de o player ficar pronto CANCELA o carregamento — era aqui
      // que um toque no pause mandava tocar de novo.
      if (ativaRef.current && estado === "carregando") {
        pendenteRef.current = null
        setEstado("pausado")
        return
      }
      const alvo =
        faixasRef.current.find((f) => f.id === atualIdRef.current) ??
        vizinha(faixasRef.current, null, 1, recusadasRef.current)
      if (alvo) tocar(alvo)
      return
    }
    try {
      if (estado === "tocando" || estado === "carregando") {
        p.pauseVideo()
        setEstado("pausado")
      } else {
        p.playVideo()
      }
    } catch {
      /* idem */
    }
  }, [estado, tocar])

  const proxima = useCallback(() => {
    const p = playerRef.current
    const faixa = faixasRef.current.find((f) => f.id === atualIdRef.current)
    if (p && prontoRef.current && ativaRef.current && ehPlaylist(faixa)) {
      const lista = p.getPlaylist?.()
      const i = p.getPlaylistIndex?.()
      if (lista && typeof i === "number" && i >= 0 && i < lista.length - 1) {
        p.nextVideo()
        return
      }
    }
    avanca(1)
  }, [avanca])

  const anterior = useCallback(() => {
    const p = playerRef.current
    if (p && prontoRef.current && ativaRef.current) {
      let segundos = 0
      try {
        segundos = p.getCurrentTime()
      } catch {
        /* idem */
      }
      if (segundos > SEGUNDOS_PARA_RECOMECAR) {
        p.seekTo(0, true)
        return
      }
      const faixa = faixasRef.current.find((f) => f.id === atualIdRef.current)
      const i = ehPlaylist(faixa) ? p.getPlaylistIndex?.() : -1
      if (typeof i === "number" && i > 0) {
        p.previousVideo()
        return
      }
    }
    avanca(-1)
  }, [avanca])

  const adicionar = useCallback(
    async (link: string) => {
      const url = link.trim()
      if (!idsDoYoutube(url)) return false
      const nova: Faixa = { id: crypto.randomUUID(), url, title: url }
      const { faixas: lista, jaExistia } = adicionaFaixa(faixasRef.current, nova)
      if (jaExistia) {
        toast(textosRef.current.jaNaLista)
        if (!ativaRef.current) tocar(jaExistia)
        return true
      }
      faixasRef.current = lista
      mudaLista(() => lista)
      if (!ativaRef.current) tocar(nova)
      // O título de verdade (oEmbed, pelo servidor); falhando, fica o link até o player o conhecer.
      try {
        const r = await fetch(`/api/yt-title?url=${encodeURIComponent(url)}`)
        const d = (await r.json()) as { title?: unknown }
        const titulo = typeof d.title === "string" ? d.title.trim().slice(0, 200) : ""
        if (titulo) {
          mudaLista((atual) =>
            atual.some((f) => f.id === nova.id && tituloProvisorio(f))
              ? atual.map((f) => (f.id === nova.id ? { ...f, title: titulo } : f))
              : atual
          )
        }
      } catch {
        /* fica o link */
      }
      return true
    },
    [mudaLista, tocar]
  )

  const remover = useCallback(
    (id: string) => {
      if (id === atualIdRef.current) {
        silencia()
        atualIdRef.current = null
        setAtualId(null)
        retomadaRef.current = null
        guardar(CHAVE_RETOMADA, null)
      }
      mudaLista((lista) => lista.filter((f) => f.id !== id))
    },
    [mudaLista, silencia]
  )

  const registraHost = useCallback((el: HTMLDivElement | null) => {
    hostRef.current = el
  }, [])

  // Foco fechado: o player sai, guardando antes de onde continuar.
  useEffect(() => {
    if (ativo) return
    if (playerRef.current) {
      guardaRetomada()
      try {
        playerRef.current.destroy()
      } catch {
        /* já foi */
      }
    }
    playerRef.current = null
    prontoRef.current = false
    pendenteRef.current = null
    noPlayerRef.current = null
    setEstado("parado")
    setAtiva(false)
  }, [ativo, guardaRetomada])

  // Tocando, guarda de onde continuar a cada 10 s e ao sair da página.
  useEffect(() => {
    if (estado !== "tocando") return
    const id = setInterval(guardaRetomada, 10_000)
    window.addEventListener("pagehide", guardaRetomada)
    return () => {
      clearInterval(id)
      window.removeEventListener("pagehide", guardaRetomada)
    }
  }, [estado, guardaRetomada])

  const atual = faixas.find((f) => f.id === atualId) ?? null
  const valor = useMemo<MusicaYoutube>(
    () => ({ faixas, atual, estado, ativa, recusadas, tocar, alternar, proxima, anterior, adicionar, remover, registraHost }),
    [faixas, atual, estado, ativa, recusadas, tocar, alternar, proxima, anterior, adicionar, remover, registraHost]
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

// ---- Peças visuais ----

function Capa({ faixa, className }: { faixa: Faixa; className?: string }) {
  const src = miniaturaDaFaixa(faixa.url)
  const [falhou, setFalhou] = useState(false)
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/25", className)}>
      {src && !falhou ? (
        <img src={src} alt="" loading="lazy" onError={() => setFalhou(true)} className="h-full w-full object-cover" />
      ) : (
        <ListMusic className="h-4 w-4 opacity-60" />
      )}
    </span>
  )
}

/** As três barrinhas do "tocando agora". Paradas com movimento reduzido (globals.css). */
function BarrasTocando({ pausadas }: { pausadas?: boolean }) {
  return (
    <span aria-hidden className="nt-barras" data-pausadas={pausadas ? "true" : undefined}>
      <span />
      <span />
      <span />
    </span>
  )
}

const BOTAO = "flex shrink-0 items-center justify-center rounded-full transition-colors hover:bg-current/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40"

export function ControlesDaMusica({ pequeno, className }: { pequeno?: boolean; className?: string }) {
  const t = useDicionario().foco.youtube
  const m = useMusicaYoutube()
  // Carregando também conta como tocando: é aí que a pessoa mais quer poder parar.
  const tocando = m.estado === "tocando" || m.estado === "carregando"
  const tam = pequeno ? "h-7 w-7" : "h-9 w-9"
  const icone = pequeno ? "h-3.5 w-3.5" : "h-4 w-4"
  return (
    <div className={cn("flex shrink-0 items-center gap-0.5", className)}>
      <button type="button" onClick={m.anterior} aria-label={t.anterior} title={t.anterior} className={cn(BOTAO, tam)}>
        <SkipBack className={icone} />
      </button>
      <button
        type="button"
        onClick={m.alternar}
        aria-label={tocando ? t.pausar : t.continuar}
        title={tocando ? t.pausar : t.continuar}
        className={cn(BOTAO, tam, "bg-current/10")}
      >
        {tocando ? <Pause className={icone} /> : <Play className={cn(icone, "ml-0.5")} />}
      </button>
      <button type="button" onClick={m.proxima} aria-label={t.proxima} title={t.proxima} className={cn(BOTAO, tam)}>
        <SkipForward className={icone} />
      </button>
    </div>
  )
}

/**
 * O reprodutor discreto: capa, título e os três botões. Só aparece com algo no
 * player. Tocar na capa/título abre a lista (quem chama diz como).
 */
export function MiniReprodutor({
  compacto,
  className,
  onAbrirLista,
}: {
  /** Na ilha do Foco minimizado: tudo menor e o título mais curto. */
  compacto?: boolean
  className?: string
  onAbrirLista?: () => void
}) {
  const t = useDicionario().foco.youtube
  const m = useMusicaYoutube()
  if (!m.ativa || !m.atual) return null
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={onAbrirLista}
        title={t.abrirLista}
        className="flex min-w-0 items-center gap-2 rounded-lg text-left"
      >
        <span className="relative">
          <Capa faixa={m.atual} className={compacto ? "h-7 w-12" : "h-9 w-16"} />
          {m.estado === "tocando" && (
            <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/35 text-white">
              <BarrasTocando />
            </span>
          )}
        </span>
        <span className={cn("min-w-0 truncate text-xs font-medium", compacto ? "max-w-[7.5rem]" : "hidden max-w-[11rem] sm:block")}>
          {m.atual.title}
        </span>
      </button>
      <ControlesDaMusica pequeno />
    </div>
  )
}

/** O painel do YouTube no Modo Foco: colar link, o vídeo, o que está tocando e a lista. */
export function PainelMusica() {
  const t = useDicionario().foco.youtube
  const m = useMusicaYoutube()
  const [link, setLink] = useState("")
  const valido = idsDoYoutube(link) !== null

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (await m.adicionar(link)) setLink("")
  }

  return (
    <div className="space-y-3" data-estado={m.estado}>
      <form onSubmit={enviar} className="flex gap-2">
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder={t.placeholder}
          aria-label={t.placeholder}
          className="min-w-0 flex-1 rounded-lg border border-neutral-400/30 bg-black/5 px-3 py-2 text-sm outline-none placeholder:opacity-50 focus:border-neutral-400/60"
        />
        <button
          type="submit"
          disabled={!valido}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.03] disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> {t.adicionar}
        </button>
      </form>

      {/* O vídeo fica à vista enquanto toca (é o player do YouTube, e é dele
          que sai o som). Escondido, continua montado — é o que deixa a música
          seguir com o painel fechado e o Foco minimizado. */}
      <div className={cn("mx-auto aspect-video w-full max-w-md overflow-hidden rounded-xl bg-black", !m.ativa && "hidden")}>
        <div ref={m.registraHost} className="h-full w-full [&_iframe]:h-full [&_iframe]:w-full" />
      </div>

      {m.atual && (
        <div className="flex items-center gap-3 rounded-xl border border-neutral-400/25 p-2">
          <Capa faixa={m.atual} className="h-11 w-[4.9rem]" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60">
              {m.ativa ? t.tocandoAgora : t.continuar}
            </p>
            <p className="truncate text-sm font-medium">{m.atual.title}</p>
          </div>
          <ControlesDaMusica />
        </div>
      )}

      {m.faixas.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-semibold opacity-60">{t.suaLista(m.faixas.length)}</p>
          <ul className="max-h-56 space-y-0.5 overflow-y-auto pr-1">
            {m.faixas.map((f) => {
              const ehAtual = f.id === m.atual?.id
              const recusada = m.recusadas.has(f.id)
              return (
                <li
                  key={f.id}
                  className={cn("group flex items-center rounded-lg transition-colors", ehAtual ? "bg-primary/10" : "hover:bg-black/5")}
                >
                  <button
                    type="button"
                    onClick={() => m.tocar(f)}
                    aria-label={t.tocarFaixa(f.title)}
                    aria-current={ehAtual ? "true" : undefined}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1.5 text-left"
                  >
                    <span className="relative">
                      <Capa faixa={f} className="h-9 w-16" />
                      <span
                        className={cn(
                          "absolute inset-0 flex items-center justify-center rounded-md bg-black/40 text-white transition-opacity",
                          ehAtual && m.ativa ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                      >
                        {ehAtual && m.estado === "tocando" ? (
                          <BarrasTocando />
                        ) : ehAtual && m.ativa ? (
                          <BarrasTocando pausadas />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </span>
                    </span>
                    <span className={cn("line-clamp-2 text-sm leading-snug", ehAtual && "font-medium", recusada && "line-through opacity-50")}>
                      {f.title}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => m.remover(f.id)}
                    aria-label={t.remover}
                    title={t.remover}
                    className="mr-1 shrink-0 rounded-full p-1.5 opacity-0 transition hover:bg-black/10 hover:!opacity-100 focus-visible:opacity-100 group-hover:opacity-60 [@media(hover:none)]:opacity-60"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-neutral-400/20 bg-black/5 px-4 py-6 text-center">
          <Youtube className="h-7 w-7 opacity-60" />
          <span className="max-w-xs text-xs leading-relaxed opacity-70">{enfatizar(t.ajuda)}</span>
        </div>
      )}
    </div>
  )
}
