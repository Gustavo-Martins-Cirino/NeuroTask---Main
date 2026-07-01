"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Hand, Loader2, Mic, AudioLines } from "lucide-react"
import { OwlMascot } from "@/components/owl-mascot"

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

  const phaseRef = useRef<Status>("idle")
  const messagesRef = useRef<Msg[]>([])
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const voiceURIRef = useRef("")
  const interruptRef = useRef<() => void>(() => {})

  phaseRef.current = status
  messagesRef.current = messages
  voicesRef.current = voices
  voiceURIRef.current = voiceURI

  // Vozes do sistema (prioriza pt-BR)
  useEffect(() => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null
    if (!synth) return
    const load = () => {
      const all = synth.getVoices()
      const pt = all.filter((v) => v.lang?.toLowerCase().startsWith("pt"))
      const list = pt.length ? pt : all
      setVoices(list)
      setVoiceURI((prev) => prev || list[0]?.voiceURI || "")
    }
    load()
    synth.addEventListener("voiceschanged", load)
    return () => synth.removeEventListener("voiceschanged", load)
  }, [])

  useEffect(() => {
    if (!open) return
    const Ctor = getRecognitionCtor()
    if (!Ctor) { setSupported(false); return }
    setSupported(true)
    setError(null)
    setMessages([])
    setInterim("")

    const synth = window.speechSynthesis
    let disposed = false
    let buffer = ""
    let interimText = ""
    let silenceTimer: ReturnType<typeof setTimeout> | null = null
    let speakStart = 0

    const setPhase = (s: Status) => { phaseRef.current = s; setStatus(s) }

    const rec = new Ctor()
    rec.lang = "pt-BR"
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (e: any) => {
      if (phaseRef.current === "thinking") return
      // Barge-in: se a IA está falando e o usuário fala, interrompe e captura
      // (carência de 500ms p/ não cortar no eco do início da fala da IA)
      if (phaseRef.current === "speaking") {
        if (performance.now() - speakStart > 500) interrupt()
        else return
      }
      let it = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) buffer += r[0].transcript + " "
        else it += r[0].transcript
      }
      interimText = it
      setInterim(it)
      if (silenceTimer) clearTimeout(silenceTimer)
      if (buffer.trim() || it.trim()) silenceTimer = setTimeout(finishUtterance, 1200)
    }
    rec.onerror = (e: any) => {
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        setError("Permissão de microfone negada.")
        disposed = true
      }
    }
    rec.onend = () => {
      if (!disposed) { try { rec.start() } catch {} }
    }

    function finishUtterance() {
      if (disposed || phaseRef.current !== "listening") return
      const text = (buffer + " " + interimText).replace(/\s+/g, " ").trim()
      buffer = ""
      interimText = ""
      setInterim("")
      if (text) onUtterance(text)
    }

    async function onUtterance(text: string) {
      if (disposed) return
      if (silenceTimer) clearTimeout(silenceTimer)
      const history = [...messagesRef.current, { role: "user" as const, content: text }]
      setMessages(history)
      setPhase("thinking")
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history.slice(-8), now: new Date().toLocaleString("pt-BR"), mode: "voice" }),
        })
        const reply = (await res.text()).trim() || "Desculpe, não consegui responder agora."
        if (disposed) return
        setMessages((m) => [...m, { role: "assistant", content: reply }])
        speak(reply)
      } catch {
        if (disposed) return
        setMessages((m) => [...m, { role: "assistant", content: "Tive um problema de conexão." }])
        backToListening()
      }
    }

    function backToListening() {
      if (disposed) return
      buffer = ""
      interimText = ""
      setInterim("")
      setPhase("listening")
    }

    function speak(text: string) {
      if (disposed || !synth) { backToListening(); return }
      try { synth.cancel() } catch {}
      const clean = stripForSpeech(text)
      const chunks = clean.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [clean]
      const v = voicesRef.current.find((x) => x.voiceURI === voiceURIRef.current)
      setPhase("speaking")
      speakStart = performance.now()
      let idx = 0
      const next = () => {
        if (disposed || phaseRef.current !== "speaking") return
        if (idx >= chunks.length) { backToListening(); return }
        const u = new SpeechSynthesisUtterance(chunks[idx++])
        if (v) u.voice = v
        u.lang = v?.lang || "pt-BR"
        u.rate = 1.15
        u.pitch = 1
        u.onend = next
        u.onerror = next
        try { synth.speak(u) } catch { next() }
      }
      next()
    }

    function interrupt() {
      if (phaseRef.current !== "speaking") return
      backToListening() // muda a fase ANTES de cancelar p/ o next() não retomar
      try { synth?.cancel() } catch {}
    }
    interruptRef.current = interrupt

    setPhase("listening")
    try { rec.start() } catch {}

    return () => {
      disposed = true
      if (silenceTimer) clearTimeout(silenceTimer)
      try { rec.onend = null; rec.abort() } catch {}
      try { synth?.cancel() } catch {}
    }
  }, [open])

  const statusLabel =
    status === "listening" ? "Ouvindo…" :
    status === "thinking" ? "Pensando…" :
    status === "speaking" ? "Falando…" : "Iniciando…"

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")

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

          {voices.length > 0 && (
            <div className="absolute left-6 top-6 flex items-center gap-2 text-sm text-muted-foreground">
              <AudioLines className="h-4 w-4" />
              <select
                value={voiceURI}
                onChange={(e) => setVoiceURI(e.target.value)}
                className="max-w-[200px] rounded-lg border border-border/50 bg-transparent px-2 py-1 text-xs outline-none focus:border-primary/40"
              >
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                ))}
              </select>
            </div>
          )}

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
              <OwlMascot status={status} />

              <p className="mt-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                {status === "thinking" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {statusLabel}
              </p>

              <p className="mt-3 min-h-6 text-center text-lg text-foreground">{interim}</p>

              {lastAssistant && (
                <motion.div
                  key={lastAssistant.content}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 max-h-[28vh] w-full overflow-y-auto rounded-2xl border border-border/40 bg-card/50 p-4 text-foreground scrollbar-thin"
                >
                  <RichText text={lastAssistant.content} />
                </motion.div>
              )}

              <button
                onClick={() => interruptRef.current()}
                disabled={status !== "speaking"}
                className="mt-6 flex items-center gap-2 rounded-full border border-border/50 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-30"
              >
                <Hand className="h-4 w-4" />
                Interromper
              </button>

              <p className="mt-3 text-center text-xs text-muted-foreground/60">
                Fale naturalmente — quando você pausar, a Neuro responde. Use fones para melhor resultado.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
