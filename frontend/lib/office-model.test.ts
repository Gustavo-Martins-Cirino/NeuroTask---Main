import { describe, it, expect } from "vitest"
import { Box3, Group, Mesh, Vector3 } from "three"
import { buildEscritorio, buildPersonagem, recuoDaSala, PIVO_ANTEBRACO } from "./office-model"
import { typingTap, TECLA_AMPLITUDE } from "./office-typing"
import { CAMERA_POS } from "./office-camera"

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

  it("os cabos chegam na tomada, não morrem no meio do caminho", () => {
    const sala = buildEscritorio()
    sala.updateMatrixWorld(true)
    const tomada = new Box3().setFromObject(malha(sala, "Tomada_Espelho"))
    const centro = tomada.getCenter(new Vector3())
    for (const nome of ["Cabo_PC", "Cabo_Monitor"]) {
      const c = new Box3().setFromObject(malha(sala, nome))
      // A ponta do cabo tem de estar encostada na tomada em todos os eixos.
      expect(c.max.y).toBeGreaterThan(tomada.min.y - 0.06)
      expect(Math.abs(c.max.x - centro.x)).toBeLessThan(0.15)
      expect(c.min.z).toBeLessThan(centro.z + 0.1)
    }
  })

  it("nem cabo nem tomada atravessam a parede do fundo", () => {
    const sala = buildEscritorio()
    sala.updateMatrixWorld(true)
    const parede = new Box3().setFromObject(malha(sala, "Parede_Fundo"))
    for (const nome of ["Cabo_PC", "Cabo_Monitor", "Tomada_Espelho"]) {
      expect(new Box3().setFromObject(malha(sala, nome)).max.y).toBeLessThan(parede.max.y)
    }
  })

  it("a tomada fica acima do rodapé e fora da sombra da mesa", () => {
    const sala = buildEscritorio()
    sala.updateMatrixWorld(true)
    const tomada = new Box3().setFromObject(malha(sala, "Tomada_Espelho"))
    const rodape = new Box3().setFromObject(malha(sala, "Rodape_Fundo"))
    const mesa = new Box3().setFromObject(malha(sala, "Mesa_Tampo"))
    expect(tomada.min.z).toBeGreaterThan(rodape.max.z)
    expect(tomada.min.x).toBeGreaterThan(mesa.max.x) // à direita do tampo
  })

  it("os cabos caem com barriga — reta seria mangueira, não cabo", () => {
    const sala = buildEscritorio()
    sala.updateMatrixWorld(true)
    const c = new Box3().setFromObject(malha(sala, "Cabo_PC"))
    // Desce da mesa (~0.8) até perto do piso antes de subir para a tomada.
    expect(c.min.z).toBeLessThan(0.2)
    expect(c.max.z).toBeGreaterThan(0.7)
  })

  it("o ombro nasce fora do torso, senão o braço some dentro do corpo", () => {
    const torso = new Box3().setFromObject(malha(buildPersonagem(), "Torso"))
    const p = buildPersonagem()
    p.updateMatrixWorld(true)
    const braco = new Box3().setFromObject(malha(p, "Braco_Direito"))
    expect(braco.max.x).toBeGreaterThan(torso.max.x)
  })

  // Conversão sala→mundo de office-scene-3d: dentro de
  // <group rotation={[-PI/2,0,0]} scale={4}>, (x,y,z) → (x, z, −y).
  const paraMundo = (p: Vector3) => new Vector3(p.x, p.z, -p.y).multiplyScalar(4)

  /** Ângulo entre a direção do rosto e a direção da câmera, em graus.
   *  > 90° = vemos as costas; 90° = perfil. */
  function anguloRostoCamera(camera: readonly [number, number, number]): number {
    const cabecaM = paraMundo(new Vector3(0, 0.9, 1.26))
    // O rosto olha para +Y na sala, que no mundo é −Z.
    const frenteM = new Vector3(0, 0, -1)
    const paraCamera = new Vector3(...camera).sub(cabecaM).normalize()
    const dot = Math.max(-1, Math.min(1, frenteM.dot(paraCamera)))
    return (Math.acos(dot) * 180) / Math.PI
  }

  it("o azimute da câmera tira a cena de trás da nuca do boneco", () => {
    const antes = anguloRostoCamera([16, 14, 16]) // a diagonal de 45° de antes
    const agora = anguloRostoCamera(CAMERA_POS)
    expect(antes).toBeGreaterThan(130) // era quase a nuca pura
    expect(agora).toBeLessThan(antes - 15)
    expect(agora).toBeGreaterThan(90) // perfil; de frente a parede taparia tudo
  })

  it("a câmera manteve altura e distância — só o azimute mudou", () => {
    const raio = Math.hypot(CAMERA_POS[0], CAMERA_POS[2])
    expect(raio).toBeCloseTo(Math.hypot(16, 16), 6)
    expect(CAMERA_POS[1]).toBe(14)
  })

  it("a câmera segue do lado ABERTO da sala, senão a parede tapa a cena", () => {
    // Parede do fundo em z<0 no mundo: a câmera não pode cruzar para lá.
    expect(CAMERA_POS[2]).toBeGreaterThan(0)
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
