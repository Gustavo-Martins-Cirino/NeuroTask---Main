"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Mic, Loader2, RotateCcw, Sparkles, Check } from "lucide-react"
import { charsRevelados, fatiar, fecharMarcacao } from "@/lib/transcricao-viva"
import { OndaSonora } from "@/components/onda-sonora"
import { estadoDaOnda } from "@/lib/onda-sonora"

type Status = "idle" | "listening" | "thinking" | "speaking"
interface Msg { role: "user" | "assistant"; content: string }

/* eslint-disable @typescript-eslint/no-explicit-any */
interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: any) => void) | null
  onend: (() => void) | null
  onerror: ((e: any) => void) | null
}

const IS_MOBILE = typeof navigator !== "undefined" && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)

const IS_SAFARI =
  typeof navigator !== "undefined" &&
  /Safari/i.test(navigator.userAgent) &&
  !/Chrome|CriOS|Edg|FxiOS|Android/i.test(navigator.userAgent)

// Elemento de áudio único da voz da Neuro (voz do servidor, igual em todo
// dispositivo). Reutilizar o MESMO elemento mantém a permissão de reprodução
// concedida no primeiro toque (exigência de mobile).
let sharedAudio: HTMLAudioElement | null = null
export function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) sharedAudio = new Audio()
  return sharedAudio
}

// Android/iOS bloqueiam mudo qualquer áudio/fala que não nasça de um toque.
// Chamar isto DENTRO de um clique/toque destrava a reprodução para a sessão.
export function unlockSpeech() {
  try {
    const a = getSharedAudio()
    if (!a.src) {
      // 50ms de silêncio REAL (WAV com amostras) para "carimbar" a permissão.
      // O Safari rejeita áudio de 0 amostras e recusa play() sem gesto depois;
      // e tocar SEM muted — reprodução muda não concede permissão no WebKit.
      a.src =
        "data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA"
    }
    a.play().then(() => a.pause()).catch(() => {})
  } catch {
    /* ignora */
  }
  try {
    const synth = window.speechSynthesis
    if (!synth) return
    synth.resume()
    const u = new SpeechSynthesisUtterance(" ")
    u.volume = 0
    u.rate = 5
    synth.speak(u)
  } catch {
    /* ignora */
  }
}

function getRecognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

function stripForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_#`>]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
}

function RichText({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim() !== "")
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const bullet = /^\s*[-•]\s+/.test(line)
        const clean = line.replace(/^\s*[-•]\s+/, "")
        const parts = clean.split(/(\*\*[^*]+\*\*)/g)
        const content = parts.map((p, j) =>
          p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : <span key={j}>{p}</span>
        )
        return bullet ? (
          <div key={i} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
            <p className="text-sm leading-relaxed">{content}</p>
          </div>
        ) : (
          <p key={i} className="text-sm leading-relaxed">{content}</p>
        )
      })}
    </div>
  )
}

/**
 * A conversa ao vivo é a MESMA conversa do chat de texto, não uma paralela.
 *
 * Antes ela abria vazia: quem estava escrevendo sobre um assunto e clicava em
 * conversar ao vivo perdia tudo de vista — e a Neuro perdia junto, porque o que
 * vai para a rota são as últimas mensagens desta lista. Agora ela abre com o que
 * já foi dito e devolve o que foi falado ao fechar.
 */
export function VoiceConversation({
  open, onClose, historico = [], aoEncerrar,
}: {
  open: boolean
  onClose: () => void
  /** O que já foi conversado por escrito. */
  historico?: Msg[]
  /** A conversa inteira, de volta para o chat de texto, ao fechar. */
  aoEncerrar?: (mensagens: Msg[]) => void
}) {
  const [status, setStatus] = useState<Status>("idle")
  const [messages, setMessages] = useState<Msg[]>([])
  const [interim, setInterim] = useState("")
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceURI, setVoiceURI] = useState("")
  const [supported, setSupported] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resting, setResting] = useState(false)
  const [holding, setHolding] = useState(false)

  const phaseRef = useRef<Status>("idle")
  const messagesRef = useRef<Msg[]>([])
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const voiceURIRef = useRef("")
  const startHoldRef = useRef<() => void>(() => {})
  const endHoldRef = useRef<() => void>(() => {})
  const submitRef = useRef<(t: string) => void>(() => {})
  const retryRef = useRef<() => void>(() => {})
  // O histórico entra por ref: como prop nas dependências, cada render do chat
  // remontaria a conversa ao vivo no meio de uma fala.
  const historicoRef = useRef<Msg[]>(historico)
  historicoRef.current = historico
  const aoEncerrarRef = useRef(aoEncerrar)
  aoEncerrarRef.current = aoEncerrar
  /** Quantas mensagens vieram do chat escrito — essas já foram lidas. */
  const [herdadas, setHerdadas] = useState(0)

  phaseRef.current = status
  messagesRef.current = messages
  voicesRef.current = voices
  voiceURIRef.current = voiceURI

  // Vozes do sistema (prefere pt-BR mais naturais)
  useEffect(() => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null
    if (!synth) return
    const load = () => {
      const all = synth.getVoices()
      const pt = all.filter((v) => v.lang?.toLowerCase().startsWith("pt"))
      const list = pt.length ? pt : all
      setVoices(list)
      // Voz masculina NATURAL (menos robótica). Cuidado: /male/ casaria com
      // "female" — por isso a checagem explícita de nomes femininos.
      const isFemale = (v: SpeechSynthesisVoice) =>
        /female|feminin|luciana|francisca|maria|let[ií]cia|camila|vit[oó]ria|helo/i.test(v.name)
      const isMale = (v: SpeechSynthesisVoice) =>
        !isFemale(v) && /male|daniel|ant[oô]nio|felipe|thiago|jo[aã]o|masculin/i.test(v.name)
      const isNatural = (v: SpeechSynthesisVoice) => /natural|online|google/i.test(v.name)
      const preferred =
        list.find((v) => isMale(v) && isNatural(v)) ||
        list.find(isMale) ||
        list.find(isNatural) ||
        list[0]
      setVoiceURI((prev) => prev || preferred?.voiceURI || "")
    }
    load()
    synth.addEventListener("voiceschanged", load)
    return () => synth.removeEventListener("voiceschanged", load)
  }, [])

  useEffect(() => {
    if (!open) return
    const Ctor = getRecognitionCtor()
    const canWhisper = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia
    // Safari: o reconhecimento ao vivo é instável → grava e transcreve via
    // Whisper (servidor) ao soltar o botão. Sem nenhum dos dois → sem suporte.
    const USE_WHISPER = (!Ctor || IS_SAFARI) && canWhisper
    if (!Ctor && !canWhisper) { setSupported(false); return }
    setSupported(true)
    setError(null)
    setResting(false)
    setHolding(false)
    // Abre com o que já foi escrito: é a mesma conversa, só que agora falada.
    const herdado = historicoRef.current.filter((m) => m.content.trim())
    setHerdadas(herdado.length)
    setMessages(herdado)
    setInterim("")

    const synth = window.speechSynthesis
    let disposed = false
    let holdRec: RecognitionLike | null = null
    let buffer = ""
    let interimText = ""

    const setPhase = (s: Status) => { phaseRef.current = s; setStatus(s) }
    const goIdle = () => { if (!disposed) setPhase("idle") }

    function handleRateLimit(reply: string): boolean {
      if (reply !== "__RATE_LIMIT__") return false
      setResting(true)
      goIdle()
      setMessages((m) => [...m, { role: "assistant", content: "Estou descansando um pouquinho 😴 O limite gratuito da IA chegou por agora." }])
      return true
    }

    async function fetchTTS(text: string): Promise<Blob> {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error("tts indisponível")
      return res.blob()
    }

    function playBlob(blob: Blob): Promise<void> {
      return new Promise((resolve, reject) => {
        const audio = getSharedAudio()
        try { audio.pause() } catch {}
        const url = URL.createObjectURL(blob)
        audio.src = url
        audio.onended = () => { URL.revokeObjectURL(url); resolve() }
        audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error("erro de áudio")) }
        // Interrompido (pausa manual sem chegar ao fim) → encerra a promessa
        audio.onpause = () => {
          if (!audio.ended && phaseRef.current !== "speaking") {
            URL.revokeObjectURL(url)
            resolve()
          }
        }
        audio.play().catch(reject)
      })
    }

    // Voz ÚNICA (servidor), com pipelining de frases: a 1ª frase (curta) toca
    // rápido enquanto o resto é gerado em paralelo — mesmo mecanismo blob
    // aprovado, apenas fatiado. Reduz muito o delay sem mudar a voz.
    async function speak(text: string) {
      const clean = stripForSpeech(text)
      if (disposed || !clean) { goIdle(); return }
      setPhase("speaking")

      // 1º pedaço = primeira frase (geração rápida); resto agrupado (~300 chars)
      const sentences = clean.match(/[^.!?…]+[.!?…]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [clean]
      const chunks: string[] = []
      let cur = ""
      for (let i = 0; i < sentences.length; i++) {
        if (i === 0) { chunks.push(sentences[0]); continue }
        if (cur && (cur + " " + sentences[i]).length > 300) { chunks.push(cur); cur = sentences[i] }
        else cur = cur ? cur + " " + sentences[i] : sentences[i]
      }
      if (cur) chunks.push(cur)

      let spokeAny = false
      try {
        let nextBlob: Promise<Blob> | null = fetchTTS(chunks[0])
        for (let i = 0; i < chunks.length; i++) {
          const blob = await nextBlob!
          // pré-busca o próximo pedaço enquanto este toca
          nextBlob = i + 1 < chunks.length ? fetchTTS(chunks[i + 1]) : null
          if (disposed || phaseRef.current !== "speaking") return
          await playBlob(blob)
          spokeAny = true
          if (disposed || phaseRef.current !== "speaking") return
        }
        if (!disposed && phaseRef.current === "speaking") goIdle()
      } catch {
        if (disposed || phaseRef.current !== "speaking") return
        // Nada foi falado ainda → reserva do navegador; no meio → só encerra
        if (!spokeAny) speakFallback(clean)
        else goIdle()
      }
    }

    function speakFallback(clean: string) {
      if (disposed || !synth) { goIdle(); return }
      try { synth.cancel() } catch {}
      const chunks = clean.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [clean]
      const v = voicesRef.current.find((x) => x.voiceURI === voiceURIRef.current)
      let idx = 0
      const next = () => {
        if (disposed || phaseRef.current !== "speaking") return
        if (idx >= chunks.length) { goIdle(); return }
        const u = new SpeechSynthesisUtterance(chunks[idx++])
        if (v && !IS_MOBILE) u.voice = v
        u.lang = "pt-BR"
        u.rate = IS_MOBILE ? 0.9 : 1.5
        u.pitch = 1
        u.onend = next
        u.onerror = next
        try {
          synth.resume()
          synth.speak(u)
        } catch { next() }
      }
      next()
    }

    function interruptSpeech() {
      if (phaseRef.current === "speaking") {
        setPhase("idle")
        try { const a = getSharedAudio(); a.pause(); a.currentTime = 0 } catch {}
        try { synth?.cancel() } catch {}
      }
    }

    async function onUtterance(text: string) {
      if (disposed) return
      if (!text.trim()) { goIdle(); return }
      const history = [...messagesRef.current, { role: "user" as const, content: text }]
      setMessages(history)
      setPhase("thinking")
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history.slice(-6), now: new Date().toLocaleString("pt-BR"), mode: "voice", tz: new Date().getTimezoneOffset() }),
        })
        const reply = (await res.text()).trim() || "Desculpe, não consegui responder agora."
        if (disposed) return
        if (handleRateLimit(reply)) return
        setMessages((m) => [...m, { role: "assistant", content: reply }])
        speak(reply)
      } catch {
        if (disposed) return
        setMessages((m) => [...m, { role: "assistant", content: "Tive um problema de conexão." }])
        goIdle()
      }
    }

    // ---- Caminho Whisper (Safari e navegadores sem SpeechRecognition) ----
    let mediaRec: MediaRecorder | null = null
    let mediaStream: MediaStream | null = null

    async function startHoldWhisper() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (disposed) { stream.getTracks().forEach((t) => t.stop()); return }
        mediaStream = stream
        const chunks: Blob[] = []
        const mr = new MediaRecorder(stream)
        mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
        mr.onstop = async () => {
          mediaStream?.getTracks().forEach((t) => t.stop())
          mediaStream = null
          const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" })
          if (disposed || blob.size === 0) { goIdle(); return }
          setPhase("thinking")
          try {
            const form = new FormData()
            const ext = (mr.mimeType || "").includes("mp4") ? "mp4" : "webm"
            form.append("file", blob, `audio.${ext}`)
            const res = await fetch("/api/ai/transcribe", { method: "POST", body: form })
            const data = res.ok ? await res.json() : { text: "" }
            if (disposed) return
            if (data.text?.trim()) {
              onUtterance(data.text.trim())
            } else {
              setMessages((m) => [...m, { role: "assistant", content: "Não consegui te ouvir — segura o botão e tenta de novo?" }])
              goIdle()
            }
          } catch {
            if (!disposed) goIdle()
          }
        }
        mediaRec = mr
        mr.start()
        setHolding(true)
        setPhase("listening")
        setInterim("Gravando… solte para enviar")
      } catch {
        setError("Não foi possível acessar o microfone. Verifique a permissão do navegador.")
      }
    }

    // Push-to-talk: captura só enquanto o botão é segurado
    function startHold() {
      if (disposed || phaseRef.current === "thinking") return
      unlockSpeech() // toque real → destrava o TTS (mobile)
      interruptSpeech()
      if (USE_WHISPER) { startHoldWhisper(); return }
      try { holdRec?.abort() } catch {}
      const r = new Ctor!()
      r.lang = "pt-BR"
      r.continuous = true
      r.interimResults = true
      buffer = ""
      interimText = ""
      setInterim("")
      r.onresult = (e: any) => {
        let it = ""
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i]
          if (res.isFinal) buffer += res[0].transcript + " "
          else it += res[0].transcript
        }
        interimText = it
        setInterim(it)
      }
      r.onerror = (e: any) => {
        if (e?.error === "not-allowed" || e?.error === "service-not-allowed") setError("Permissão de microfone negada.")
      }
      r.onend = () => {
        const text = (buffer + " " + interimText).replace(/\s+/g, " ").trim()
        buffer = ""
        interimText = ""
        setInterim("")
        if (!disposed) onUtterance(text)
      }
      holdRec = r
      setHolding(true)
      setPhase("listening")
      try { r.start() } catch {}
    }
    function endHold() {
      setHolding(false)
      if (USE_WHISPER) {
        setInterim("")
        try { if (mediaRec && mediaRec.state !== "inactive") mediaRec.stop() } catch {}
        return
      }
      if (holdRec) { try { holdRec.stop() } catch {} }
    }

    startHoldRef.current = startHold
    endHoldRef.current = endHold
    submitRef.current = (t: string) => {
      if (disposed || phaseRef.current === "thinking") return
      interruptSpeech()
      onUtterance(t)
    }

    // Sem briefing automático: a Neuro não fala primeiro. Aqui "tentar de novo"
    // é só sair do descanso — quem começa a conversa é quem segurar o microfone.
    retryRef.current = () => setResting(false)

    return () => {
      disposed = true
      try { holdRec?.abort() } catch {}
      try { if (mediaRec && mediaRec.state !== "inactive") mediaRec.stop() } catch {}
      mediaStream?.getTracks().forEach((t) => t.stop())
      try { sharedAudio?.pause() } catch {}
      try { synth?.cancel() } catch {}
    }
  }, [open])

  const statusLabel = resting
    ? "Descansando 😴"
    : holding ? "Ouvindo…"
    : status === "thinking" ? "Pensando…"
    : status === "speaking" ? "Falando…"
    : "Segure o microfone para falar"

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")

  // ---- A resposta aparecendo enquanto ela fala ----
  //
  // A rota devolve o texto INTEIRO e só depois ele é falado em pedaços. Escrever
  // tudo de uma vez deixaria a resposta lida antes de a voz começar, e aí a
  // leitura corre na frente da fala. Por isso a revelação anda pelo relógio, no
  // ritmo aproximado da voz (lib/transcricao-viva.ts).
  //
  // O que veio do chat escrito fica de fora: já foi lido, e reescrevê-lo letra
  // a letra ao abrir fingiria que a Neuro está falando o que ela disse antes.
  const ultimaFala = messages.length > herdadas && messages[messages.length - 1]?.role === "assistant"
    ? messages[messages.length - 1].content
    : null
  const [revelado, setRevelado] = useState(0)
  const rolagemRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ultimaFala) return
    setRevelado(0)
    const inicio = Date.now()
    // 80ms, não um quadro: a conta é por tempo decorrido, então o passo só
    // decide de quanto em quanto a tela é redesenhada. A 60fps seriam 60
    // renderizações por segundo para revelar uma palavra.
    const id = setInterval(() => {
      const n = charsRevelados(Date.now() - inicio)
      setRevelado(n)
      if (n >= ultimaFala.length) clearInterval(id)
    }, 80)
    return () => clearInterval(id)
  }, [ultimaFala])

  // A voz acabou (ou nem começou, se o TTS falhou) → o texto não pode ficar pela
  // metade esperando um relógio que já não corresponde a nada.
  useEffect(() => {
    if (status === "idle" && !holding) setRevelado(Number.MAX_SAFE_INTEGER)
  }, [status, holding])

  useEffect(() => {
    const el = rolagemRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, revelado, interim])

  // Fechar devolve a conversa ao chat de texto — o que foi falado fica escrito
  // lá, e é o que faz as duas serem UMA. Sem nada novo, nada é devolvido: uma
  // lista nova com o mesmo conteúdo só serviria para marcar a conversa como
  // mexida agora.
  const encerrar = () => {
    if (messagesRef.current.length > herdadas) aoEncerrarRef.current?.(messagesRef.current)
    onClose()
  }

  const needsConfirm =
    !resting && !holding && status === "idle" && !!lastAssistant &&
    /(posso confirmar|confirmar\?|confirma\?)/i.test(lastAssistant.content)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // Fundo OPACO, não translúcido: aqui o dock precisa sumir de verdade.
          // Sem menu em volta, sobra a conversa e o X — é o mesmo raciocínio do
          // Modo Foco, e é o que a borda colorida em volta vem confirmar.
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-background"
        >
          {/* A onda fica no fundo do empilhamento; o conteúdo sobe por cima
              dela, senão a luz passaria por cima do X e do texto. */}
          <OndaSonora estado={estadoDaOnda(status, holding)} />

          <button onClick={encerrar} aria-label="Encerrar conversa" className="absolute right-6 top-6 z-10 rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="h-6 w-6" />
          </button>

          {!supported ? (
            <div className="relative z-10 max-w-sm px-6 text-center">
              <Mic className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                Seu navegador não suporta reconhecimento de voz ao vivo. Use o <strong>Chrome</strong> ou <strong>Edge</strong>.
              </p>
            </div>
          ) : error ? (
            <div className="relative z-10 max-w-sm px-6 text-center"><p className="text-muted-foreground">{error}</p></div>
          ) : (
            <div className="relative z-10 flex w-full max-w-2xl flex-col items-center px-6">
              {/* A conversa inteira, transcrita. O robozinho saiu daqui: com a
                  fala escrita dá para conferir o que ela entendeu e reler o que
                  passou, que é o que falta quando a resposta só existe em áudio. */}
              <div
                ref={rolagemRef}
                className="flex h-[52vh] w-full flex-col gap-5 overflow-y-auto scrollbar-thin px-1"
              >
                {messages.map((m, i) => {
                  const ultima = ultimaFala !== null && i === messages.length - 1 && m.role === "assistant"
                  const texto = ultima ? fecharMarcacao(fatiar(m.content, revelado)) : m.content
                  if (!texto) return null
                  return m.role === "assistant" ? (
                    <div key={i} className="text-foreground">
                      <RichText text={texto} />
                    </div>
                  ) : (
                    <p key={i} className="self-end rounded-2xl bg-secondary/60 px-3.5 py-2 text-sm text-muted-foreground">
                      {m.content}
                    </p>
                  )
                })}

                {/* O que está sendo dito agora, saindo escrito conforme sai da boca. */}
                {holding && interim && (
                  <p className="self-end rounded-2xl bg-secondary/40 px-3.5 py-2 text-sm text-muted-foreground/70">
                    {interim}
                  </p>
                )}
              </div>

              <p className="mt-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                {status === "thinking" && !resting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {statusLabel}
              </p>

              {resting ? (
                <div className="mt-6 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                    <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">
                      Acorde a Neuro com o plano ilimitado <span className="text-[10px] opacity-70">(em breve)</span>
                    </span>
                  </div>
                  <button
                    onClick={() => retryRef.current()}
                    className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Tentar de novo
                  </button>
                </div>
              ) : (
                <>
                  {/* Altura reservada — Sim/Não aparece sem empurrar o microfone */}
                  <div className="mt-5 flex h-11 items-center justify-center gap-2">
                    {needsConfirm && (
                      <>
                        <button
                          onClick={() => submitRef.current("sim")}
                          className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                        >
                          <Check className="h-4 w-4" />
                          Sim
                        </button>
                        <button
                          onClick={() => submitRef.current("não")}
                          className="flex items-center gap-2 rounded-full border border-border/60 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                        >
                          <X className="h-4 w-4" />
                          Não
                        </button>
                      </>
                    )}
                  </div>

                  {/* Botão segurar-para-falar */}
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault()
                      try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
                      startHoldRef.current()
                    }}
                    onPointerUp={(e) => {
                      try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
                      endHoldRef.current()
                    }}
                    onPointerCancel={() => endHoldRef.current()}
                    disabled={status === "thinking"}
                    className={cnMic(holding, status === "thinking")}
                    aria-label="Segure para falar"
                  >
                    {holding && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/40" />}
                    <Mic className="relative h-7 w-7" />
                  </button>

                  <p className="mt-3 text-center text-xs text-muted-foreground/60">
                    Segure o botão para falar e solte para enviar. Use fones para melhor resultado.
                  </p>
                  {IS_SAFARI && (
                    <p className="mt-1.5 text-center text-xs text-muted-foreground/50">
                      No Safari, sua fala é transcrita quando você solta o botão.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function cnMic(holding: boolean, disabled: boolean): string {
  // Botão estático (não muda de tamanho/posição — o usuário segura ele)
  const base = "relative mt-4 flex h-20 w-20 touch-none select-none items-center justify-center rounded-full text-white shadow-lg transition-colors"
  if (disabled) return base + " bg-muted text-muted-foreground opacity-50"
  if (holding) return base + " bg-red-500"
  return base + " bg-primary hover:opacity-90"
}
