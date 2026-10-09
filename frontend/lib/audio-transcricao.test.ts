import { describe, expect, it } from "vitest"
import { MAX_AUDIO_BYTES, falhaDaTranscricao, nomeDoAudio, tipoDeAudioAceito } from "./audio-transcricao"

describe("MAX_AUDIO_BYTES", () => {
  it("fica abaixo do corpo máximo de uma função da Vercel (4,5 MB)", () => {
    expect(MAX_AUDIO_BYTES).toBeLessThan(4.5 * 1024 * 1024)
  })
})

describe("tipoDeAudioAceito", () => {
  it.each(["audio/webm;codecs=opus", "audio/ogg; codecs=opus", "audio/mp4", "AUDIO/WEBM", "video/webm", "video/mp4", ""])(
    "aceita %j (o que os navegadores gravam)",
    (tipo) => {
      expect(tipoDeAudioAceito(tipo)).toBe(true)
    },
  )

  it.each(["image/png", "text/html", "application/pdf", "application/octet-stream", "video/quicktime"])(
    "recusa %j",
    (tipo) => {
      expect(tipoDeAudioAceito(tipo)).toBe(false)
    },
  )
})

describe("nomeDoAudio", () => {
  it("mantém a extensão de áudio de quem mandou", () => {
    expect(nomeDoAudio("audio.mp4")).toBe("audio.mp4")
    expect(nomeDoAudio("gravacao.OGG")).toBe("audio.ogg")
  })

  it("nome estranho vira audio.webm — nada do que a pessoa escreveu segue adiante", () => {
    expect(nomeDoAudio("../../etc/passwd")).toBe("audio.webm")
    expect(nomeDoAudio("foto.png")).toBe("audio.webm")
    expect(nomeDoAudio("audio")).toBe("audio.webm")
    expect(nomeDoAudio("x.webm\r\nContent-Type: text/html")).toBe("audio.webm")
    expect(nomeDoAudio(undefined)).toBe("audio.webm")
    expect(nomeDoAudio("")).toBe("audio.webm")
  })
})

describe("falhaDaTranscricao", () => {
  it("413 é áudio longo, 429 é limite, o resto é genérico", () => {
    expect(falhaDaTranscricao(413)).toBe("audioLongo")
    expect(falhaDaTranscricao(429)).toBe("limite")
    expect(falhaDaTranscricao(502)).toBe("generica")
    expect(falhaDaTranscricao(415)).toBe("generica")
    expect(falhaDaTranscricao(503)).toBe("generica")
  })
})
