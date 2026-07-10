import { createClient } from "@/lib/supabase/server"
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts"

export const runtime = "nodejs"

// Voz ÚNICA do NeuroTask (server-side): mesma voz e velocidade em qualquer
// dispositivo/navegador. Voz neural pt-BR masculina via serviço do Edge.
// Áudio completo (sem streaming): players mobile rejeitam stream sem tamanho.
const VOICE = "pt-BR-AntonioNeural"
const RATE = "+8%" // velocidade única, controlada por nós

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Não autorizado", { status: 401 })

  let body: { text?: string }
  try {
    body = await req.json()
  } catch {
    return new Response("Requisição inválida", { status: 400 })
  }
  const text = (body.text ?? "").trim().slice(0, 900)
  if (!text) return new Response("Texto vazio", { status: 400 })

  try {
    const tts = new MsEdgeTTS()
    await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
    const { audioStream } = tts.toStream(text, { rate: RATE })
    const chunks: Buffer[] = []
    for await (const c of audioStream) chunks.push(c as Buffer)
    const buf = Buffer.concat(chunks)
    if (buf.length === 0) throw new Error("áudio vazio")
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-cache" },
    })
  } catch {
    return new Response("Falha ao gerar áudio", { status: 502 })
  }
}
