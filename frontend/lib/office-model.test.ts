import { describe, it, expect } from "vitest"
import { Box3, Group, Mesh, Vector3 } from "three"
import { buildEscritorio, buildPersonagem, recuoDaSala, PIVO_ANTEBRACO, GIRO_ZONA, avancoDoGiro } from "./office-model"
import { typingTap, TECLA_AMPLITUDE } from "./office-typing"

const D10 = (10 * Math.PI) / 180
const D30 = (30 * Math.PI) / 180

// O boneco "digitando" só funciona se a mão ALCANÇAR o teclado. Na primeira
// versão ela parava 16 cm atrás dele e ao lado — nenhuma animação salvaria
// isso, e ninguém percebeu porque não havia como ver a cena num teste. Estes
// testes medem a pose: são o olho que falta.
//
// Tudo aqui é medido no referencial SEM o giro da zona de trabalho. A mesa e a
// pessoa giram juntas e rígidas (mesmo eixo, mesmo ângulo), então a relação
// entre elas não muda — e sem o giro a conta fica legível.

function malha(g: Group, nome: string) {
  let achou: { obj: import("three").Object3D } | null = null
  g.traverse((o) => { if (o.name === nome) achou = { obj: o } })
  if (!achou) throw new Error(`malha ausente: ${nome}`)
  return (achou as { obj: import("three").Object3D }).obj
}

/** Caixa de uma peça da sala ANTES do giro: as malhas da zona de trabalho
 *  entram com as coordenadas absolutas da sala, então a posição local delas já
 *  é a medida que interessa. */
function caixaSemGiro(nome: string): Box3 {
  const m = malha(buildEscritorio(), nome) as Mesh
  m.geometry.computeBoundingBox()
  return m.geometry.boundingBox!.clone().translate(m.position)
}

const caixaDoTeclado = () => caixaSemGiro("Teclado")

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
    const mesa = caixaSemGiro("Mesa_Tampo")
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

  // A câmera isométrica da cena e a conversão sala→mundo de office-scene-3d:
  // <OrthographicCamera position={[16,14,16]} /> dentro de
  // <group rotation={[-PI/2,0,0]} scale={4}>, que leva (x,y,z) → (x, z, −y).
  const CAMERA = new Vector3(16, 14, 16)
  const paraMundo = (p: Vector3) => new Vector3(p.x, p.z, -p.y).multiplyScalar(4)

  /** Ângulo entre a direção do rosto e a direção da câmera, em graus.
   *  > 90° = vemos as costas. `giro` é o da zona de trabalho. */
  function anguloRostoCamera(giro: number): number {
    const cabeca = new Vector3(0, 0.9, 1.26)              // centro da cabeça
    const frente = new Vector3(0, 1, 0)                    // o rosto olha para +Y
    const gira = (v: Vector3, sobreEixo: boolean) => {
      // Giro em torno do eixo vertical Z da sala, no assento (y = 0.9).
      const oy = sobreEixo ? 0.9 : 0
      const x = v.x
      const y = v.y - oy
      return new Vector3(x * Math.cos(giro) - y * Math.sin(giro), x * Math.sin(giro) + y * Math.cos(giro) + oy, v.z)
    }
    const cabecaG = gira(cabeca, true)
    const frenteG = gira(frente.clone().add(new Vector3(0, 0, 1.26)), false).setZ(1.26)
    const cabecaM = paraMundo(cabecaG)
    const frenteM = paraMundo(frenteG).sub(paraMundo(new Vector3(0, 0, 1.26))).normalize()
    const paraCamera = CAMERA.clone().sub(cabecaM).normalize()
    const dot = Math.max(-1, Math.min(1, frenteM.dot(paraCamera)))
    return (Math.acos(dot) * 180) / Math.PI
  }

  it("o giro da zona vira o rosto para a câmera (era o ponto da mudança)", () => {
    const sem = anguloRostoCamera(0)
    const com = anguloRostoCamera(GIRO_ZONA)
    // Sem giro a cena olhava para a nuca: óculos, olhos e boca invisíveis.
    expect(sem).toBeGreaterThan(130)
    expect(com).toBeLessThan(sem - 10) // melhora de verdade, não de um grau
  })

  it("mas o giro é LEVE: a mesa não vira de frente para quem olha", () => {
    expect(Math.abs(GIRO_ZONA)).toBeGreaterThan(0)
    expect(Math.abs(GIRO_ZONA)).toBeLessThan(Math.PI / 5) // até 36°
  })

  it("girar para o outro lado seria PIOR — é a armadilha do sinal", () => {
    expect(anguloRostoCamera(-GIRO_ZONA)).toBeGreaterThan(anguloRostoCamera(0))
  })

  it("mesmo girada, a mesa não atravessa a parede do fundo", () => {
    const sala = buildEscritorio()
    sala.updateMatrixWorld(true)
    const tampo = new Box3().setFromObject(malha(sala, "Mesa_Tampo"))
    const parede = new Box3().setFromObject(malha(sala, "Parede_Fundo"))
    expect(tampo.max.y).toBeLessThanOrEqual(parede.min.y)
  })

  it("o avanço do giro é derivado do ângulo, não um número solto", () => {
    expect(avancoDoGiro(0)).toBe(0) // sem giro, sem correção
    expect(avancoDoGiro(D30)).toBeGreaterThan(avancoDoGiro(D10))
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
