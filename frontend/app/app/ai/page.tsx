"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Header } from "@/components/header"
import { Bot, ArrowUp, Loader2, Sparkles, NotebookPen, Mic, Square, AudioLines, Plus, Pin, PinOff, Trash2, MessagesSquare } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { VoiceConversation, unlockSpeech } from "@/components/voice-conversation"
import { BordaViva } from "@/components/borda-viva"
import { FundoGrao } from "@/components/fundo-grao"
import { getCachedBriefing, setCachedBriefing } from "@/lib/briefing-cache"
import { useMascaraRolagem } from "@/hooks/use-mascara-rolagem"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// R3F usa WebGL: só no cliente, e sob demanda — quem abre o chat com conversa
// já em andamento nunca vê o estado vazio e não deve pagar o bundle do three.
const NeuroSphere = dynamic(
  () => import("@/components/neuro-sphere").then((m) => m.NeuroSphere),
  { ssr: false, loading: () => <div className="h-40 w-40 sm:h-48 sm:w-48" /> }
)

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

const QUICK_PROMPTS = [
  "Organize meu dia com base nas minhas anotações",
  "Quais devem ser minhas 3 prioridades de hoje?",
  "Sugira blocos de foco para a tarde",
  "Como melhorar meu foco hoje?",
]

function localDateKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// Traduz o sinal de limite da IA para uma mensagem amigável (sem jargão técnico)
function prettyReply(t: string): string {
  return t.trim() === "__RATE_LIMIT__"
    ? "A Neuro está descansando 😴 O limite gratuito da IA chegou por agora — tente de novo em instantes."
    : t
}

// ---- Histórico de conversas (até 3 não-fixadas; fixadas são preservadas) ----
interface Convo { id: string; title: string; messages: ChatMessage[]; pinned: boolean; updatedAt: number }
const CONVOS_KEY = "neurotask-ai-convos"
const MAX_UNPINNED = 3

function newConvo(): Convo {
  return { id: Math.random().toString(36).slice(2), title: "Nova conversa", messages: [], pinned: false, updatedAt: Date.now() }
}
function titleFrom(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user")
  const src = firstUser ?? messages.find((m) => m.role === "assistant" && m.content.trim())
  return src ? src.content.replace(/\s+/g, " ").trim().slice(0, 40) || "Nova conversa" : "Nova conversa"
}
function pruneConvos(list: Convo[]): Convo[] {
  const pinned = list.filter((c) => c.pinned)
  const unpinned = list.filter((c) => !c.pinned).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_UNPINNED)
  return [...pinned, ...unpinned].sort((a, b) => b.updatedAt - a.updatedAt)
}
function saveConvos(list: Convo[]) {
  try { localStorage.setItem(CONVOS_KEY, JSON.stringify(list)) } catch {}
}

export default function AiPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [dayNotes, setDayNotes] = useState("")
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [convos, setConvos] = useState<Convo[]>([])
  const [activeId, setActiveId] = useState<string>("")
  const bootedRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const mascaraRolagem = useMascaraRolagem(scrollRef)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const monitorCtxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)

  const runBriefing = useCallback(() => {
    const cached = getCachedBriefing()
    if (cached) { setMessages([{ role: "assistant", content: cached }]); return }
    setLoading(true)
    setMessages([{ role: "assistant", content: "" }])
    fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [], mode: "briefing", now: new Date().toLocaleString("pt-BR"), tz: new Date().getTimezoneOffset() }),
    })
      .then((r) => r.text())
      .then((t) => {
        const raw = t.trim()
        setCachedBriefing(raw)
        setMessages([{ role: "assistant", content: prettyReply(raw) || "Olá! Como posso ajudar você hoje?" }])
      })
      .catch(() => setMessages([{ role: "assistant", content: "Olá! Como posso ajudar você hoje?" }]))
      .finally(() => setLoading(false))
  }, [])

  // Carrega anotações do dia + conversas (migra o formato antigo de conversa única)
  useEffect(() => {
    const supabase = createClient()
    supabase.from("day_notes").select("content").eq("note_date", localDateKey()).maybeSingle()
      .then(({ data }) => setDayNotes(data?.content ?? ""))

    if (bootedRef.current) return // roda uma única vez (evita duplicar no StrictMode)
    bootedRef.current = true

    let list: Convo[] = []
    try {
      const raw = localStorage.getItem(CONVOS_KEY)
      if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) list = p }
    } catch { /* ignora */ }
    if (list.length === 0) {
      try {
        const old = localStorage.getItem("neurotask-ai-chat")
        if (old) {
          const arr = JSON.parse(old)
          if (Array.isArray(arr) && arr.length) list = [{ ...newConvo(), messages: arr, title: titleFrom(arr) }]
          localStorage.removeItem("neurotask-ai-chat")
        }
      } catch { /* ignora */ }
    }
    // Abrir a Neuro IA começa uma conversa NOVA, sempre. Antes ela restaurava a
    // última, e quem voltava no dia seguinte caía no meio de um assunto
    // encerrado — com o briefing de ontem no topo. As anteriores continuam
    // inteiras, ali no menu "Conversas".
    const comConteudo = list.filter((c) => c.messages.some((m) => m.content.trim()))
    // Conversa aberta e abandonada sem escrever nada não deve encher a lista:
    // as vazias de visitas anteriores saem aqui (e do storage, logo abaixo).
    if (comConteudo.length !== list.length) saveConvos(comConteudo)

    const nova = newConvo()
    setConvos([nova, ...comConteudo])
    setActiveId(nova.id)
    setMessages([])
    // A nova ainda não vai para o storage: ela só é gravada quando ganhar a
    // primeira mensagem de verdade (ver o efeito de sincronização abaixo).
    runBriefing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sincroniza a conversa ativa com as mensagens atuais (ignora o placeholder vazio)
  useEffect(() => {
    if (!activeId || !messages.some((m) => m.content.trim())) return
    setConvos((prev) => {
      const next = prev.map((c) =>
        c.id === activeId ? { ...c, messages, title: titleFrom(messages), updatedAt: Date.now() } : c
      )
      saveConvos(next)
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, activeId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }]
    setMessages(nextMessages)
    setInput("")
    setLoading(true)

    // placeholder para a resposta que será preenchida via streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "" }])

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // envia só as últimas mensagens para economizar tokens (limite gratuito do Groq)
          messages: nextMessages.slice(-6),
          dayNotes,
          now: new Date().toLocaleString("pt-BR"),
          tz: new Date().getTimezoneOffset(),
        }),
      })

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "")
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = {
            role: "assistant",
            content: errText || "Não consegui responder agora. Tente novamente.",
          }
          return copy
        })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ""
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: "assistant", content: prettyReply(acc) }
          return copy
        })
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Houve um erro de conexão. Tente novamente.",
        }
        return copy
      })
    } finally {
      setLoading(false)
    }
  }

  const transcribeAndSend = async (blob: Blob) => {
    setTranscribing(true)
    try {
      const form = new FormData()
      form.append("file", blob, "audio.webm")
      const res = await fetch("/api/ai/transcribe", { method: "POST", body: form })
      if (!res.ok) {
        const err = await res.text().catch(() => "")
        setMessages((prev) => [...prev, { role: "assistant", content: err || "Não consegui transcrever o áudio." }])
        return
      }
      const { text } = await res.json()
      if (text?.trim()) {
        // Preenche o campo para o usuário revisar e enviar quando quiser
        setInput((prev) => (prev.trim() ? `${prev.trim()} ${text.trim()}` : text.trim()))
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Erro ao transcrever o áudio." }])
    } finally {
      setTranscribing(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        if (blob.size > 0) transcribeAndSend(blob)
      }
      recorderRef.current = rec
      rec.start()
      setRecording(true)

      // Detecção de silêncio: encerra sozinho quando o usuário para de falar
      const ctx = new AudioContext()
      monitorCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      const data = new Uint8Array(analyser.fftSize)
      const SILENCE_MS = 1800
      const THRESHOLD = 0.015
      let spoke = false
      let silenceStart: number | null = null

      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const x = (data[i] - 128) / 128
          sum += x * x
        }
        const rms = Math.sqrt(sum / data.length)
        if (rms > THRESHOLD) {
          spoke = true
          silenceStart = null
        } else if (spoke) {
          if (silenceStart === null) silenceStart = performance.now()
          else if (performance.now() - silenceStart > SILENCE_MS) {
            stopRecording()
            return
          }
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      alert("Não foi possível acessar o microfone. Verifique a permissão do navegador.")
    }
  }

  const stopRecording = () => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    monitorCtxRef.current?.close().catch(() => {})
    monitorCtxRef.current = null
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop()
    setRecording(false)
  }

  const isEmpty = messages.length === 0
  // Decide o papel do botão redondo: seta de enviar ou onda da conversa ao vivo.
  const temTexto = input.trim().length > 0

  const newConversation = () => {
    const c = newConvo()
    setConvos((prev) => pruneConvos([c, ...prev]))
    setActiveId(c.id)
    setMessages([])
    runBriefing()
  }
  const switchConvo = (id: string) => {
    if (id === activeId) return
    const c = convos.find((x) => x.id === id)
    if (!c) return
    setActiveId(id)
    setMessages(c.messages)
  }
  const togglePin = (id: string) => {
    setConvos((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
      saveConvos(next)
      return next
    })
  }
  const deleteConvo = (id: string) => {
    const next = convos.filter((c) => c.id !== id)
    if (id === activeId) {
      if (next.length > 0) {
        const nx = [...next].sort((a, b) => b.updatedAt - a.updatedAt)[0]
        setActiveId(nx.id)
        setMessages(nx.messages)
      } else {
        const c = newConvo()
        next.push(c)
        setActiveId(c.id)
        setMessages([])
        runBriefing()
      }
    }
    setConvos(next)
    saveConvos(next)
  }

  return (
    // O fundo desta tela é o MESMO preto de todas as outras — isso não muda. Os
    // efeitos entram por cima dele, discretos:
    //
    // · a malha pastel, calibrada por medição para somar ~3 pontos de
    //   luminância (o fundo do site marca 7) e começar abaixo do cabeçalho;
    // · a borda viva, quase invisível em repouso, que acende quando a resposta
    //   está chegando.
    //
    // `isolate` cria o contexto de empilhamento: sem ele o -z-10 da malha cairia
    // atrás do fundo do body e não apareceria nunca.
    <div className="relative isolate flex min-h-screen flex-col">
      <FundoGrao className="-z-10" />
      {/* Acende enquanto a resposta chega — é o sinal que sobra quando o texto
          ainda não começou a aparecer. */}
      <BordaViva ativa={loading || transcribing} />
      {/* A conversa ao vivo saiu daqui: virou o botão redondo da barra de
          digitação, como na referência (inspirações/…202826.png). */}
      <Header title="Neuro IA" icon={<Bot className="h-4 w-4" />}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <MessagesSquare className="h-3.5 w-3.5" />
              Conversas
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuItem onClick={newConversation} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova conversa
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {[...convos].sort((a, b) => b.updatedAt - a.updatedAt).map((c) => (
              <div key={c.id} className={cn("flex items-center gap-1 rounded-md px-1", c.id === activeId && "bg-accent")}>
                <button
                  onClick={() => switchConvo(c.id)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pl-1 text-left text-sm"
                >
                  {c.pinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
                  <span className="truncate">{c.title || "Nova conversa"}</span>
                </button>
                <button
                  onClick={() => togglePin(c.id)}
                  title={c.pinned ? "Desafixar" : "Fixar"}
                  className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {c.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => deleteConvo(c.id)}
                  title="Excluir"
                  className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </Header>

      <VoiceConversation open={voiceOpen} onClose={() => setVoiceOpen(false)} />

      {/* Sem conversa começada, a barra sobe e o grupo inteiro (esfera, saudação,
          sugestões e barra) fica centrado — a conversa começa no meio da tela,
          não numa caixa presa no rodapé. A barra NÃO muda de lugar no DOM: só a
          distribuição do flex muda, senão o campo perderia o foco na hora em que
          a primeira mensagem sai. */}
      <div
        className={cn(
          "mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-4",
          isEmpty && "justify-center"
        )}
      >
        <div
          ref={scrollRef}
          style={isEmpty ? undefined : mascaraRolagem}
          className={cn("scrollbar-thin overflow-y-auto", isEmpty ? "py-4" : "flex-1 py-6")}
        >
          {isEmpty ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex h-full flex-col items-center justify-center gap-6 text-center"
            >
              <NeuroSphere
                className="h-40 w-40 sm:h-48 sm:w-48"
                fallback={
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                }
              />
              <div className="space-y-1">
                <h2 className="text-2xl font-bold">Olá! Sou a Neuro IA</h2>
                <p className="text-muted-foreground">
                  Posso organizar seu dia, priorizar tarefas e ajudar você a focar.
                </p>
              </div>

              {dayNotes.trim() && (
                <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs text-muted-foreground">
                  <NotebookPen className="h-3.5 w-3.5" />
                  Li suas anotações de hoje
                </div>
              )}

              <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="rounded-xl border border-border/50 bg-card/50 p-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border/50"
                      )}
                    >
                      {m.content || (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="flex items-end gap-1 rounded-[26px] border border-border/50 bg-card/60 p-1.5 shadow-lg shadow-black/5 backdrop-blur-sm"
        >
          {/* O "+" da referência: aqui ele começa uma conversa nova, que é a
              ação que já existia escondida no menu do canto. */}
          <button
            type="button"
            onClick={newConversation}
            title="Nova conversa"
            aria-label="Nova conversa"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            placeholder="Pergunte qualquer coisa…"
            rows={1}
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          {/* Microfone (gravar voz → transcrever → enviar) */}
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={loading || transcribing}
            aria-label={recording ? "Parar gravação" : "Gravar áudio"}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40",
              recording ? "bg-red-500 text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {transcribing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : recording ? (
              <span className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-7 w-7 animate-ping rounded-full bg-white/40" />
                <Square className="relative h-4 w-4 fill-current" />
              </span>
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>

          {/* O botão redondo escuro da referência, com DOIS papéis. As duas
              imagens (…202826 e …202901) mostram a mesma barra: com o campo
              vazio ele é a onda sonora da conversa ao vivo; com texto escrito,
              a seta de enviar. Um botão só, porque nunca se quer os dois ao
              mesmo tempo — e assim a conversa ao vivo deixa de ocupar o header. */}
          <button
            type={temTexto ? "submit" : "button"}
            onClick={temTexto ? undefined : () => { unlockSpeech(); setVoiceOpen(true) }}
            disabled={loading}
            title={temTexto ? "Enviar" : "Conversar por voz"}
            aria-label={temTexto ? "Enviar" : "Conversar por voz"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : temTexto ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <AudioLines className="h-4 w-4" />
            )}
          </button>
        </form>
        {(recording || transcribing) && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {recording ? "Gravando… toque no quadrado para transcrever" : "Transcrevendo seu áudio…"}
          </p>
        )}
      </div>
    </div>
  )
}
