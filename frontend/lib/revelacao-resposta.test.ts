import { describe, it, expect } from "vitest"
import {
  CPS_MINIMO, DURACAO_ALVO, avancarRevelacao, revelacaoTerminou, velocidadeDaRevelacao,
} from "./revelacao-resposta"

/** Quantos segundos a revelação de um texto de `total` caracteres leva, em passos de 50ms. */
function duracao(total: number, passo = 0.05): number {
  let revelado = 0
  let n = 0
  while (revelado < total && n < 100_000) {
    revelado = avancarRevelacao(revelado, total, passo)
    n++
  }
  return n * passo
}

describe("velocidadeDaRevelacao", () => {
  it("nunca desce do piso, por menor que seja a resposta", () => {
    expect(velocidadeDaRevelacao(1)).toBe(CPS_MINIMO)
    expect(velocidadeDaRevelacao(0)).toBe(CPS_MINIMO)
    expect(velocidadeDaRevelacao(-10)).toBe(CPS_MINIMO)
    expect(velocidadeDaRevelacao(Number.NaN)).toBe(CPS_MINIMO)
  })

  it("acelera junto com o tamanho da resposta", () => {
    expect(velocidadeDaRevelacao(600)).toBe(600 / DURACAO_ALVO)
    expect(velocidadeDaRevelacao(1200)).toBe(2 * velocidadeDaRevelacao(600))
  })
})

describe("avancarRevelacao", () => {
  it("uma resposta longa não demora mais que uma curta", () => {
    // É a razão de a velocidade sair do tamanho: com CPS fixo, 2000 caracteres
    // levariam 50 segundos para terminar de aparecer.
    // A folga é o passo de 50ms, que só termina no tique seguinte.
    for (const total of [200, 2000]) {
      expect(duracao(total)).toBeGreaterThanOrEqual(DURACAO_ALVO)
      expect(duracao(total)).toBeLessThanOrEqual(DURACAO_ALVO + 0.05)
    }
  })

  it("resposta curtinha entra no piso, e aí é mais rápida ainda", () => {
    expect(duracao(20)).toBeLessThan(DURACAO_ALVO)
  })

  it("o ritmo é constante dentro da mesma resposta", () => {
    // Texto que desacelera no fim é desconfortável de ler — o passo daqui tem
    // de render o mesmo tanto no começo e perto do fim.
    const primeiro = avancarRevelacao(0, 900, 0.05)
    const tarde = avancarRevelacao(800, 900, 0.05) - 800
    expect(tarde).toBeCloseTo(primeiro, 6)
  })

  it("persegue o alvo quando o texto ainda está crescendo", () => {
    const inicio = avancarRevelacao(0, 50, 0.1)
    expect(inicio).toBeGreaterThan(0)
    expect(inicio).toBeLessThan(50)
    // Chegou mais texto: a revelação continua de onde estava, sem recomeçar.
    expect(avancarRevelacao(inicio, 400, 0.1)).toBeGreaterThan(inicio)
  })

  it("nunca ultrapassa o que já chegou", () => {
    expect(avancarRevelacao(0, 10, 999)).toBe(10)
    expect(avancarRevelacao(30, 10, 0.1)).toBe(10)
  })

  it("não anda com passo parado, negativo ou inválido", () => {
    expect(avancarRevelacao(12, 100, 0)).toBe(12)
    expect(avancarRevelacao(12, 100, -0.5)).toBe(12)
    expect(avancarRevelacao(12, 100, Number.NaN)).toBe(12)
  })

  it("alvo inválido mostra tudo — esconder a resposta é o pior erro possível", () => {
    expect(avancarRevelacao(0, Number.NaN, 0.1)).toBe(Number.MAX_SAFE_INTEGER)
    expect(avancarRevelacao(0, -1, 0.1)).toBe(Number.MAX_SAFE_INTEGER)
  })

  it("guarda o resto: passos curtos somam em vez de se perderem", () => {
    // Arredondando a cada passo, uma velocidade menor que um caractere por
    // passo travaria em zero para sempre.
    let revelado = 0
    for (let i = 0; i < 10; i++) revelado = avancarRevelacao(revelado, 1000, 0.0005)
    expect(revelado).toBeGreaterThan(0)
  })
})

describe("revelacaoTerminou", () => {
  it("sabe quando parar o relógio", () => {
    expect(revelacaoTerminou(0, 10)).toBe(false)
    expect(revelacaoTerminou(10, 10)).toBe(true)
    expect(revelacaoTerminou(Number.MAX_SAFE_INTEGER, 10)).toBe(true)
  })
})
