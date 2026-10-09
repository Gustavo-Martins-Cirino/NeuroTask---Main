// O que o servidor aceita como áudio para transcrever, e como a tela explica
// quando ele recusa.
//
// A rota repassa o arquivo ao Whisper do Groq com a chave do APP: sem teto, uma
// conta logada mandava o quanto quisesse por conta da cota de todo mundo. O
// teto fica abaixo dos 4,5 MB que a Vercel aceita no corpo de uma função —
// acima disso a plataforma corta antes da rota, com uma resposta que a tela
// não saberia explicar. Fala gravada em opus dá uns 0,25 MB por minuto, então
// 4 MB são mais de 15 minutos.
//
// O corpo da resposta de erro NUNCA vai para a tela: era por ali que o JSON
// cru do Groq aparecia no chat como fala da Neuro. A frase sai do status.

export const MAX_AUDIO_BYTES = 4 * 1024 * 1024

/**
 * O MediaRecorder grava webm (Chrome), ogg (Firefox) ou mp4 (Safari), e há
 * navegador que rotula áudio puro como `video/webm`. Tipo vazio passa: quem
 * confere o conteúdo é o Whisper — o que este filtro barra é o que claramente
 * não é áudio.
 */
export function tipoDeAudioAceito(tipo: string): boolean {
  const base = tipo.split(";")[0].trim().toLowerCase()
  return base === "" || base.startsWith("audio/") || base === "video/webm" || base === "video/mp4"
}

const EXTENSOES = new Set(["webm", "ogg", "mp4", "m4a", "mp3", "wav"])

/** O nome que vai para o Groq: só a extensão de quem mandou, e só se for de áudio. */
export function nomeDoAudio(nome: string | undefined): string {
  const ext = nome?.includes(".") ? nome.split(".").pop()?.toLowerCase() : undefined
  return `audio.${ext && EXTENSOES.has(ext) ? ext : "webm"}`
}

export type FalhaDeTranscricao = "audioLongo" | "limite" | "generica"

export function falhaDaTranscricao(status: number): FalhaDeTranscricao {
  if (status === 413) return "audioLongo"
  if (status === 429) return "limite"
  return "generica"
}
