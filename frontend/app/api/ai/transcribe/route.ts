import { createClient } from "@/lib/supabase/server"
import { MAX_AUDIO_BYTES, nomeDoAudio, tipoDeAudioAceito } from "@/lib/audio-transcricao"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Não autorizado", { status: 401 })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.error("[transcribe] GROQ_API_KEY ausente")
    return new Response(null, { status: 503 })
  }

  // O teto vem antes de ler o corpo: pelo cabeçalho, quando ele existe, e pelo
  // tamanho do arquivo depois (ver lib/audio-transcricao.ts).
  const declarado = Number(req.headers.get("content-length") ?? 0)
  if (declarado > MAX_AUDIO_BYTES + 64 * 1024) return new Response(null, { status: 413 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return new Response("Requisição inválida", { status: 400 })
  }

  const file = form.get("file")
  if (!(file instanceof Blob) || file.size === 0) {
    return new Response("Áudio ausente", { status: 400 })
  }
  if (file.size > MAX_AUDIO_BYTES) return new Response(null, { status: 413 })
  if (!tipoDeAudioAceito(file.type)) return new Response(null, { status: 415 })

  const idiomaRecebido = form.get("language")
  const language = idiomaRecebido === "en" ? "en" : "pt"

  const groqForm = new FormData()
  groqForm.append("file", file, nomeDoAudio(file instanceof File ? file.name : undefined))
  groqForm.append("model", "whisper-large-v3-turbo")
  groqForm.append("language", language)
  groqForm.append("response_format", "json")

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: groqForm,
  })

  // O erro do Groq fica no log: a tela mostrava o corpo desta resposta como
  // fala da Neuro, e era o JSON cru dele que aparecia no chat.
  if (!res.ok) {
    const detalhe = await res.text().catch(() => "")
    console.warn("[transcribe]", res.status, detalhe.slice(0, 500))
    return new Response(null, { status: res.status === 429 ? 429 : 502 })
  }

  const data = await res.json()
  return Response.json({ text: (data.text ?? "").trim() })
}
