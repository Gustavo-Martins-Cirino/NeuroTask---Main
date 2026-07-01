"use client"

import { useEffect, useRef, useState } from "react"
import { Header } from "@/components/header"
import { Bot, Send, Loader2, Sparkles, NotebookPen, Mic, Square, AudioLines } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { VoiceConversation } from "@/components/voice-conversation"

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

export default function AiPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [dayNotes, setDayNotes] = useState("")
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const monitorCtxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("day_notes")
      .select("content")
      .eq("note_date", localDateKey())
      .maybeSingle()
      .then(({ data }) => setDayNotes(data?.content ?? ""))
    const saved = localStorage.getItem("neurotask-ai-chat")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) setMessages(parsed)
      } catch {
        /* ignora histórico inválido */
      }
    }
  }, [])

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("neurotask-ai-chat", JSON.stringify(messages))
    }
  }, [messages])

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
          messages: nextMessages.slice(-8),
          dayNotes,
          now: new Date().toLocaleString("pt-BR"),
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
          copy[copy.length - 1] = { role: "assistant", content: acc }
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

  const clearChat = () => {
    setMessages([])
    localStorage.removeItem("neurotask-ai-chat")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Neuro IA" icon={<Bot className="h-4 w-4" />}>
        <button
          onClick={() => setVoiceOpen(true)}
          className="ml-2 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <AudioLines className="h-3.5 w-3.5" />
          Conversar
        </button>
        {!isEmpty && (
          <button
            onClick={clearChat}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Nova conversa
          </button>
        )}
      </Header>

      <VoiceConversation open={voiceOpen} onClose={() => setVoiceOpen(false)} />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-4">
        <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto py-6">
          {isEmpty ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex h-full flex-col items-center justify-center gap-6 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
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
          className="flex items-end gap-2 rounded-2xl border border-border/50 bg-card/50 p-2 backdrop-blur-sm"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            placeholder="Pergunte qualquer coisa sobre seu dia..."
            rows={1}
            className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          {/* Microfone (gravar voz → transcrever → enviar) */}
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={loading || transcribing}
            aria-label={recording ? "Parar gravação" : "Gravar áudio"}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-40",
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

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
