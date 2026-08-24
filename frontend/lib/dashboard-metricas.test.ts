import { describe, it, expect } from "vitest"
import {
  chaveDoDia, concluidasPorDia, constanciaNaSemana, porHoraDoDia,
  diaMaisConstante, horaMaisProdutiva, rotuloDeHora, totalNoPeriodo,
  sentidoDaTroca,
  DIAS_DA_SEMANA,
} from "./dashboard-metricas"

// Todas as datas vêm do construtor LOCAL de propósito: é o que faz o teste dar o
// mesmo resultado no fuso do Brasil e no de um runner em UTC.
const em = (ano: number, mes: number, dia: number, hora = 12) => new Date(ano, mes - 1, dia, hora)

// 17/08/2026 é uma segunda-feira.
const SEGUNDA = em(2026, 8, 17)

describe("chaveDoDia", () => {
  it("usa o dia LOCAL — o que foi feito às 22h fica no dia em que a pessoa viveu", () => {
    // Com toISOString() isto viraria o dia 18 em qualquer fuso negativo, e a
    // noite de trabalho de segunda apareceria como terça.
    expect(chaveDoDia(em(2026, 8, 17, 22))).toBe("2026-08-17")
    expect(chaveDoDia(em(2026, 8, 17, 0))).toBe("2026-08-17")
  })

  it("preenche mês e dia com zero à esquerda", () => {
    expect(chaveDoDia(em(2026, 1, 5))).toBe("2026-01-05")
  })
})

describe("concluidasPorDia", () => {
  it("devolve exatamente a janela pedida, terminando hoje", () => {
    const pontos = concluidasPorDia([], SEGUNDA, 14)
    expect(pontos).toHaveLength(14)
    expect(pontos[13].chave).toBe("2026-08-17")
    expect(pontos[0].chave).toBe("2026-08-04")
  })

  it("dia sem conclusão nenhuma entra como zero, e NÃO some da lista", () => {
    // É a razão de a função existir: pular o dia vazio encurtaria o eixo e faria
    // uma semana parada parecer uma subida contínua.
    const pontos = concluidasPorDia([em(2026, 8, 17)], SEGUNDA, 3)
    expect(pontos.map((p) => p.total)).toEqual([0, 0, 1])
  })

  it("soma várias conclusões no mesmo dia", () => {
    const datas = [em(2026, 8, 17, 9), em(2026, 8, 17, 14), em(2026, 8, 17, 23)]
    expect(concluidasPorDia(datas, SEGUNDA, 1)[0].total).toBe(3)
  })

  it("ignora o que está fora da janela em vez de somar na borda", () => {
    const pontos = concluidasPorDia([em(2026, 7, 1)], SEGUNDA, 14)
    expect(totalNoPeriodo(pontos)).toBe(0)
  })

  it("atravessa a virada do mês sem buraco", () => {
    const pontos = concluidasPorDia([], em(2026, 3, 2), 4)
    expect(pontos.map((p) => p.chave)).toEqual([
      "2026-02-27", "2026-02-28", "2026-03-01", "2026-03-02",
    ])
  })

  it("o rótulo é dd/mm", () => {
    expect(concluidasPorDia([], em(2026, 1, 5), 1)[0].rotulo).toBe("05/01")
  })
})

describe("constanciaNaSemana", () => {
  it("a semana começa na segunda", () => {
    expect(DIAS_DA_SEMANA[0]).toBe("Seg")
    expect(DIAS_DA_SEMANA[6]).toBe("Dom")
    expect(constanciaNaSemana([], SEGUNDA).map((p) => p.rotulo)).toEqual([...DIAS_DA_SEMANA])
  })

  it("conta em quantas segundas houve algo, não quantas tarefas", () => {
    // Um mutirão de 5 tarefas numa segunda só não é hábito — é uma segunda.
    const mutirao = [1, 2, 3, 4, 5].map(() => em(2026, 8, 17, 10))
    const seg = constanciaNaSemana(mutirao, SEGUNDA, 4)[0]
    expect(seg.diasComAlgo).toBe(1)
    expect(seg.diasContados).toBe(4)
    expect(seg.taxa).toBeCloseTo(0.25)
  })

  it("quatro segundas seguidas dão constância cheia", () => {
    const datas = [em(2026, 8, 17), em(2026, 8, 10), em(2026, 8, 3), em(2026, 7, 27)]
    const seg = constanciaNaSemana(datas, SEGUNDA, 4)[0]
    expect(seg.diasComAlgo).toBe(4)
    expect(seg.taxa).toBe(1)
  })

  it("a janela cobre semanas inteiras — todo dia da semana é contado igual", () => {
    const pontos = constanciaNaSemana([], SEGUNDA, 4)
    for (const p of pontos) expect(p.diasContados).toBe(4)
    expect(pontos.reduce((s, p) => s + p.diasContados, 0)).toBe(28)
  })

  it("a taxa nunca passa de 1 nem fica negativa", () => {
    const muitas = Array.from({ length: 40 }, (_, i) => em(2026, 8, 17, i % 24))
    for (const p of constanciaNaSemana(muitas, SEGUNDA, 4)) {
      expect(p.taxa).toBeGreaterThanOrEqual(0)
      expect(p.taxa).toBeLessThanOrEqual(1)
    }
  })
})

describe("porHoraDoDia", () => {
  it("sempre 24 baldes, inclusive os vazios", () => {
    // A barra ausente leria como "sem dado"; o vale das 3h faz parte da resposta.
    const pontos = porHoraDoDia([])
    expect(pontos).toHaveLength(24)
    expect(pontos.map((p) => p.hora)).toEqual(Array.from({ length: 24 }, (_, i) => i))
    expect(pontos.every((p) => p.total === 0)).toBe(true)
  })

  it("agrupa pela hora local", () => {
    const pontos = porHoraDoDia([em(2026, 8, 17, 14), em(2026, 8, 18, 14), em(2026, 8, 19, 9)])
    expect(pontos[14].total).toBe(2)
    expect(pontos[9].total).toBe(1)
    expect(pontos[0].total).toBe(0)
  })

  it("meia-noite cai no balde 0, não no 24", () => {
    expect(porHoraDoDia([em(2026, 8, 17, 0)])[0].total).toBe(1)
  })
})

describe("as manchetes", () => {
  it("sem dado nenhum não coroa ninguém", () => {
    // Sem isto, a tela anunciaria "seu melhor dia é segunda" com 0% — pior que
    // não dizer nada, porque parece um fato.
    expect(diaMaisConstante(constanciaNaSemana([], SEGUNDA))).toBeNull()
    expect(horaMaisProdutiva(porHoraDoDia([]))).toBeNull()
  })

  it("acha o dia mais constante", () => {
    const datas = [
      em(2026, 8, 14), em(2026, 8, 7), em(2026, 7, 31), // três sextas
      em(2026, 8, 17),                                   // uma segunda
    ]
    const melhor = diaMaisConstante(constanciaNaSemana(datas, SEGUNDA, 4))
    expect(melhor?.rotulo).toBe("Sex")
    expect(melhor?.diasComAlgo).toBe(3)
  })

  it("acha a hora mais produtiva", () => {
    const datas = [em(2026, 8, 17, 21), em(2026, 8, 16, 21), em(2026, 8, 15, 8)]
    expect(horaMaisProdutiva(porHoraDoDia(datas))?.hora).toBe(21)
  })
})

describe("rotuloDeHora", () => {
  it("24h", () => {
    expect(rotuloDeHora(0, false)).toBe("0h")
    expect(rotuloDeHora(14, false)).toBe("14h")
  })

  it("12h acerta os dois cantos onde AM/PM costuma errar", () => {
    expect(rotuloDeHora(0, true)).toBe("12 AM")
    expect(rotuloDeHora(12, true)).toBe("12 PM")
    expect(rotuloDeHora(14, true)).toBe("2 PM")
    expect(rotuloDeHora(11, true)).toBe("11 AM")
  })
})

describe("sentidoDaTroca", () => {
  it("aba à direita entra pela direita", () => {
    expect(sentidoDaTroca(0, 1)).toBe(1)
    expect(sentidoDaTroca(0, 2)).toBe(1)
  })

  it("aba à esquerda entra pela esquerda", () => {
    expect(sentidoDaTroca(2, 0)).toBe(-1)
    expect(sentidoDaTroca(1, 0)).toBe(-1)
  })

  it("clicar na aba já ativa não inventa um terceiro caso", () => {
    expect(sentidoDaTroca(1, 1)).toBe(1)
  })
})
