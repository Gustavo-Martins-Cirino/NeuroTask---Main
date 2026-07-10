"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Mic, Loader2, RotateCcw, Sparkles, Check } from "lucide-react"
import { RobotMascot } from "@/components/robot-mascot"
import { getCachedBriefing, setCachedBriefing } from "@/lib/briefing-cache"

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
      // 1 quadro de silêncio (WAV mínimo) só para "carimbar" a permissão
      a.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA="
    }
    a.muted = true
    a.play().then(() => { a.pause(); a.muted = false }).catch(() => { a.muted = false })
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

export function VoiceConversation({ open, onClose }: { open: boolean; onClose: () => void }) {
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
    setMessages([])
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

    // Voz ÚNICA (servidor): mesmo áudio em qualquer dispositivo/navegador
    async function speak(text: string) {
      const clean = stripForSpeech(text)
      if (disposed || !clean) { goIdle(); return }
      setPhase("speaking")
      try {
        const res = await fetch("/api/ai/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: clean }),
        })
        if (!res.ok) throw new Error("tts indisponível")
        const blob = await res.blob()
        if (disposed || phaseRef.current !== "speaking") return
        const audio = getSharedAudio()
        try { audio.pause() } catch {}
        const url = URL.createObjectURL(blob)
        audio.src = url
        audio.onended = () => {
          URL.revokeObjectURL(url)
          if (!disposed && phaseRef.current === "speaking") goIdle()
        }
        audio.onerror = () => {
          URL.revokeObjectURL(url)
          if (!disposed && phaseRef.current === "speaking") goIdle()
        }
        await audio.play()
      } catch {
        speakFallback(clean) // reserva: TTS do navegador
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

    async function doBriefing() {
      const cached = getCachedBriefing()
      if (cached) {
        setMessages([{ role: "assistant", content: cached }])
        speak(cached)
        return
      }
      setPhase("thinking")
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [], mode: "briefing", now: new Date().toLocaleString("pt-BR"), tz: new Date().getTimezoneOffset() }),
        })
        const reply = (await res.text()).trim()
        if (disposed) return
        if (handleRateLimit(reply)) return
        if (reply) {
          setCachedBriefing(reply)
          setMessages([{ role: "assistant", content: reply }])
          speak(reply)
        } else {
          goIdle()
        }
      } catch {
        if (!disposed) goIdle()
      }
    }
    retryRef.current = () => { setResting(false); doBriefing() }

    doBriefing()

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
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl"
        >
          <button onClick={onClose} aria-label="Encerrar conversa" className="absolute right-6 top-6 rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="h-6 w-6" />
          </button>

          {!supported ? (
            <div className="max-w-sm px-6 text-center">
              <Mic className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                Seu navegador não suporta reconhecimento de voz ao vivo. Use o <strong>Chrome</strong> ou <strong>Edge</strong>.
              </p>
            </div>
          ) : error ? (
            <div className="max-w-sm px-6 text-center"><p className="text-muted-foreground">{error}</p></div>
          ) : (
            <div className="flex w-full max-w-lg flex-col items-center px-6">
              <RobotMascot status={resting ? "resting" : holding ? "listening" : status} />

              <p className="mt-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                {status === "thinking" && !resting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {statusLabel}
              </p>

              {/* Área de mensagem com altura fixa — mantém o botão do microfone no mesmo lugar */}
              <div className="mt-3 flex h-[30vh] w-full flex-col items-center overflow-y-auto scrollbar-thin">
                {holding ? (
                  <p className="text-center text-lg text-foreground">{interim}</p>
                ) : lastAssistant ? (
                  <motion.div
                    key={lastAssistant.content}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full rounded-2xl border border-border/40 bg-card/50 p-4 text-foreground"
                  >
                    <RichText text={lastAssistant.content} />
                  </motion.div>
                ) : null}
              </div>

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
  const base = "relative mt-6 flex h-20 w-20 touch-none select-none items-center justify-center rounded-full text-white shadow-lg transition-colors"
  if (disabled) return base + " bg-muted text-muted-foreground opacity-50"
  if (holding) return base + " bg-red-500"
  return base + " bg-primary hover:opacity-90"
}
