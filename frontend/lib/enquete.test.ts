import { describe, it, expect } from "vitest"
import {
  DIAS_DE_ADIAMENTO, PERGUNTAS, adiado, comResposta, mensagemDaResposta,
  proximaPergunta, saneiaEstado, type EstadoEnquete,
} from "./enquete"

const AGORA = Date.UTC(2026, 7, 27, 12, 0)
const VAZIO: EstadoEnquete = { respondidas: [], adiadoAte: 0 }

describe("as perguntas", () => {
  it("têm id único, texto e opções que cabem num toque", () => {
    const ids = new Set(PERGUNTAS.map((p) => p.id))
    expect(ids.size).toBe(PERGUNTAS.length)
    for (const p of PERGUNTAS) {
      expect(p.texto.length).toBeGreaterThan(10)
      expect(p.opcoes.length).toBeGreaterThanOrEqual(2)
      // Mais que quatro e a pessoa passa a LER a enquete em vez de responder.
      expect(p.opcoes.length).toBeLessThanOrEqual(4)
      expect(new Set(p.opcoes).size).toBe(p.opcoes.length)
    }
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
    const e = saneiaEstado({ respondidas: [PERGUNTAS[0].id, "pergunta-que-saiu"], adiadoAte: 0 })
    expect(e.respondidas).toEqual([PERGUNTAS[0].id])
  })

  it("não guarda id repetido nem adiamento impossível", () => {
    const e = saneiaEstado({ respondidas: [PERGUNTAS[0].id, PERGUNTAS[0].id], adiadoAte: Number.NaN })
    expect(e.respondidas).toEqual([PERGUNTAS[0].id])
    expect(e.adiadoAte).toBe(0)
  })
})

describe("proximaPergunta", () => {
  it("começa pela primeira e segue a ordem declarada", () => {
    expect(proximaPergunta(VAZIO, AGORA)?.id).toBe(PERGUNTAS[0].id)
    const depois = comResposta(VAZIO, PERGUNTAS[0].id)
    expect(proximaPergunta(depois, AGORA)?.id).toBe(PERGUNTAS[1].id)
  })

  it("nunca repete uma já respondida", () => {
    let estado = VAZIO
    for (const p of PERGUNTAS) {
      expect(proximaPergunta(estado, AGORA)?.id).toBe(p.id)
      estado = comResposta(estado, p.id)
    }
    expect(proximaPergunta(estado, AGORA)).toBeNull()
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
    const depois = AGORA + (DIAS_DE_ADIAMENTO * 24 + 1) * 3_600_000
    expect(proximaPergunta(estado, depois)?.id).toBe(PERGUNTAS[0].id)
  })

  it("responder não deixa a próxima entrar no lugar na mesma hora", () => {
    // Quem responde ganha silêncio até a próxima visita: duas perguntas
    // seguidas viram formulário, que é o que a enquete existe para evitar.
    const estado = comResposta(VAZIO, PERGUNTAS[0].id)
    expect(estado.respondidas).toEqual([PERGUNTAS[0].id])
    expect(proximaPergunta(estado, AGORA)?.id).toBe(PERGUNTAS[1].id)
  })
})

describe("comResposta", () => {
  it("responder de novo não duplica o id", () => {
    const uma = comResposta(VAZIO, PERGUNTAS[0].id)
    expect(comResposta(uma, PERGUNTAS[0].id)).toBe(uma)
  })

  it("responder limpa o adiamento", () => {
    const estado = comResposta(adiado(VAZIO, AGORA), PERGUNTAS[0].id)
    expect(estado.adiadoAte).toBe(0)
  })
})

describe("adiado", () => {
  it("compra os dias combinados", () => {
    expect(adiado(VAZIO, AGORA).adiadoAte).toBe(AGORA + DIAS_DE_ADIAMENTO * 86_400_000)
  })

  it("prazo impossível cai no padrão em vez de calar para sempre", () => {
    expect(adiado(VAZIO, AGORA, 0).adiadoAte).toBe(AGORA + DIAS_DE_ADIAMENTO * 86_400_000)
    expect(adiado(VAZIO, AGORA, Number.NaN).adiadoAte).toBe(AGORA + DIAS_DE_ADIAMENTO * 86_400_000)
  })

  it("não apaga o que já foi respondido", () => {
    const estado = adiado(comResposta(VAZIO, PERGUNTAS[0].id), AGORA)
    expect(estado.respondidas).toEqual([PERGUNTAS[0].id])
  })
})

describe("mensagemDaResposta", () => {
  it("sai legível no painel do dono, sem ferramenta no meio", () => {
    const linha = mensagemDaResposta(PERGUNTAS[0], PERGUNTAS[0].opcoes[1])
    expect(linha).toContain(PERGUNTAS[0].texto)
    expect(linha).toContain(PERGUNTAS[0].opcoes[1])
    expect(linha.startsWith("[enquete]")).toBe(true)
  })
})
