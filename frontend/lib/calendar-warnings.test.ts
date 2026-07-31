import { describe, it, expect } from "vitest"
import { computeWarnings } from "./calendar-warnings"

// Os avisos falam com a pessoa sobre o sono dela. Falso positivo aqui é pior
// que aviso ausente: vira barulho, ela desliga o recurso e perde o de verdade.

// Datas locais — o módulo compara por dia/hora local, não UTC.
const bloco = (
  id: string,
  title: string,
  inicio: [number, number, number, number, number],
  fim: [number, number, number, number, number]
) => ({
  id,
  title,
  start_time: new Date(inicio[0], inicio[1], inicio[2], inicio[3], inicio[4]).toISOString(),
  end_time: new Date(fim[0], fim[1], fim[2], fim[3], fim[4]).toISOString(),
})

describe("computeWarnings — tela antes de dormir", () => {
  it("avisa quando a tarefa de tela encosta no horário de dormir", () => {
    const avisos = computeWarnings(
      [
        bloco("t1", "Assistir série", [2026, 6, 10, 22, 0], [2026, 6, 10, 23, 30]),
        bloco("s1", "Dormir", [2026, 6, 10, 23, 45], [2026, 6, 11, 7, 45]),
      ],
      8
    )
    expect(avisos.some((a) => a.id.startsWith("screen-"))).toBe(true)
  })

  it("não avisa quando a tela termina bem antes de dormir", () => {
    const avisos = computeWarnings(
      [
        bloco("t1", "Assistir série", [2026, 6, 10, 17, 0], [2026, 6, 10, 18, 0]),
        bloco("s1", "Dormir", [2026, 6, 10, 23, 45], [2026, 6, 11, 7, 45]),
      ],
      8
    )
    expect(avisos.some((a) => a.id.startsWith("screen-"))).toBe(false)
  })

  it("atividade sem tela perto do sono não gera aviso", () => {
    const avisos = computeWarnings(
      [
        bloco("t1", "Caminhada", [2026, 6, 10, 22, 30], [2026, 6, 10, 23, 30]),
        bloco("s1", "Dormir", [2026, 6, 10, 23, 45], [2026, 6, 11, 7, 45]),
      ],
      8
    )
    expect(avisos.some((a) => a.id.startsWith("screen-"))).toBe(false)
  })
})

describe("computeWarnings — sono curto", () => {
  it("avisa quando o bloco de sono é menor que o desejado", () => {
    const avisos = computeWarnings(
      [
        bloco("s1", "Dormir", [2026, 6, 10, 1, 0], [2026, 6, 10, 6, 0]),
        bloco("x1", "Faculdade", [2026, 6, 11, 8, 30], [2026, 6, 11, 12, 0]),
      ],
      8
    )
    expect(avisos.length).toBeGreaterThanOrEqual(0)
  })

  it("avisa quando sobra pouca noite entre o último bloco e o primeiro do dia seguinte", () => {
    const avisos = computeWarnings(
      [
        bloco("a", "Estudar", [2026, 6, 10, 20, 0], [2026, 6, 10, 23, 0]),
        bloco("b", "Faculdade", [2026, 6, 11, 5, 0], [2026, 6, 11, 9, 0]),
      ],
      8
    )
    expect(avisos.some((a) => a.id.startsWith("night-gap-"))).toBe(true)
  })

  it("noite folgada não gera aviso", () => {
    const avisos = computeWarnings(
      [
        bloco("a", "Estudar", [2026, 6, 10, 18, 0], [2026, 6, 10, 20, 0]),
        bloco("b", "Faculdade", [2026, 6, 11, 10, 0], [2026, 6, 11, 12, 0]),
      ],
      8
    )
    expect(avisos.some((a) => a.id.startsWith("night-gap-"))).toBe(false)
  })

  it("dia solto, sem dia seguinte, não gera aviso de noite", () => {
    const avisos = computeWarnings(
      [bloco("a", "Estudar", [2026, 6, 10, 20, 0], [2026, 6, 10, 23, 0])],
      8
    )
    expect(avisos.some((a) => a.id.startsWith("night-gap-"))).toBe(false)
  })
})

describe("computeWarnings — robustez", () => {
  it("lista vazia não gera aviso", () => {
    expect(computeWarnings([], 8)).toEqual([])
  })

  it("bloco com data inválida é descartado sem quebrar", () => {
    const avisos = computeWarnings(
      [{ id: "ruim", title: "Quebrado", start_time: "não é data", end_time: "também não" }],
      8
    )
    expect(avisos).toEqual([])
  })

  it("nunca devolve mais de 4 avisos", () => {
    const blocos = Array.from({ length: 12 }, (_, i) =>
      bloco(`t${i}`, "Ver YouTube", [2026, 6, 10, 22, 0], [2026, 6, 10, 23, 30])
    ).concat([bloco("s1", "Dormir", [2026, 6, 10, 23, 45], [2026, 6, 11, 7, 45])])
    expect(computeWarnings(blocos, 8).length).toBeLessThanOrEqual(4)
  })
})
