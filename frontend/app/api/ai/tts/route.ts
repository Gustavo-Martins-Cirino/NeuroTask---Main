import { createClient } from "@/lib/supabase/server"
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts"
import { textoParaVoz } from "@/lib/texto-da-voz"

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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response("Requisição inválida", { status: 400 })
  }
  // Tipo conferido, cortado e escapado para o XML da voz (lib/texto-da-voz).
  const text = textoParaVoz(body && typeof body === "object" ? (body as { text?: unknown }).text : undefined)
  if (!text) return new Response("Texto vazio", { status: 400 })

  // O serviço de voz do Edge não é oficial e recusa de vez em quando (medido em
  // 17/10: 2 de 6 pedidos espaçados davam erro). Uma segunda tentativa curta
  // resolve a maioria; se as duas falharem, o cliente cai na voz do navegador.
  let ultimoErro: unknown
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const buf = await sintetiza(text)
      return new Response(new Uint8Array(buf), {
        headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-cache" },
      })
    } catch (e) {
      ultimoErro = e
      if (tentativa === 0) await new Promise((r) => setTimeout(r, 400))
    }
  }
  console.warn("[tts]", ultimoErro instanceof Error ? ultimoErro.message : ultimoErro)
  return new Response("Falha ao gerar áudio", { status: 502 })
}

async function sintetiza(text: string): Promise<Buffer> {
  const tts = new MsEdgeTTS()
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
  const { audioStream } = tts.toStream(text, { rate: RATE })
  const chunks: Buffer[] = []
  for await (const c of audioStream) chunks.push(c as Buffer)
  const buf = Buffer.concat(chunks)
  if (buf.length === 0) throw new Error("áudio vazio")
  return buf
}
