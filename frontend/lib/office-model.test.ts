import { describe, it, expect } from "vitest"
import { Box3, Group, Vector3 } from "three"
import { buildEscritorio, buildPersonagem, recuoDaSala, PIVO_ANTEBRACO } from "./office-model"
import { typingTap, TECLA_AMPLITUDE } from "./office-typing"

// O boneco "digitando" só funciona se a mão ALCANÇAR o teclado. Na primeira
// versão ela parava 16 cm atrás dele e ao lado — nenhuma animação salvaria
// isso, e ninguém percebeu porque não havia como ver a cena num teste. Estes
// testes medem a pose: são o olho que falta.

function malha(g: Group, nome: string) {
  let achou: { obj: import("three").Object3D } | null = null
  g.traverse((o) => { if (o.name === nome) achou = { obj: o } })
  if (!achou) throw new Error(`malha ausente: ${nome}`)
  return (achou as { obj: import("three").Object3D }).obj
}

/** Caixa que o teclado ocupa na sala, no nível padrão (recuo 0). */
function caixaDoTeclado(): Box3 {
  const sala = buildEscritorio()
  const teclado = malha(sala, "Teclado")
  sala.updateMatrixWorld(true)
  return new Box3().setFromObject(teclado)
}

function posicaoDaMao(lado: "Direito" | "Esquerdo", anguloCotovelo = 0): Vector3 {
  const p = buildPersonagem()
  const pivo = malha(p, `${PIVO_ANTEBRACO}${lado}`)
  pivo.rotation.x = anguloCotovelo
  p.updateMatrixWorld(true)
  return malha(p, `Mao_${lado}`).getWorldPosition(new Vector3())
}

describe("pose do boneco", () => {
  const RAIO_MAO = 0.05

  it("no nível padrão a sala não recua (a comparação abaixo é direta)", () => {
    expect(recuoDaSala(1)).toBe(0)
  })

  it("as duas mãos pousam SOBRE o teclado, não ao lado nem atrás", () => {
    const kb = caixaDoTeclado()
    for (const lado of ["Direito", "Esquerdo"] as const) {
      const mao = posicaoDaMao(lado)
      expect(mao.x).toBeGreaterThan(kb.min.x)
      expect(mao.x).toBeLessThan(kb.max.x)
      expect(mao.y).toBeGreaterThan(kb.min.y)
      expect(mao.y).toBeLessThan(kb.max.y)
    }
  })

  it("em repouso a mão paira acima das teclas, sem afundar nelas", () => {
    const kb = caixaDoTeclado()
    for (const lado of ["Direito", "Esquerdo"] as const) {
      const base = posicaoDaMao(lado).z - RAIO_MAO
      expect(base).toBeGreaterThan(kb.max.z)
      expect(base - kb.max.z).toBeLessThan(0.05) // pairando, não flutuando longe
    }
  })

  it("no fundo da tecladinha ela encosta nas teclas — e só encosta", () => {
    const kb = caixaDoTeclado()
    // O pico negativo de typingTap é o ponto mais baixo do movimento.
    const fundo = -TECLA_AMPLITUDE
    for (const lado of ["Direito", "Esquerdo"] as const) {
      const base = posicaoDaMao(lado, fundo).z - RAIO_MAO
      expect(base).toBeLessThan(kb.max.z + 0.012) // chega às teclas
      expect(base).toBeGreaterThan(kb.min.z)      // sem atravessar o teclado
    }
  })

  it("a tecladinha move a mão o bastante para se ver de longe", () => {
    const alto = posicaoDaMao("Direito", TECLA_AMPLITUDE).z
    const baixo = posicaoDaMao("Direito", -TECLA_AMPLITUDE).z
    expect(alto - baixo).toBeGreaterThan(0.025) // ~10 cm na escala 4 da cena
  })

  it("o antebraço passa POR CIMA da beirada da mesa, não através dela", () => {
    const mesa = new Box3().setFromObject(malha(buildEscritorio(), "Mesa_Tampo"))
    const p = buildPersonagem()
    p.updateMatrixWorld(true)
    const cotovelo = malha(p, `${PIVO_ANTEBRACO}Direito`).getWorldPosition(new Vector3())
    const mao = posicaoDaMao("Direito")
    // Altura do antebraço no y em que ele cruza a borda da mesa.
    const f = (mesa.min.y - cotovelo.y) / (mao.y - cotovelo.y)
    expect(f).toBeGreaterThan(0)
    expect(f).toBeLessThan(1)
    expect(cotovelo.z + f * (mao.z - cotovelo.z)).toBeGreaterThan(mesa.max.z)
  })

  it("o ombro nasce fora do torso, senão o braço some dentro do corpo", () => {
    const torso = new Box3().setFromObject(malha(buildPersonagem(), "Torso"))
    const p = buildPersonagem()
    p.updateMatrixWorld(true)
    const braco = new Box3().setFromObject(malha(p, "Braco_Direito"))
    expect(braco.max.x).toBeGreaterThan(torso.max.x)
  })

  it("as mãos não sobem e descem juntas (elas cruzam, não marcham)", () => {
    // Num instante isolado elas podem estar na mesma altura — o que não pode é
    // isso valer o tempo todo, que seria as duas batendo a mesma tecla.
    let separadas = 0
    const amostras = 60
    for (let i = 0; i < amostras; i++) {
      const t = i / 12
      const d = posicaoDaMao("Direito", typingTap(t, 1)).z
      const e = posicaoDaMao("Esquerdo", typingTap(t, -1)).z
      if (Math.abs(d - e) > 0.004) separadas++
    }
    expect(separadas).toBeGreaterThan(amostras * 0.6)
  })
})
