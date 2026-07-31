import { describe, it, expect, vi, afterEach } from "vitest"
import {
  computeGamification,
  taskXpAmount,
  xpForTask,
  XP_PER_LEVEL,
  MIN_TASK_AGE_MIN,
} from "./gamification"

// Anti-farm: o cliente calcula quanto PEDIR, o servidor decide quanto DAR
// (award_xp aplica o teto diário). O que se testa aqui é a regra do cliente —
// se ela afrouxar, a economia inteira do Escritório desanda.

const minutosAtras = (min: number) => new Date(Date.now() - min * 60_000).toISOString()

describe("xpForTask", () => {
  it("vale mais quanto maior a prioridade", () => {
    expect(xpForTask("low")).toBe(5)
    expect(xpForTask("medium")).toBe(10)
    expect(xpForTask("high")).toBe(20)
    expect(xpForTask("urgent")).toBe(30)
  })
})

describe("taskXpAmount — anti-farm", () => {
  it("tarefa recém-criada não vale XP (criar e concluir na hora)", () => {
    expect(
      taskXpAmount({
        priority: "urgent",
        created_at: minutosAtras(1),
        due_date: "2026-08-01",
        estimated_minutes: 60,
      })
    ).toBe(0)
  })

  it("a partir da idade mínima volta a valer", () => {
    expect(
      taskXpAmount({
        priority: "medium",
        created_at: minutosAtras(MIN_TASK_AGE_MIN + 1),
        due_date: "2026-08-01",
        estimated_minutes: 30,
      })
    ).toBe(10)
  })

  it("sem prazo E sem duração vale metade (baixo compromisso)", () => {
    expect(
      taskXpAmount({
        priority: "high", // 20
        created_at: minutosAtras(60),
        due_date: null,
        estimated_minutes: null,
      })
    ).toBe(10)
  })

  it("basta ter prazo OU duração para valer inteiro", () => {
    const base = { priority: "high" as const, created_at: minutosAtras(60) }
    expect(taskXpAmount({ ...base, due_date: "2026-08-01", estimated_minutes: null })).toBe(20)
    expect(taskXpAmount({ ...base, due_date: null, estimated_minutes: 45 })).toBe(20)
  })

  it("metade arredonda para cima (5 XP não vira 2)", () => {
    expect(
      taskXpAmount({
        priority: "low", // 5
        created_at: minutosAtras(60),
        due_date: null,
        estimated_minutes: null,
      })
    ).toBe(3)
  })

  it("campos ausentes contam como sem prazo e sem duração", () => {
    expect(taskXpAmount({ priority: "medium", created_at: minutosAtras(60) })).toBe(5)
  })
})

describe("computeGamification", () => {
  it("começa no nível 1 com zero XP", () => {
    expect(computeGamification(0)).toEqual({
      totalXp: 0,
      level: 1,
      currentXp: 0,
      xpForNextLevel: XP_PER_LEVEL,
    })
  })

  it("sobe de nível a cada 100 XP", () => {
    expect(computeGamification(99).level).toBe(1)
    expect(computeGamification(100).level).toBe(2)
    expect(computeGamification(250).level).toBe(3)
  })

  it("currentXp é o progresso dentro do nível", () => {
    expect(computeGamification(250).currentXp).toBe(50)
  })

  it("XP negativo não gera nível zero nem negativo", () => {
    const g = computeGamification(-50)
    expect(g.level).toBe(1)
    expect(g.totalXp).toBe(0)
    expect(g.currentXp).toBe(0)
  })
})

afterEach(() => {
  vi.useRealTimers()
})
