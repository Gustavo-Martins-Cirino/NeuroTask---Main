import { describe, it, expect } from "vitest"
import { faixasDoDia, fundir, agendaDosProximosDias, type BlocoBruto } from "./faixas-ocupadas"

// Estas faixas vão para uma página PÚBLICA. O erro caro aqui não é estético: é
// mostrar ocupado onde a pessoa está livre (ela perde uma reunião que aceitaria)
// ou livre onde está ocupada (marcam por cima do compromisso dela).

const dia = (d: number) => new Date(2026, 6, d, 0, 0, 0, 0)

const bloco = (
  d: number, hIni: number, mIni: number, hFim: number, mFim: number,
  extra: Partial<BlocoBruto> = {}
): BlocoBruto => ({
  start_time: new Date(2026, 6, d, hIni, mIni).toISOString(),
  end_time: new Date(2026, 6, d, hFim, mFim).toISOString(),
  is_recurring: false,
  recurrence_rule: null,
  ...extra,
})

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
const texto = (fs: { start: Date; end: Date }[]) => fs.map((f) => `${hhmm(f.start)}-${hhmm(f.end)}`).join(" | ")

describe("faixasDoDia — blocos simples", () => {
  it("devolve a faixa do bloco do dia", () => {
    expect(texto(faixasDoDia([bloco(10, 9, 0, 10, 30)], dia(10)))).toBe("09:00-10:30")
  })

  it("ignora bloco de outro dia", () => {
    expect(faixasDoDia([bloco(11, 9, 0, 10, 0)], dia(10))).toHaveLength(0)
  })

  it("ordena por horário, mesmo com entrada bagunçada", () => {
    const fs = faixasDoDia([bloco(10, 15, 0, 16, 0), bloco(10, 9, 0, 10, 0)], dia(10))
    expect(texto(fs)).toBe("09:00-10:00 | 15:00-16:00")
  })

  it("descarta datas inválidas em vez de quebrar a página", () => {
    const ruim: BlocoBruto = { start_time: "nada", end_time: "nada", is_recurring: false, recurrence_rule: null }
    expect(texto(faixasDoDia([ruim, bloco(10, 9, 0, 10, 0)], dia(10)))).toBe("09:00-10:00")
  })
})

describe("faixasDoDia — sobreposição vira uma faixa só", () => {
  it("funde blocos que se sobrepõem", () => {
    expect(texto(faixasDoDia([bloco(10, 9, 0, 11, 0), bloco(10, 10, 0, 12, 0)], dia(10)))).toBe("09:00-12:00")
  })

  it("funde blocos colados (fim de um = início do outro)", () => {
    expect(texto(faixasDoDia([bloco(10, 9, 0, 10, 0), bloco(10, 10, 0, 11, 0)], dia(10)))).toBe("09:00-11:00")
  })

  it("NÃO funde blocos com intervalo entre eles — o buraco é o horário livre", () => {
    expect(texto(faixasDoDia([bloco(10, 9, 0, 10, 0), bloco(10, 11, 0, 12, 0)], dia(10)))).toBe("09:00-10:00 | 11:00-12:00")
  })
})

describe("faixasDoDia — recortes na borda do dia", () => {
  it("bloco que entra pela madrugada começa à meia-noite", () => {
    const atravessa: BlocoBruto = {
      start_time: new Date(2026, 6, 9, 22, 0).toISOString(),
      end_time: new Date(2026, 6, 10, 2, 0).toISOString(),
      is_recurring: false, recurrence_rule: null,
    }
    expect(texto(faixasDoDia([atravessa], dia(10)))).toBe("00:00-02:00")
  })

  it("bloco que vaza para o dia seguinte termina à meia-noite", () => {
    const atravessa: BlocoBruto = {
      start_time: new Date(2026, 6, 10, 22, 0).toISOString(),
      end_time: new Date(2026, 6, 11, 2, 0).toISOString(),
      is_recurring: false, recurrence_rule: null,
    }
    expect(texto(faixasDoDia([atravessa], dia(10)))).toBe("22:00-00:00")
  })
})

describe("faixasDoDia — recorrentes", () => {
  const diario = bloco(1, 8, 0, 9, 0, { is_recurring: true, recurrence_rule: "daily" })

  it("diário aparece em qualquer dia posterior", () => {
    expect(texto(faixasDoDia([diario], dia(20)))).toBe("08:00-09:00")
  })

  it("série que só começa depois não aparece antes", () => {
    const futuro = bloco(25, 8, 0, 9, 0, { is_recurring: true, recurrence_rule: "daily" })
    expect(faixasDoDia([futuro], dia(10))).toHaveLength(0)
  })

  it("dias úteis não aparece no fim de semana", () => {
    const uteis = bloco(1, 8, 0, 9, 0, { is_recurring: true, recurrence_rule: "weekdays" })
    // 11/07/2026 é sábado, 13/07 é segunda
    expect(faixasDoDia([uteis], dia(11))).toHaveLength(0)
    expect(texto(faixasDoDia([uteis], dia(13)))).toBe("08:00-09:00")
  })

  it("semanal só cai no mesmo dia da semana", () => {
    // 10/07/2026 é sexta
    const semanal = bloco(10, 14, 0, 15, 0, { is_recurring: true, recurrence_rule: "weekly" })
    expect(texto(faixasDoDia([semanal], dia(17)))).toBe("14:00-15:00") // sexta seguinte
    expect(faixasDoDia([semanal], dia(18))).toHaveLength(0) // sábado
  })

  it("recorrente com duração absurda (> 24h) é descartado", () => {
    const absurdo: BlocoBruto = {
      start_time: new Date(2026, 6, 1, 8, 0).toISOString(),
      end_time: new Date(2026, 6, 5, 8, 0).toISOString(),
      is_recurring: true, recurrence_rule: "daily",
    }
    expect(faixasDoDia([absurdo], dia(10))).toHaveLength(0)
  })
})

describe("fundir", () => {
  it("lista vazia continua vazia", () => {
    expect(fundir([])).toHaveLength(0)
  })

  it("não altera o array recebido", () => {
    const original = [{ start: new Date(2026, 6, 10, 9), end: new Date(2026, 6, 10, 10) }]
    const copia = [...original]
    fundir(original)
    expect(original).toEqual(copia)
  })
})

describe("agendaDosProximosDias", () => {
  it("devolve um item por dia, inclusive os vazios", () => {
    const agenda = agendaDosProximosDias([bloco(10, 9, 0, 10, 0)], dia(10), 3)
    expect(agenda).toHaveLength(3)
    expect(texto(agenda[0].faixas)).toBe("09:00-10:00")
    expect(agenda[1].faixas).toHaveLength(0) // livre o dia todo é resposta
    expect(agenda[2].faixas).toHaveLength(0)
  })

  it("normaliza o início para a meia-noite local", () => {
    const agenda = agendaDosProximosDias([], new Date(2026, 6, 10, 17, 45), 1)
    expect(agenda[0].dia.getHours()).toBe(0)
    expect(agenda[0].dia.getDate()).toBe(10)
  })

  it("limita o horizonte a 60 dias — link público não vira histórico", () => {
    expect(agendaDosProximosDias([], dia(10), 999)).toHaveLength(60)
  })

  it("zero ou negativo devolve vazio em vez de quebrar", () => {
    expect(agendaDosProximosDias([], dia(10), 0)).toHaveLength(0)
    expect(agendaDosProximosDias([], dia(10), -5)).toHaveLength(0)
  })
})
