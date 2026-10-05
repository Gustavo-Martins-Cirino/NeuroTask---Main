import { describe, expect, it } from "vitest"
import { grupoDoDia, tarefasDeHoje, type TarefaParaHoje } from "./tarefas-de-hoje"

// Quinta-feira, 08/10/2026, 10:20 no fuso de quem roda o teste.
const AGORA = new Date(2026, 9, 8, 10, 20)
const em = (dia: number, h = 23, m = 59) => new Date(2026, 9, dia, h, m).toISOString()

let n = 0
const t = (over: Partial<TarefaParaHoje>): TarefaParaHoje => ({
  id: `t${++n}`,
  title: `Tarefa ${n}`,
  status: "pending",
  priority: "medium",
  due_date: null,
  ...over,
})

describe("grupoDoDia", () => {
  it("vence hoje, de manhã ou no fim do dia, é de hoje", () => {
    expect(grupoDoDia(t({ due_date: em(8, 9, 0) }), AGORA)).toBe("hoje")
    expect(grupoDoDia(t({ due_date: em(8) }), AGORA)).toBe("hoje")
  })

  it("venceu ontem e não foi feita: atrasada, e continua no radar do dia", () => {
    expect(grupoDoDia(t({ due_date: em(7) }), AGORA)).toBe("atrasada")
  })

  it("sem data fica no radar do dia, como na tela de Tarefas", () => {
    expect(grupoDoDia(t({ due_date: null }), AGORA)).toBe("semData")
  })

  it("vence amanhã não é do dia", () => {
    expect(grupoDoDia(t({ due_date: em(9, 0, 0) }), AGORA)).toBeNull()
  })

  it("feita ou cancelada não aparece, nem atrasada", () => {
    expect(grupoDoDia(t({ status: "completed", due_date: em(7) }), AGORA)).toBeNull()
    expect(grupoDoDia(t({ status: "cancelled" }), AGORA)).toBeNull()
  })

  it("em andamento conta como pendente", () => {
    expect(grupoDoDia(t({ status: "in_progress", due_date: em(8) }), AGORA)).toBe("hoje")
  })

  it("prazo ilegível não some: cai em sem data", () => {
    expect(grupoDoDia(t({ due_date: "amanhã" }), AGORA)).toBe("semData")
  })
})

describe("tarefasDeHoje", () => {
  it("ordena atrasadas, depois hoje, depois sem data", () => {
    const sem = t({ title: "Sem data" })
    const hoje = t({ title: "Hoje", due_date: em(8) })
    const atrasada = t({ title: "Atrasada", due_date: em(6) })
    const { itens } = tarefasDeHoje([sem, hoje, atrasada], AGORA)
    expect(itens.map((i) => i.grupo)).toEqual(["atrasada", "hoje", "semData"])
  })

  it("dentro do grupo, prioridade mais alta primeiro", () => {
    const baixa = t({ priority: "low" })
    const urgente = t({ priority: "urgent" })
    const alta = t({ priority: "high" })
    expect(tarefasDeHoje([baixa, urgente, alta], AGORA).itens.map((i) => i.priority)).toEqual(["urgent", "high", "low"])
  })

  it("corta no limite e conta o total, para saber que cortou", () => {
    const muitas = Array.from({ length: 8 }, () => t({}))
    const r = tarefasDeHoje(muitas, AGORA, 5)
    expect(r.itens).toHaveLength(5)
    expect(r.total).toBe(8)
  })

  it("só tarefas futuras ou feitas: vazio de verdade", () => {
    const r = tarefasDeHoje([t({ due_date: em(12) }), t({ status: "completed" })], AGORA)
    expect(r).toEqual({ itens: [], total: 0 })
  })

  it("o caso do Ray: anotou sem data, o card mostra a lista", () => {
    const r = tarefasDeHoje([t({ title: "Comprar pão" }), t({ title: "Ligar pro banco" })], AGORA)
    expect(r.itens.map((i) => i.title)).toEqual(["Comprar pão", "Ligar pro banco"])
  })
})
