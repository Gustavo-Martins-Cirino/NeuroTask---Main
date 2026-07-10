import { createClient } from "@/lib/supabase/server"
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts"
import { Readable } from "stream"

export const runtime = "nodejs"

// Voz ÚNICA do NeuroTask (server-side): mesma voz e velocidade em qualquer
// dispositivo/navegador. Voz neural pt-BR masculina via serviço do Edge.
// GET com streaming: o <audio> começa a tocar com os primeiros bytes,
// sem esperar o áudio completo (reduz muito o delay).
const VOICE = "pt-BR-AntonioNeural"
const RATE = "+8%" // velocidade única, controlada por nós
const VOLUME = "+40%" // as vozes do Edge são mais baixas que o TTS nativo

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Não autorizado", { status: 401 })

  const { searchParams } = new URL(req.url)
  const text = (searchParams.get("text") ?? "").trim().slice(0, 900)
  if (!text) return new Response("Texto vazio", { status: 400 })

  try {
    const tts = new MsEdgeTTS()
    await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
    const { audioStream } = tts.toStream(text, { rate: RATE, volume: VOLUME })
    const web = Readable.toWeb(audioStream as unknown as Readable) as ReadableStream
    return new Response(web, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-cache" },
    })
  } catch {
    return new Response("Falha ao gerar áudio", { status: 502 })
  }
}
