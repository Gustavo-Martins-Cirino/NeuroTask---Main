import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Não autorizado", { status: 401 })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return new Response(
      "A transcrição de voz usa o Whisper do Groq. Adicione GROQ_API_KEY ao .env.local.",
      { status: 503 }
    )
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return new Response("Requisição inválida", { status: 400 })
  }

  const file = form.get("file")
  if (!(file instanceof Blob)) {
    return new Response("Áudio ausente", { status: 400 })
  }

  const groqForm = new FormData()
  groqForm.append("file", file, "audio.webm")
  groqForm.append("model", "whisper-large-v3-turbo")
  groqForm.append("language", "pt")
  groqForm.append("response_format", "json")

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: groqForm,
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    return new Response(`Falha ao transcrever. ${detail}`.trim(), { status: res.status || 502 })
  }

  const data = await res.json()
  return Response.json({ text: (data.text ?? "").trim() })
}
