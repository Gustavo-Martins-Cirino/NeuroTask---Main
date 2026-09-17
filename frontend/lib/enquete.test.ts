import { describe, it, expect } from "vitest"
import {
  DIAS_DE_SILENCIO, PERGUNTAS, adiado, comResposta, mensagemDaResposta, mostrada,
  proximaPergunta, saneiaEstado, type EstadoEnquete,
} from "./enquete"

const AGORA = Date.UTC(2026, 7, 27, 12, 0)
/** Um pouco depois do silêncio de uma semana ter passado. */
const PASSADA_A_SEMANA = AGORA + (DIAS_DE_SILENCIO * 24 + 1) * 3_600_000
const VAZIO: EstadoEnquete = { respondidas: [], adiadoAte: 0 }

describe("as perguntas", () => {
  // O texto e as opções moram no dicionário e são cobrados em lib/i18n.test.ts
  // — inclusive que inglês e português têm as mesmas opções na mesma ordem.
  it("têm id único", () => {
    expect(PERGUNTAS.length).toBeGreaterThan(0)
    expect(new Set(PERGUNTAS).size).toBe(PERGUNTAS.length)
  })
})

describe("saneiaEstado", () => {
  it("o que não é estado vira estado vazio, sem quebrar", () => {
    for (const v of [null, undefined, 42, "x", [], { respondidas: "não é lista" }]) {
      expect(saneiaEstado(v)).toEqual(VAZIO)
    }
  })

  it("descarta id que não existe mais no código", () => {
    // Tirar uma pergunta da lista não pode virar erro para quem já a respondeu.
    const e = saneiaEstado({ respondidas: [PERGUNTAS[0], "pergunta-que-saiu"], adiadoAte: 0 })
    expect(e.respondidas).toEqual([PERGUNTAS[0]])
  })

  it("não guarda id repetido nem adiamento impossível", () => {
    const e = saneiaEstado({ respondidas: [PERGUNTAS[0], PERGUNTAS[0]], adiadoAte: Number.NaN })
    expect(e.respondidas).toEqual([PERGUNTAS[0]])
    expect(e.adiadoAte).toBe(0)
  })
})

describe("proximaPergunta", () => {
  it("começa pela primeira e segue a ordem declarada", () => {
    expect(proximaPergunta(VAZIO, AGORA)).toBe(PERGUNTAS[0])
    const depois = comResposta(VAZIO, PERGUNTAS[0], AGORA)
    expect(proximaPergunta(depois, PASSADA_A_SEMANA)).toBe(PERGUNTAS[1])
  })

  it("nunca repete uma já respondida", () => {
    let estado = VAZIO
    let quando = AGORA
    for (const p of PERGUNTAS) {
      expect(proximaPergunta(estado, quando)).toBe(p)
      estado = comResposta(estado, p, quando)
      quando += (DIAS_DE_SILENCIO * 24 + 1) * 3_600_000
    }
    expect(proximaPergunta(estado, quando)).toBeNull()
  })

  it("'agora não' cala a enquete INTEIRA, não só a pergunta recusada", () => {
    // Emendar outra pergunta em quem acabou de dizer "não quero" é o incômodo
    // que faz parar de responder qualquer uma.
    const estado = adiado(VAZIO, AGORA)
    expect(proximaPergunta(estado, AGORA)).toBeNull()
    expect(proximaPergunta(estado, AGORA + 60_000)).toBeNull()
  })

  it("passado o prazo, ela volta — e volta na mesma pergunta", () => {
    const estado = adiado(VAZIO, AGORA)
    const depois = AGORA + (DIAS_DE_SILENCIO * 24 + 1) * 3_600_000
    expect(proximaPergunta(estado, depois)).toBe(PERGUNTAS[0])
  })

  it("responder compra a semana inteira de silêncio — era o bug", () => {
    // O código antigo gravava `adiadoAte: 0` com um comentário dizendo o
    // contrário: a pergunta seguinte aparecia na visita imediata.
    const estado = comResposta(VAZIO, PERGUNTAS[0], AGORA)
    expect(estado.respondidas).toEqual([PERGUNTAS[0]])
    expect(proximaPergunta(estado, AGORA)).toBeNull()
    expect(proximaPergunta(estado, AGORA + 3 * 86_400_000)).toBeNull()
    expect(proximaPergunta(estado, PASSADA_A_SEMANA)).toBe(PERGUNTAS[1])
  })

  it("só ter APARECIDO já cala a semana — quem ignorou não é perguntado de novo", () => {
    const estado = mostrada(VAZIO, AGORA)
    expect(proximaPergunta(estado, AGORA + 86_400_000)).toBeNull()
    expect(proximaPergunta(estado, PASSADA_A_SEMANA)).toBe(PERGUNTAS[0])
  })
})

describe("comResposta", () => {
  it("responder de novo não duplica o id", () => {
    const uma = comResposta(VAZIO, PERGUNTAS[0], AGORA)
    expect(comResposta(uma, PERGUNTAS[0], AGORA).respondidas).toEqual([PERGUNTAS[0]])
  })

  it("responder depois de ter adiado reinicia a semana a partir da resposta", () => {
    const estado = comResposta(adiado(VAZIO, AGORA), PERGUNTAS[0], AGORA + 1000)
    expect(estado.adiadoAte).toBe(AGORA + 1000 + DIAS_DE_SILENCIO * 86_400_000)
  })
})

describe("adiado", () => {
  it("compra os dias combinados", () => {
    expect(adiado(VAZIO, AGORA).adiadoAte).toBe(AGORA + DIAS_DE_SILENCIO * 86_400_000)
  })

  it("prazo impossível cai no padrão em vez de calar para sempre", () => {
    expect(adiado(VAZIO, AGORA, 0).adiadoAte).toBe(AGORA + DIAS_DE_SILENCIO * 86_400_000)
    expect(adiado(VAZIO, AGORA, Number.NaN).adiadoAte).toBe(AGORA + DIAS_DE_SILENCIO * 86_400_000)
  })

  it("não apaga o que já foi respondido", () => {
    const estado = adiado(comResposta(VAZIO, PERGUNTAS[0], AGORA), AGORA)
    expect(estado.respondidas).toEqual([PERGUNTAS[0]])
  })
})

describe("mensagemDaResposta", () => {
  it("sai legível no painel do dono, sem ferramenta no meio", () => {
    const pergunta = "O que te fez abrir o NeuroTask hoje?"
    const linha = mensagemDaResposta(pergunta, "Curiosidade")
    expect(linha).toContain(pergunta)
    expect(linha).toContain("Curiosidade")
    expect(linha.startsWith("[enquete]")).toBe(true)
  })
})
