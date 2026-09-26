import { describe, it, expect } from "vitest"
import { relogioDeSilencio, SILENCIO_MAXIMO_MS } from "./ia-silencio"

// Um relógio falso: nada de timers de verdade num teste, que os tornaria lentos
// e intermitentes. `avancar` dispara o que venceu.
function relogioFalso() {
  let agora = 0
  let seq = 0
  const pendentes = new Map<number, { quando: number; fn: () => void }>()
  return {
    agendar: (fn: () => void, ms: number) => {
      const id = ++seq
      pendentes.set(id, { quando: agora + ms, fn })
      return id
    },
    cancelar: (id: unknown) => {
      pendentes.delete(id as number)
    },
    avancar(ms: number) {
      agora += ms
      for (const [id, p] of [...pendentes]) {
        if (p.quando <= agora) {
          pendentes.delete(id)
          p.fn()
        }
      }
    },
  }
}

describe("relogioDeSilencio", () => {
  it("dispara quando ninguém dá sinal de vida", () => {
    const f = relogioFalso()
    let disparou = 0
    relogioDeSilencio(() => disparou++, 1000, f.agendar, f.cancelar)
    f.avancar(999)
    expect(disparou).toBe(0)
    f.avancar(2)
    expect(disparou).toBe(1)
  })

  // O relógio é de SILÊNCIO, não de duração: resposta longa que vai chegando em
  // pedaços é legítima, e cortá-la seria trocar um bug por outro.
  it("sinal de vida devolve o prazo inteiro", () => {
    const f = relogioFalso()
    let disparou = 0
    const r = relogioDeSilencio(() => disparou++, 1000, f.agendar, f.cancelar)
    for (let i = 0; i < 10; i++) {
      f.avancar(900)
      r.vivo()
    }
    expect(disparou).toBe(0)
    f.avancar(1001)
    expect(disparou).toBe(1)
  })

  it("parar cala o relógio para sempre", () => {
    const f = relogioFalso()
    let disparou = 0
    const r = relogioDeSilencio(() => disparou++, 1000, f.agendar, f.cancelar)
    r.parar()
    f.avancar(5000)
    expect(disparou).toBe(0)
  })

  it("depois de parado, sinal de vida não ressuscita", () => {
    const f = relogioFalso()
    let disparou = 0
    const r = relogioDeSilencio(() => disparou++, 1000, f.agendar, f.cancelar)
    r.parar()
    r.vivo()
    f.avancar(5000)
    expect(disparou).toBe(0)
  })

  it("dispara no máximo uma vez", () => {
    const f = relogioFalso()
    let disparou = 0
    const r = relogioDeSilencio(() => disparou++, 1000, f.agendar, f.cancelar)
    f.avancar(1001)
    r.vivo()
    f.avancar(5000)
    expect(disparou).toBe(1)
  })

  // Quatro voltas de ferramenta mais o resumo cabem bem abaixo; o caso do
  // relatório (90s e contando) fica de fora com margem.
  it("o prazo padrão é folgado para o laço de ferramentas, e menor que o travamento visto", () => {
    expect(SILENCIO_MAXIMO_MS).toBeGreaterThanOrEqual(30_000)
    expect(SILENCIO_MAXIMO_MS).toBeLessThan(90_000)
  })
})
