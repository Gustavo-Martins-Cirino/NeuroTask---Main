import { describe, it, expect } from "vitest"
import {
  ocorrenciasNaJanela,
  linhasDaAgenda,
  regraValeNoDia,
  inicioDoDia,
  type BlocoDaAgenda,
} from "./ia-agenda"

const BRASIL = 180 // UTC−3
const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"]
const TEXTOS = {
  repeticao: { daily: "todo dia", weekly: "toda semana", weekdays: "dias úteis" },
  vazio: "nenhum bloco",
}

/** Um bloco às `h` horas da parede brasileira, no dia informado. */
const bloco = (dia: number, h: number, dur = 1, extra: Partial<BlocoDaAgenda> = {}): BlocoDaAgenda => ({
  title: `[TESTE] ${h}h`,
  start_time: new Date(Date.UTC(2026, 8, dia, h + 3, 0)).toISOString(),
  end_time: new Date(Date.UTC(2026, 8, dia, h + 3 + dur, 0)).toISOString(),
  is_recurring: false,
  recurrence_rule: null,
  ...extra,
})

// A janela do dia 23/09/2026 (quarta-feira), na parede brasileira.
const DIA_23 = Date.UTC(2026, 8, 23, 3, 0)
const DIA_24 = DIA_23 + 24 * 3_600_000

describe("inicioDoDia", () => {
  it("é a meia-noite de quem usa, não a do servidor", () => {
    // 01:00 UTC de 23/09 ainda é 22:00 do dia 22 no Brasil.
    expect(inicioDoDia(Date.UTC(2026, 8, 23, 1, 0), BRASIL)).toBe(Date.UTC(2026, 8, 22, 3, 0))
  })
})

describe("regraValeNoDia", () => {
  it("diária vale sempre", () => {
    expect(regraValeNoDia("daily", 0, 3)).toBe(true)
  })

  it("dias úteis pula sábado e domingo", () => {
    expect(regraValeNoDia("weekdays", 1, 3)).toBe(true)
    expect(regraValeNoDia("weekdays", 6, 3)).toBe(false)
    expect(regraValeNoDia("weekdays", 0, 3)).toBe(false)
  })

  it("semanal só no dia da semana em que a série começou", () => {
    expect(regraValeNoDia("weekly", 3, 3)).toBe(true)
    expect(regraValeNoDia("weekly", 4, 3)).toBe(false)
  })

  it("regra ausente ou desconhecida não inventa ocorrência", () => {
    expect(regraValeNoDia(null, 3, 3)).toBe(false)
    expect(regraValeNoDia("a cada lua cheia", 3, 3)).toBe(false)
  })
})

describe("ocorrenciasNaJanela", () => {
  it("bloco avulso do dia entra", () => {
    const o = ocorrenciasNaJanela([bloco(23, 7)], DIA_23, DIA_24, BRASIL)
    expect(o).toHaveLength(1)
  })

  // O bug: "ignora os blocos recorrentes". A série começou semanas antes e
  // continua valendo — uma consulta por start_time nunca a encontraria.
  it("recorrente semanal criado semanas antes aparece na quarta", () => {
    const jiu = bloco(2, 7, 1, { title: "Jiu Jitsu", is_recurring: true, recurrence_rule: "weekly" })
    const o = ocorrenciasNaJanela([jiu], DIA_23, DIA_24, BRASIL)
    expect(o).toHaveLength(1)
    expect(o[0].titulo).toBe("Jiu Jitsu")
    expect(o[0].regra).toBe("weekly")
  })

  it("semanal não aparece no dia da semana errado", () => {
    const segunda = bloco(7, 9, 1, { is_recurring: true, recurrence_rule: "weekly" })
    expect(ocorrenciasNaJanela([segunda], DIA_23, DIA_24, BRASIL)).toHaveLength(0)
  })

  it("diário aparece em todos os dias da janela", () => {
    const d = bloco(1, 8, 1, { is_recurring: true, recurrence_rule: "daily" })
    const semana = ocorrenciasNaJanela([d], DIA_23, DIA_23 + 7 * 24 * 3_600_000, BRASIL)
    expect(semana).toHaveLength(7)
  })

  // A série não existe antes de começar: recorrente criado para o mês que vem
  // não pode aparecer nesta semana.
  it("a série não vale antes de existir", () => {
    const futuro = bloco(30, 8, 1, { is_recurring: true, recurrence_rule: "daily" })
    expect(ocorrenciasNaJanela([futuro], DIA_23, DIA_24, BRASIL)).toHaveLength(0)
  })

  it("bloco que atravessa a meia-noite pertence aos dois dias", () => {
    const vira = bloco(22, 23, 2) // 23h do dia 22 até 1h do dia 23
    expect(ocorrenciasNaJanela([vira], DIA_23, DIA_24, BRASIL)).toHaveLength(1)
  })

  it("sai em ordem de horário", () => {
    const o = ocorrenciasNaJanela([bloco(23, 15), bloco(23, 7), bloco(23, 11)], DIA_23, DIA_24, BRASIL)
    expect(o.map((x) => x.inicio)).toEqual([...o.map((x) => x.inicio)].sort((a, b) => a - b))
  })

  it("data ilegível é ignorada em vez de virar NaN", () => {
    const ruim = { title: "x", start_time: "nada", end_time: "nada" } as BlocoDaAgenda
    expect(ocorrenciasNaJanela([ruim], DIA_23, DIA_24, BRASIL)).toHaveLength(0)
  })

  it("janela invertida ou inválida devolve vazio, não o mundo", () => {
    expect(ocorrenciasNaJanela([bloco(23, 7)], DIA_24, DIA_23, BRASIL)).toHaveLength(0)
    expect(ocorrenciasNaJanela([bloco(23, 7)], NaN, DIA_24, BRASIL)).toHaveLength(0)
  })
})

describe("linhasDaAgenda", () => {
  // O bug: "o bloco das 07:00 ela diz que é às 10:00".
  it("escreve a hora da parede de quem usa, não o UTC", () => {
    const linhas = linhasDaAgenda(ocorrenciasNaJanela([bloco(23, 7)], DIA_23, DIA_24, BRASIL), BRASIL, DIAS, TEXTOS)
    expect(linhas).toContain("07:00")
    expect(linhas).not.toContain("10:00")
  })

  it("traz dia da semana e dd/mm em cada linha", () => {
    const linhas = linhasDaAgenda(ocorrenciasNaJanela([bloco(23, 7)], DIA_23, DIA_24, BRASIL), BRASIL, DIAS, TEXTOS)
    expect(linhas).toContain("quarta-feira 23/09")
  })

  it("marca o que se repete, e não marca o que é avulso", () => {
    const jiu = bloco(2, 7, 1, { title: "Jiu Jitsu", is_recurring: true, recurrence_rule: "weekly" })
    const linhas = linhasDaAgenda(ocorrenciasNaJanela([jiu, bloco(23, 15)], DIA_23, DIA_24, BRASIL), BRASIL, DIAS, TEXTOS)
    expect(linhas).toContain("(toda semana)")
    expect(linhas.split("\n").filter((l) => l.includes("("))).toHaveLength(1)
  })

  // O bug: dia com 8 blocos respondido como "não encontrei nenhum". Vazio tem
  // de ser vazio de verdade, e dizer isso com todas as letras.
  it("dia sem nada diz que está vazio", () => {
    expect(linhasDaAgenda([], BRASIL, DIAS, TEXTOS)).toBe("nenhum bloco")
  })

  it("oito blocos viram oito linhas", () => {
    const oito = Array.from({ length: 8 }, (_, i) => bloco(23, 8 + i))
    const linhas = linhasDaAgenda(ocorrenciasNaJanela(oito, DIA_23, DIA_24, BRASIL), BRASIL, DIAS, TEXTOS)
    expect(linhas.split("\n")).toHaveLength(8)
  })
})
