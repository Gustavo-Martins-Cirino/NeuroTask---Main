import { describe, it, expect, vi, afterEach } from "vitest"
import {
  repeticaoDaRegra, nextOccurrence, nextFutureOccurrence, regraParaBanco, ehRepeticaoPersonalizada,
  RECURRENCE_OPTIONS,
} from "./task-recurrence"

// Recorrência mexe com o prazo da tarefa depois de concluída. Um erro aqui não
// aparece na hora: some ou duplica uma ocorrência dias depois.

const iso = (d: Date | null) => d?.toISOString().slice(0, 10)

describe("repeticaoDaRegra", () => {
  it("as regras fixas viram a chave delas", () => {
    expect(repeticaoDaRegra("daily")).toEqual({ chave: "diariamente" })
    expect(repeticaoDaRegra("weekly")).toEqual({ chave: "semanalmente" })
    expect(repeticaoDaRegra("monthly")).toEqual({ chave: "mensalmente" })
    expect(repeticaoDaRegra("yearly")).toEqual({ chave: "anualmente" })
  })

  it("every:N carrega o número junto — o plural é do dicionário", () => {
    expect(repeticaoDaRegra("every:1")).toEqual({ chave: "aCadaNDias", dias: 1 })
    expect(repeticaoDaRegra("every:3")).toEqual({ chave: "aCadaNDias", dias: 3 })
  })

  it("ausência de regra e regras inválidas não viram repetição", () => {
    expect(repeticaoDaRegra(null)).toBeNull()
    expect(repeticaoDaRegra(undefined)).toBeNull()
    expect(repeticaoDaRegra("toda terça")).toBeNull()
  })

  // "none" é ausência de repetição, e não a repetição chamada "não repete".
  // Devolver { chave: "naoRepete" } aqui poria um selo "Não repete" em todo
  // cartão que não repete — que é a maioria deles.
  it('"none" é ausência de repetição, não uma repetição', () => {
    expect(repeticaoDaRegra("none")).toBeNull()
  })

  // O módulo puro não fala idioma nenhum: quem traduz é lib/i18n.
  it("nenhuma opção carrega texto de interface", () => {
    for (const o of RECURRENCE_OPTIONS) {
      expect(Object.keys(o).sort()).toEqual(["chave", "value"])
    }
  })
})

describe("nextOccurrence", () => {
  it("avança um dia, uma semana, um mês e um ano", () => {
    const base = new Date(2026, 2, 10) // 10/mar/2026
    expect(iso(nextOccurrence(base, "daily"))).toBe("2026-03-11")
    expect(iso(nextOccurrence(base, "weekly"))).toBe("2026-03-17")
    expect(iso(nextOccurrence(base, "monthly"))).toBe("2026-04-10")
    expect(iso(nextOccurrence(base, "yearly"))).toBe("2027-03-10")
  })

  it("every:N avança N dias", () => {
    expect(iso(nextOccurrence(new Date(2026, 2, 10), "every:5"))).toBe("2026-03-15")
  })

  it("atravessa a virada do mês e do ano", () => {
    expect(iso(nextOccurrence(new Date(2026, 11, 31), "daily"))).toBe("2027-01-01")
    expect(iso(nextOccurrence(new Date(2026, 0, 31), "daily"))).toBe("2026-02-01")
  })

  it("não altera a data recebida", () => {
    const base = new Date(2026, 2, 10)
    nextOccurrence(base, "daily")
    expect(iso(base)).toBe("2026-03-10")
  })

  it("regra inválida devolve null em vez de uma data errada", () => {
    expect(nextOccurrence(new Date(2026, 2, 10), "none")).toBeNull()
    expect(nextOccurrence(new Date(2026, 2, 10), "every:abc")).toBeNull()
    expect(nextOccurrence(new Date(2026, 2, 10), "")).toBeNull()
  })
})

describe("nextFutureOccurrence", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("pula todas as ocorrências já passadas", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 10, 12, 0, 0))
    // Tarefa diária largada desde janeiro: o próximo prazo tem que ser amanhã,
    // não o dia seguinte ao prazo antigo.
    const resultado = nextFutureOccurrence(new Date(2026, 0, 1, 12, 0, 0), "daily")
    expect(iso(resultado)).toBe("2026-03-11")
  })

  it("base nula parte de agora", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 10, 12, 0, 0))
    expect(iso(nextFutureOccurrence(null, "daily"))).toBe("2026-03-11")
  })

  it("regra inválida devolve null", () => {
    expect(nextFutureOccurrence(new Date(2026, 2, 10), "nada")).toBeNull()
  })

  it("base muito antiga ainda assim resulta em data futura", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 10, 12, 0, 0))
    // Tarefa diária abandonada há anos: são mais de 2200 dias para pular.
    const resultado = nextFutureOccurrence(new Date(2020, 0, 1), "daily")
    expect(resultado).not.toBeNull()
    expect(resultado!.getTime()).toBeGreaterThan(Date.now())
  })

  it("salto longo cai numa ocorrência válida da série, não numa data qualquer", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 10, 12, 0, 0))
    // Série de 10 em 10 dias desde 01/01/2020: a próxima futura tem que estar
    // na grade (diferença múltipla de 10 dias em relação à base).
    const base = new Date(2020, 0, 1, 12, 0, 0)
    const resultado = nextFutureOccurrence(base, "every:10")!
    const dias = Math.round((resultado.getTime() - base.getTime()) / 86_400_000)
    expect(dias % 10).toBe(0)
    expect(resultado.getTime()).toBeGreaterThan(Date.now())
  })

  it("mensal e anual muito antigos também chegam ao futuro", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 10, 12, 0, 0))
    expect(nextFutureOccurrence(new Date(2010, 0, 1), "monthly")!.getTime()).toBeGreaterThan(Date.now())
    expect(nextFutureOccurrence(new Date(1990, 0, 1), "yearly")!.getTime()).toBeGreaterThan(Date.now())
  })
})

describe("regraParaBanco", () => {
  it('"não repete" vira NULO, e não a string "none"', () => {
    // Tarefa que não repete não tem regra nenhuma. Gravar "none" faria
    // repeticaoDaRegra devolver null e nextOccurrence não achar a regra — um
    // estado que parece certo na tela e é lixo no banco.
    expect(regraParaBanco("none")).toBeNull()
    expect(regraParaBanco("")).toBeNull()
  })

  it("as fixas passam como estão", () => {
    for (const v of ["daily", "weekly", "monthly", "yearly"]) {
      expect(regraParaBanco(v)).toBe(v)
    }
  })

  it('"a cada N dias" vira every:N, e N nunca é zero nem quebrado', () => {
    expect(regraParaBanco("every", 3)).toBe("every:3")
    expect(regraParaBanco("every", 0)).toBe("every:1")
    expect(regraParaBanco("every", -5)).toBe("every:1")
    expect(regraParaBanco("every", 2.7)).toBe("every:2")
    expect(regraParaBanco("every", Number.NaN)).toBe("every:1")
  })

  it("o que sai daqui é o que nextOccurrence sabe ler", () => {
    // As duas pontas da mesma regra: se elas divergirem, a tarefa repete na
    // tela e não avança de prazo ao concluir.
    for (const [valor, n] of [["daily", 1], ["weekly", 1], ["every", 4]] as const) {
      const regra = regraParaBanco(valor, n)!
      expect(nextOccurrence(new Date(2026, 0, 1), regra)).not.toBeNull()
    }
  })
})

describe("ehRepeticaoPersonalizada", () => {
  it("só 'a cada N dias' é personalizada", () => {
    expect(ehRepeticaoPersonalizada("every:3")).toBe(true)
    expect(ehRepeticaoPersonalizada("every:1")).toBe(true)
  })

  it("as fixas e a ausência de regra não são", () => {
    for (const v of ["daily", "weekly", "monthly", "yearly", null, undefined, "", "every:", "every:x"]) {
      expect(ehRepeticaoPersonalizada(v)).toBe(false)
    }
  })
})
