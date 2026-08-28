import { describe, it, expect } from "vitest"
import { Box3, DoubleSide, Group, Mesh, MeshStandardMaterial, Vector3 } from "three"
import {
  buildEscritorio, buildPersonagem, recuoDaSala, PIVO_ANTEBRACO,
  CABECA_CENTRO, CABECA_SEMI, TOPO_DO_CABELO, type EscritorioExtras,
} from "./office-model"
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
    const cabecaM = paraMundo(new Vector3(...CABECA_CENTRO))
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

// A janela e o neon eram os dois itens que a loja vendia e a cena não entregava:
// "a janela parece só algumas manchas na parede" e "o neon não dá pra ver nada".
// A causa da janela era medível — as peças ficavam DENTRO da parede (z-fighting).

const FACE_FUNDO = 1.95   // face interna da parede do fundo no nível padrão
const FACE_LATERAL = -1.95

function pecas(g: Group, prefixo: string): string[] {
  const out: string[] = []
  g.traverse((o) => { if (o.name.startsWith(prefixo)) out.push(o.name) })
  return out
}

/** Os vértices de uma malha, já em coordenadas do mundo. */
function verticesDe(g: Group, nome: string): Vector3[] {
  const m = malha(g, nome) as Mesh
  const pos = m.geometry.attributes.position
  const out: Vector3[] = []
  for (let i = 0; i < pos.count; i++) {
    out.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld))
  }
  return out
}

function caixaMundo(g: Group, nome: string): Box3 {
  g.updateMatrixWorld(true)
  return new Box3().setFromObject(malha(g, nome))
}

describe("janela para a cidade", () => {
  const sala = () => buildEscritorio({ extras: { janela: true } })

  it("nenhuma peça afunda na parede — era o que virava mancha", () => {
    const g = sala()
    const nomes = pecas(g, "Janela_")
    expect(nomes.length).toBeGreaterThan(15) // caixilho + céu + prédios + luzes
    for (const n of nomes) {
      expect(caixaMundo(g, n).max.y).toBeLessThanOrEqual(FACE_FUNDO + 1e-6)
    }
  })

  it("o vidro é transparente, senão tapa a vista que acabamos de montar", () => {
    const vidro = malha(sala(), "Janela_Vidro") as Mesh
    const mat = vidro.material as { transparent: boolean; opacity: number }
    expect(mat.transparent).toBe(true)
    expect(mat.opacity).toBeLessThan(0.5)
  })

  it("a vista fica ATRÁS do vidro, e o caixilho à frente dele", () => {
    const g = sala()
    const vidro = caixaMundo(g, "Janela_Vidro").getCenter(new Vector3()).y
    const ceu = caixaMundo(g, "Janela_Ceu").getCenter(new Vector3()).y
    const caixilho = caixaMundo(g, "Janela_Caixilho_Topo").getCenter(new Vector3()).y
    expect(ceu).toBeGreaterThan(vidro)      // céu mais perto da parede
    expect(caixilho).toBeLessThan(vidro)    // caixilho mais dentro da sala
  })

  it("os prédios cabem no vão — cidade transbordando vira mancha de novo", () => {
    const g = sala()
    const vao = caixaMundo(g, "Janela_Vidro")
    for (const n of [...pecas(g, "Janela_Predio_"), ...pecas(g, "Janela_PredioLonge_")]) {
      const b = caixaMundo(g, n)
      expect(b.min.x).toBeGreaterThanOrEqual(vao.min.x - 1e-6)
      expect(b.max.x).toBeLessThanOrEqual(vao.max.x + 1e-6)
      expect(b.max.z).toBeLessThanOrEqual(vao.max.z + 1e-6)
    }
  })

  // Cidade se lê por CONTRASTE. Com tudo do mesmo cinza-médio a vista era uma
  // mancha: nem silhueta contra o céu, nem janelinha que parecesse acesa.
  it("duas camadas de prédios: a de trás é mais clara e fica atrás da da frente", () => {
    const g = sala()
    const longe = pecas(g, "Janela_PredioLonge_")
    expect(longe.length).toBeGreaterThan(2)
    const luz = (n: string) => {
      const c = ((malha(g, n) as Mesh).material as unknown as { color: { r: number; g: number; b: number } }).color
      return (c.r + c.g + c.b) / 3
    }
    // Perspectiva atmosférica: o que está longe puxa para a cor do céu.
    expect(luz("Janela_PredioLonge_0")).toBeGreaterThan(luz("Janela_Predio_0") * 2)
    expect(luz("Janela_PredioLonge_0")).toBeLessThan(luz("Janela_Ceu"))
    // E fica mais perto da parede do que a fileira da frente.
    expect(caixaMundo(g, "Janela_PredioLonge_0").getCenter(new Vector3()).y)
      .toBeGreaterThan(caixaMundo(g, "Janela_Predio_0").getCenter(new Vector3()).y)
  })

  it("cada janelinha acesa fica dentro do prédio dela, não solta no céu", () => {
    const g = sala()
    const luzes = pecas(g, "Janela_Luz_")
    expect(luzes.length).toBeGreaterThan(10)
    for (const n of luzes) {
      const predio = caixaMundo(g, `Janela_Predio_${n.split("_")[2]}`)
      const b = caixaMundo(g, n)
      expect(b.min.x).toBeGreaterThanOrEqual(predio.min.x - 1e-6)
      expect(b.max.x).toBeLessThanOrEqual(predio.max.x + 1e-6)
      expect(b.min.z).toBeGreaterThanOrEqual(predio.min.z - 1e-6)
      expect(b.max.z).toBeLessThanOrEqual(predio.max.z + 1e-6)
    }
  })

  it("a cidade não acende tudo — prédio com todas as janelas acesas é escritório, não cidade", () => {
    const g = sala()
    let possiveis = 0
    for (const n of pecas(g, "Janela_Predio_")) {
      const b = caixaMundo(g, n)
      const larg = b.max.x - b.min.x
      const alt = b.max.z - b.min.z
      possiveis += Math.max(2, Math.floor(alt / 0.12)) * (larg > 0.18 ? 3 : 2)
    }
    const acesas = pecas(g, "Janela_Luz_").length
    expect(acesas).toBeLessThan(possiveis)
    expect(acesas).toBeGreaterThan(possiveis * 0.4)
  })
})

describe("letreiro de neon", () => {
  const sala = () => buildEscritorio({ extras: { neon: true } })

  it("escreve focus de verdade: um traço por segmento de cada letra", () => {
    const g = sala()
    // f=3, o=4, c=3, u=3, s=5 traços — antes eram 4 barras que não formavam letra
    for (const [letra, traços] of [["f", 3], ["o", 4], ["c", 3], ["u", 3], ["s", 5]] as const) {
      expect(pecas(g, `Neon_${letra}_`).length).toBe(traços)
    }
  })

  it("as letras ficam à frente da placa e dentro dela", () => {
    const g = sala()
    const placa = caixaMundo(g, "Neon_Placa")
    for (const letra of ["f", "o", "c", "u", "s"]) {
      for (const n of pecas(g, `Neon_${letra}_`)) {
        const b = caixaMundo(g, n)
        expect(b.min.x).toBeGreaterThan(placa.max.x - 1e-6) // à frente (sala em x maior)
        expect(b.min.y).toBeGreaterThanOrEqual(placa.min.y)
        expect(b.max.y).toBeLessThanOrEqual(placa.max.y)
        expect(b.max.z).toBeLessThanOrEqual(placa.max.z + 1e-6)
      }
    }
  })

  it("nada do letreiro atravessa a parede lateral", () => {
    const g = sala()
    for (const n of pecas(g, "Neon_")) {
      expect(caixaMundo(g, n).min.x).toBeGreaterThanOrEqual(FACE_LATERAL - 1e-6)
    }
  })

  it("as letras vêm na ordem de focus, da esquerda para a direita", () => {
    const g = sala()
    const centroY = (l: string) =>
      pecas(g, `Neon_${l}_`).reduce((acc, n) => acc + caixaMundo(g, n).getCenter(new Vector3()).y, 0) /
      pecas(g, `Neon_${l}_`).length
    const ys = ["f", "o", "c", "u", "s"].map(centroY)
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThan(ys[i - 1])
  })
})

// Boné e óculos: "o boné tá muito reto" e "coloco os óculos e nem consigo ver".
// A cabeça é um elipsoide (mais estreita que funda, mais alta que larga) — as
// medidas dela vêm do próprio módulo, e não copiadas aqui: foi copiando que a
// primeira versão destes testes ficou medindo uma esfera que já não existia.

const CABECA = new Vector3(...CABECA_CENTRO)

/** Meia-largura do crânio (no eixo do rosto) na altura `z`. */
function raioDoRostoEm(z: number): number {
  const t = (z - CABECA.z) / CABECA_SEMI[2]
  return CABECA_SEMI[1] * Math.sqrt(Math.max(0, 1 - t * t))
}

function boneco(acess: Parameters<typeof buildPersonagem>[1]) {
  const p = buildPersonagem(undefined, acess)
  p.updateMatrixWorld(true)
  return p
}

describe("móveis: sofá", () => {
  const sala = (extras: EscritorioExtras = {}) => buildEscritorio({ extras: { sofa: true, ...extras } })
  const peca = (nome: string, extras: EscritorioExtras = {}) => caixaMundo(sala(extras), nome)

  it("encosta na parede sem afundar no rodapé", () => {
    // O rodapé se projeta 12 cm da parede: "encostar na parede" e "encostar no
    // rodapé" são coisas diferentes, e é fácil escrever a errada.
    const rodape = peca("Rodape_Lateral")
    const corpo = peca("Sofa_Corpo")
    expect(corpo.min.x).toBeGreaterThan(rodape.max.x)
    expect(corpo.min.x - rodape.max.x).toBeLessThan(0.1) // encostado, não solto no meio
  })

  it("olha para dentro da sala: o encosto fica do lado da parede", () => {
    // Da câmera (que vem do +x) um sofá virado ao contrário é um bloco.
    // Pelos CENTROS: a almofada do assento se enfia um pouco por baixo do
    // encosto, como num sofá de verdade — comparar bordas acusaria isso.
    const encosto = peca("Sofa_Encosto").getCenter(new Vector3())
    const assento = peca("Sofa_Assento_Direito").getCenter(new Vector3())
    expect(encosto.x).toBeLessThan(assento.x - 0.15)
    expect(encosto.z).toBeGreaterThan(assento.z)
  })

  it("não invade a estante, que mora na mesma parede", () => {
    const s = sala({ estante: true })
    const sofa = caixaMundo(s, "Sofa_Braco_Direito")
    const estante = caixaMundo(s, "Estante_Base")
    expect(sofa.max.y).toBeLessThan(estante.min.y)
  })

  it("cabe na sala do nível 1, que é a menor de todas", () => {
    const s = buildEscritorio({ nivel: 1, extras: { sofa: true } })
    const piso = caixaMundo(s, "Piso")
    for (const nome of ["Sofa_Corpo", "Sofa_Braco_Direito", "Sofa_Braco_Esquerdo"]) {
      const c = caixaMundo(s, nome)
      expect(c.min.y).toBeGreaterThan(piso.min.y)
      expect(c.min.x).toBeGreaterThan(piso.min.x)
    }
  })

  it("os pés tocam o piso e o assento não flutua sobre eles", () => {
    const pe = peca("Sofa_Pe_-0.3_-0.62")
    const corpo = peca("Sofa_Corpo")
    expect(pe.min.z).toBeLessThan(0.005)
    expect(corpo.min.z).toBeLessThanOrEqual(pe.max.z + 1e-6)
  })

  it("a almofada solta apoia no assento, sem afundar nele", () => {
    const cuxim = peca("Sofa_Cuxim")
    const assento = peca("Sofa_Assento_Direito")
    expect(cuxim.min.z).toBeGreaterThan(assento.max.z - 0.02)
  })

  it("sem comprar, não sobra peça nenhuma dele na sala", () => {
    expect(pecas(buildEscritorio(), "Sofa_")).toHaveLength(0)
  })
})

describe("corpo do boneco", () => {
  const caixa = (nome: string) => new Box3().setFromObject(malha(boneco({}), nome), true)

  it("o tronco não é uma tábua: o fundo acompanha a largura", () => {
    // Era 32 cm de largura por 20 de fundo. De perfil — que é de onde a câmera
    // olha — uma tábua dessas some.
    const t = caixa("Torso").getSize(new Vector3())
    expect(t.y / t.x).toBeGreaterThan(0.7)
  })

  it("existe ombro entre o tronco e o braço, e ele cobre a ponta do braço", () => {
    // Sem a bola, o braço é um palito espetado na quina da caixa do tronco —
    // e engrossar o braço não conserta isso, só engrossa o palito.
    const torso = caixa("Torso")
    const ombro = caixa("Ombro_Direito")
    const braco = caixa("Braco_Direito")
    expect(ombro.max.x).toBeGreaterThan(torso.max.x)
    expect(ombro.max.x).toBeGreaterThan(braco.max.x - 0.005)
  })

  it("a perna dobra num joelho, não numa quina", () => {
    const joelho = caixa("Joelho_Direita")
    const coxa = caixa("Coxa_Direita")
    const canela = caixa("Canela_Direita")
    // O joelho ocupa o encontro dos dois: a frente da coxa e o topo da canela.
    expect(joelho.max.y).toBeGreaterThan(coxa.max.y - 0.02)
    expect(joelho.min.z).toBeLessThan(canela.max.z)
  })

  it("a gola da camisa envolve o pescoço, e ele fica de fora por cima", () => {
    const gola = caixa("Gola")
    const pescoco = caixa("Pescoco")
    expect(gola.max.x).toBeGreaterThan(pescoco.max.x)
    expect(pescoco.max.z).toBeGreaterThan(gola.max.z)
  })

  it("o pé apoia no piso, sem afundar nem flutuar", () => {
    for (const suf of ["Direita", "Esquerda"] as const) {
      const pe = caixa(`Pe_${suf}`)
      expect(pe.min.z).toBeGreaterThan(-0.001)
      expect(pe.min.z).toBeLessThan(0.01)
    }
  })
})

describe("cabeça e cabelo", () => {
  // Caixa PRECISA (medida nos vértices). A do three, por padrão, gira a caixa
  // local e devolve a caixa disso — para uma calota inclinada isso mede 6 cm a
  // mais no topo, e um teste de "o chapéu encosta no cabelo" acusaria colisão
  // com um cabelo que não está lá.
  const caixa = (nome: string, acess: Parameters<typeof buildPersonagem>[1] = {}) =>
    new Box3().setFromObject(malha(boneco(acess), nome), true)

  it("o crânio tem forma de cabeça: mais estreito que fundo, mais alto que largo", () => {
    const c = caixa("Cabeca").getSize(new Vector3())
    expect(c.x).toBeLessThan(c.y) // estreito no eixo de orelha a orelha
    expect(c.x).toBeLessThan(c.z) // e mais alto do que largo
  })

  it("o cabelo tem espessura NA COROA — era aí que ele sumia", () => {
    // O defeito antigo: a panqueca de cabelo terminava exatamente no topo do
    // crânio, então sobrava zero de cabelo em cima e só se via uma faixa.
    const cranio = caixa("Cabeca")
    const cabelo = caixa("Cabelo")
    expect(cabelo.max.z - cranio.max.z).toBeGreaterThan(0.01)
  })

  it("o cabelo cobre nuca e laterais, e não só o topo", () => {
    const cranio = caixa("Cabeca")
    const cabelo = caixa("Cabelo")
    expect(cabelo.min.y).toBeLessThan(cranio.min.y - 0.01) // sobra na nuca
    expect(cabelo.max.x).toBeGreaterThan(cranio.max.x)     // e nas laterais
  })

  it("o cabelo NÃO invade o rosto — a borda dele passa acima da testa", () => {
    // Medido nos VÉRTICES, não na caixa: a caixa do cabelo cobre olhos e nariz
    // sem que exista uma única peça de cabelo ali (a calota pende para trás, e
    // a região da frente dela é buraco).
    // A faixa de olhos, nariz e sobrancelhas. A borda do cabelo passa ACIMA
    // dela: no topo desta caixa o cabelo mais à frente ainda está na nuca.
    const rosto = new Box3(
      new Vector3(-0.075, CABECA.y + 0.09, 1.23),
      new Vector3(0.075, CABECA.y + 0.22, 1.308)
    )
    for (const v of verticesDe(boneco({}), "Cabelo")) expect(rosto.containsPoint(v)).toBe(false)
  })

  it("olhos, nariz e boca ficam à mostra, não afundados na cabeça", () => {
    for (const nome of ["Olho_Direito", "Olho_Esquerdo", "Nariz", "Boca", "Sobrancelha_Direita"]) {
      const c = caixa(nome)
      const z = c.getCenter(new Vector3()).z
      expect(c.max.y).toBeGreaterThan(CABECA.y + raioDoRostoEm(z))
    }
  })

  it("o nariz aparece de perfil, que é de onde a câmera olha", () => {
    const nariz = caixa("Nariz")
    const z = nariz.getCenter(new Vector3()).z
    expect(nariz.max.y - (CABECA.y + raioDoRostoEm(z))).toBeGreaterThan(0.008)
  })

  it("a orelha escapa do cabelo — dentro dele ela não existiria", () => {
    const cabelo = caixa("Cabelo")
    for (const suf of ["Direita", "Esquerda"] as const) {
      const orelha = caixa(`Orelha_${suf}`)
      expect(Math.max(Math.abs(orelha.min.x), Math.abs(orelha.max.x)))
        .toBeGreaterThan(Math.max(Math.abs(cabelo.min.x), Math.abs(cabelo.max.x)))
    }
  })

  it("todo chapéu assenta no CABELO, e nenhum afunda nele", () => {
    // A altura de cada chapéu sai de TOPO_DO_CABELO. Com o número cravado em
    // cada peça, engrossar o cabelo enfiaria a aba dentro dele — e só se
    // descobriria no olho.
    for (const [chapeu, peca] of [["social", "Chapeu_Aba"], ["coroa", "Coroa_Aro"]] as const) {
      const c = caixa(peca, { chapeu })
      expect(c.max.z).toBeGreaterThan(TOPO_DO_CABELO)
      expect(c.min.z).toBeGreaterThan(TOPO_DO_CABELO - 0.005)
    }
  })

  it("o boné cobre o cabelo em vez de ser atravessado por ele", () => {
    expect(caixa("Bone_Copa", { chapeu: "bone" }).max.z)
      .toBeGreaterThan(caixa("Cabelo", { chapeu: "bone" }).max.z)
  })
})

describe("boné", () => {
  const comBone = () => boneco({ chapeu: "bone" })

  it("assenta NA cabeça — girar o grupo pela origem jogava o boné pro lado", () => {
    // O bug: rotation no grupo com origem no chão do boneco deslocava tudo
    // ~17 cm (8° a 1,26 m de altura). A copa tem que continuar sobre a cabeça.
    const copa = new Box3().setFromObject(malha(comBone(), "Bone_Copa")).getCenter(new Vector3())
    expect(Math.abs(copa.x - CABECA.x)).toBeLessThan(0.05)
    expect(Math.abs(copa.y - CABECA.y)).toBeLessThan(0.05)
    expect(copa.z).toBeGreaterThan(CABECA.z) // em cima, não em volta
  })

  it("a aba projeta para a FRENTE, na direção para onde o rosto olha (+Y)", () => {
    const p = comBone()
    const abas = pecas(p, "Bone_Aba_")
    expect(abas.length).toBeGreaterThan(4) // leque, não uma placa só
    for (const n of abas) {
      expect(new Box3().setFromObject(malha(p, n)).getCenter(new Vector3()).y).toBeGreaterThan(CABECA.y)
    }
  })

  it("as pontas da aba CAEM — reta é a placa de antes", () => {
    const p = comBone()
    const abas = pecas(p, "Bone_Aba_").map((n) => new Box3().setFromObject(malha(p, n)).getCenter(new Vector3()))
    // Média das DUAS pontas: o boné é usado torto, e o tilt lateral levanta uma
    // ponta enquanto baixa a outra. A média cancela isso e sobra a curva.
    const meio = abas[Math.floor(abas.length / 2)]
    const pontas = (abas[0].z + abas[abas.length - 1].z) / 2
    expect(pontas).toBeLessThan(meio.z - 0.008)
  })

  it("a aba não desce sobre os olhos (z≈1.28), senão tapa o rosto", () => {
    const p = comBone()
    for (const n of pecas(p, "Bone_Aba_")) {
      expect(new Box3().setFromObject(malha(p, n)).min.z).toBeGreaterThan(1.27)
    }
  })
})

describe("chapéus novos", () => {
  const caixa = (nome: string, chapeu: NonNullable<Parameters<typeof buildPersonagem>[1]>["chapeu"]) =>
    new Box3().setFromObject(malha(boneco({ chapeu }), nome), true)

  it("gorro: a copa cobre o cabelo, e não o contrário", () => {
    const copa = caixa("Gorro_Copa", "gorro")
    const cabelo = caixa("Cabelo", "gorro")
    expect(copa.max.z).toBeGreaterThan(cabelo.max.z)
    expect(copa.max.x).toBeGreaterThan(cabelo.max.x)
  })

  it("gorro: a barra para acima dos olhos", () => {
    // Só o que passa NA FRENTE dos olhos conta: a barra é um anel inclinado, e
    // a parte dela que desce mais é a da nuca. Comparar caixas mediria isso.
    const p = boneco({ chapeu: "gorro" })
    const olho = new Box3().setFromObject(malha(p, "Olho_Direito"), true)
    for (const v of verticesDe(p, "Gorro_Barra")) {
      if (v.y > CABECA.y && Math.abs(v.x) <= olho.max.x) expect(v.z).toBeGreaterThan(olho.max.z)
    }
  })

  it("gorro: o pompom fica no alto e para trás, não na testa", () => {
    const pompom = caixa("Gorro_Pompom", "gorro")
    const copa = caixa("Gorro_Copa", "gorro")
    expect(pompom.max.z).toBeGreaterThan(copa.max.z)
    expect(pompom.getCenter(new Vector3()).y).toBeLessThan(CABECA.y)
  })

  it("capuz: engole a cabeça e desce até os ombros", () => {
    const casco = caixa("Capuz_Casco", "capuz")
    const cabelo = caixa("Cabelo", "capuz")
    expect(casco.max.z).toBeGreaterThan(cabelo.max.z)
    expect(casco.max.x).toBeGreaterThan(cabelo.max.x + 0.03)
    expect(casco.min.z).toBeLessThan(1.08) // alcança o alto do ombro
  })

  it("capuz: na frente dos olhos não existe pano — só atrás e dos lados", () => {
    // Uma calota é superfície aberta: a caixa dela cobre o rosto inteiro sem
    // que exista uma peça ali. Na faixa dos olhos e no eixo deles, todo vértice
    // do capuz tem de estar ATRÁS da cabeça.
    const p = boneco({ chapeu: "capuz" })
    const olho = new Box3().setFromObject(malha(p, "Olho_Direito"), true)
    for (const v of verticesDe(p, "Capuz_Casco")) {
      if (v.z > olho.min.z && v.z < olho.max.z && Math.abs(v.x) <= olho.max.x) {
        expect(v.y).toBeLessThan(olho.min.y)
      }
    }
  })

  it("auréola: paira acima da cabeça, sem encostar em nada", () => {
    const aureola = caixa("Aureola", "aureola")
    const cabelo = caixa("Cabelo", "aureola")
    expect(aureola.min.z).toBeGreaterThan(cabelo.max.z + 0.02)
  })

  it("auréola: é emissiva — é a luz que a faz ler como auréola, não o dourado", () => {
    const m = malha(boneco({ chapeu: "aureola" }), "Aureola") as Mesh
    expect((m.material as MeshStandardMaterial).emissiveIntensity).toBeGreaterThan(0.5)
  })
})

describe("óculos", () => {
  for (const tipo of ["grau", "escuros"] as const) {
    it(`${tipo}: a lente fica À FRENTE do rosto, não embutida nele`, () => {
      const p = boneco({ oculos: tipo })
      const lente = new Box3().setFromObject(malha(p, "Oculos_Lente_Direita"))
      const z = lente.getCenter(new Vector3()).z
      // Raio da seção da cabeça naquela altura: o que a lente precisa passar.
      expect(lente.min.y).toBeGreaterThan(CABECA.y + raioDoRostoEm(z) - 0.005)
    })

    it(`${tipo}: tem ARO em volta — é ele que se enxerga de longe, não a lente`, () => {
      const p = boneco({ oculos: tipo })
      const aros = pecas(p, "Oculos_Aro_")
      expect(aros.length).toBe(8) // 4 lados × 2 olhos
      const lente = new Box3().setFromObject(malha(p, "Oculos_Lente_Direita"))
      const topo = new Box3().setFromObject(malha(p, "Oculos_Aro_Direita_Topo"))
      expect(topo.min.z).toBeGreaterThanOrEqual(lente.max.z - 1e-6) // contorna por cima
    })
  }

  it("os dois olhos ganham lente, e elas não se cruzam no meio do rosto", () => {
    const p = boneco({ oculos: "grau" })
    const d = new Box3().setFromObject(malha(p, "Oculos_Lente_Direita"))
    const e = new Box3().setFromObject(malha(p, "Oculos_Lente_Esquerda"))
    expect(d.min.x).toBeGreaterThan(e.max.x)
  })
})

describe("papel de parede", () => {
  it("é PADRÃO, não cor: gera listras nas duas paredes", () => {
    const g = buildEscritorio({ parede: "listrada" })
    expect(pecas(g, "Papel_Listra_Fundo_").length).toBeGreaterThan(5)
    expect(pecas(g, "Papel_Listra_Lateral_").length).toBeGreaterThan(5)
  })

  it("sem o item comprado, nenhuma listra aparece", () => {
    expect(pecas(buildEscritorio(), "Papel_Listra_").length).toBe(0)
  })

  it("as listras ficam à frente da parede, não afundadas nela", () => {
    const g = buildEscritorio({ parede: "listrada" })
    for (const n of pecas(g, "Papel_Listra_Fundo_")) {
      expect(caixaMundo(g, n).max.y).toBeLessThanOrEqual(FACE_FUNDO + 1e-6)
    }
    for (const n of pecas(g, "Papel_Listra_Lateral_")) {
      expect(caixaMundo(g, n).min.x).toBeGreaterThanOrEqual(FACE_LATERAL - 1e-6)
    }
  })

  it("as listras cobrem a largura da sala, sem transbordar", () => {
    const g = buildEscritorio({ parede: "listrada" })
    for (const n of pecas(g, "Papel_Listra_Fundo_")) {
      const b = caixaMundo(g, n)
      expect(b.min.x).toBeGreaterThanOrEqual(-2.01)
      expect(b.max.x).toBeLessThanOrEqual(2.01)
    }
  })
})

describe("vagas na parede do fundo", () => {
  /** Duas caixas se cruzam nos três eixos? É o que "um em cima do outro" quer
   *  dizer, e era o caso do relógio com o quadro. */
  const cruzam = (a: Box3, b: Box3) =>
    a.max.x > b.min.x + 1e-6 && a.min.x < b.max.x - 1e-6 &&
    a.max.y > b.min.y + 1e-6 && a.min.y < b.max.y - 1e-6 &&
    a.max.z > b.min.z + 1e-6 && a.min.z < b.max.z - 1e-6

  it("relógio e quadro juntos não se sobrepõem — era o bug", () => {
    const g = buildEscritorio({ extras: { quadro: true, relogio: true } })
    const quadro = caixaMundo(g, "Quadro_Moldura")
    for (const n of pecas(g, "Relogio_")) {
      expect(cruzam(caixaMundo(g, n), quadro)).toBe(false)
    }
  })

  it("nem com a janela junto, que come o lado direito da parede", () => {
    const g = buildEscritorio({ extras: { quadro: true, relogio: true, janela: true } })
    const janela = caixaMundo(g, "Janela_Vidro")
    for (const n of [...pecas(g, "Relogio_"), ...pecas(g, "Quadro_")]) {
      expect(cruzam(caixaMundo(g, n), janela)).toBe(false)
    }
  })

  it("sozinho, cada um continua cabendo na parede", () => {
    for (const extras of [{ quadro: true }, { relogio: true }]) {
      const g = buildEscritorio({ extras })
      for (const n of [...pecas(g, "Quadro_"), ...pecas(g, "Relogio_")]) {
        const b = caixaMundo(g, n)
        expect(b.min.x).toBeGreaterThanOrEqual(FACE_LATERAL - 1e-6)
        expect(b.max.x).toBeLessThanOrEqual(2 + 1e-6)
      }
    }
  })

  it("a vaga MUDA conforme o que está pendurado — x cravado é o que quebrava", () => {
    const so = buildEscritorio({ extras: { quadro: true } })
    const comRelogio = buildEscritorio({ extras: { quadro: true, relogio: true } })
    expect(caixaMundo(so, "Quadro_Moldura").min.x)
      .not.toBeCloseTo(caixaMundo(comRelogio, "Quadro_Moldura").min.x, 2)
  })
})

describe("paredes com desenho", () => {
  const materialDaParede = (parede: "tijolo" | "ripada" | "cimento" | "lisa") => {
    const g = buildEscritorio({ parede })
    return (malha(g, "Parede_Fundo") as Mesh).material as MeshStandardMaterial
  }

  it("tijolo, ripado e cimento entram como TEXTURA — em caixinha seriam centenas de malhas", () => {
    for (const tipo of ["tijolo", "ripada", "cimento"] as const) {
      expect(materialDaParede(tipo).map).not.toBeNull()
    }
    expect(materialDaParede("lisa").map).toBeNull()
  })

  it("com textura a cor do material é BRANCA — `map` multiplica a cor", () => {
    // Uma parede bege por baixo tingiria o tijolo inteiro de bege.
    expect(materialDaParede("tijolo").color.getHex()).toBe(0xffffff)
  })

  it("a cor pedida é ignorada quando há desenho, e respeitada quando não há", () => {
    const comDesenho = buildEscritorio({ parede: "tijolo", cores: { parede: "#8fb3d9" } })
    expect(((malha(comDesenho, "Parede_Fundo") as Mesh).material as MeshStandardMaterial).color.getHex()).toBe(0xffffff)
    const lisa = buildEscritorio({ parede: "lisa", cores: { parede: "#8fb3d9" } })
    expect(((malha(lisa, "Parede_Fundo") as Mesh).material as MeshStandardMaterial).color.getHex()).not.toBe(0xffffff)
  })

  it("o tijolo tem o tamanho de um tijolo: a repetição sai de metros, não de gosto", () => {
    // Azulejo = 2 tijolos (0,5 m) × 2 fiadas (0,2 m); sala padrão = 4 m, parede 2,6 m.
    const t = materialDaParede("tijolo").map!
    expect(t.repeat.x).toBeCloseTo(8, 5)
    expect(t.repeat.y).toBeCloseTo(13, 5)
  })

  it("o cimento não se repete — manchas largas repetidas mostrariam a grade", () => {
    const t = materialDaParede("cimento").map!
    expect(t.repeat.x).toBe(1)
    expect(t.repeat.y).toBe(1)
  })

  it("as texturas têm lado potência de dois, senão o three não gera mipmap", () => {
    const potencia = (n: number) => (n & (n - 1)) === 0
    for (const tipo of ["tijolo", "ripada", "cimento"] as const) {
      const t = materialDaParede(tipo).map as unknown as { image: { width: number; height: number } }
      expect(potencia(t.image.width)).toBe(true)
      expect(potencia(t.image.height)).toBe(true)
    }
  })
})

describe("itens novos da loja", () => {
  it("relógio: mostrador, 12 marcas e ponteiros — disco pelado não lê como relógio", () => {
    const g = buildEscritorio({ extras: { relogio: true } })
    expect(pecas(g, "Relogio_Marca_").length).toBe(12)
    expect(pecas(g, "Relogio_Ponteiro_").length).toBe(2)
    // Ponteiro da hora mais curto que o dos minutos, senão não dá pra distinguir
    const hora = caixaMundo(g, "Relogio_Ponteiro_Hora").getSize(new Vector3()).length()
    const min = caixaMundo(g, "Relogio_Ponteiro_Min").getSize(new Vector3()).length()
    expect(hora).toBeLessThan(min)
  })

  it("relógio: fica na parede do fundo, sem afundar nela", () => {
    const g = buildEscritorio({ extras: { relogio: true } })
    for (const n of pecas(g, "Relogio_")) {
      expect(caixaMundo(g, n).max.y).toBeLessThanOrEqual(FACE_FUNDO + 1e-6)
    }
  })

  it("prateleira: as coisas ficam EM CIMA da tábua, não atravessando ela", () => {
    const g = buildEscritorio({ extras: { prateleira: true } })
    const tabua = caixaMundo(g, "Prateleira_Tabua")
    for (const n of ["Prateleira_Livro_0", "Prateleira_Vaso", "Prateleira_Caneca"]) {
      expect(caixaMundo(g, n).min.z).toBeGreaterThanOrEqual(tabua.max.z - 1e-6)
    }
    expect(pecas(g, "Prateleira_Livro_").length).toBe(3)
  })

  it("prateleira: presa na parede lateral, sem atravessá-la", () => {
    const g = buildEscritorio({ extras: { prateleira: true } })
    for (const n of pecas(g, "Prateleira_")) {
      expect(caixaMundo(g, n).min.x).toBeGreaterThanOrEqual(FACE_LATERAL - 1e-6)
    }
  })

  it("piso de tábua: as peças ficam REBAIXADAS — subir 14mm faria a sala flutuar", () => {
    const g = buildEscritorio({ piso: "tabua" })
    const tabuas = pecas(g, "Piso_Tabua_")
    expect(tabuas.length).toBeGreaterThan(20)
    for (const n of tabuas) {
      // A superfície de apoio da sala é z=0. Nada do piso pode passar dela.
      expect(caixaMundo(g, n).max.z).toBeLessThanOrEqual(1e-6)
    }
  })

  it("piso de tábua: as emendas não se alinham de fileira em fileira", () => {
    // Tábua inteira de parede a parede — ou emenda sempre no mesmo x — denuncia
    // que aquilo é textura, não piso.
    const g = buildEscritorio({ piso: "tabua" })
    const fimDaPrimeira = (fileira: number) => caixaMundo(g, `Piso_Tabua_${fileira}_0`).max.x
    expect(fimDaPrimeira(0)).not.toBeCloseTo(fimDaPrimeira(1), 2)
    expect(fimDaPrimeira(1)).not.toBeCloseTo(fimDaPrimeira(2), 2)
  })

  it("piso de tábua: vizinhas têm tons diferentes — iguais viram retângulo marrom", () => {
    const g = buildEscritorio({ piso: "tabua" })
    const cor = (n: string) => ((malha(g, n) as Mesh).material as unknown as { color: { getHex(): number } }).color.getHex()
    expect(cor("Piso_Tabua_0_0")).not.toBe(cor("Piso_Tabua_1_0"))
  })

  it("piso liso não desenha peça nenhuma — cor sozinha é o item inteiro", () => {
    const g = buildEscritorio({ piso: "liso" })
    expect(pecas(g, "Piso_Tabua_").length).toBe(0)
    expect(pecas(g, "Piso_Ladrilho_").length).toBe(0)
  })

  it("ladrilho: cobre a sala inteira, sem sobra nas bordas", () => {
    const g = buildEscritorio({ piso: "ladrilho" })
    const ladrilhos = pecas(g, "Piso_Ladrilho_")
    expect(ladrilhos.length).toBeGreaterThan(20)
    const caixas = ladrilhos.map((n) => caixaMundo(g, n))
    const piso = caixaMundo(g, "Piso")
    expect(Math.min(...caixas.map((c) => c.min.x))).toBeGreaterThanOrEqual(piso.min.x - 1e-6)
    expect(Math.max(...caixas.map((c) => c.max.x))).toBeLessThanOrEqual(piso.max.x + 1e-6)
  })

  it("cabo: a ponta termina DENTRO do plugue — antes parava solta no ar", () => {
    // O bug era esse: os dois cabos acabavam quatro centímetros à frente da
    // placa, com a ponta apontando para a parede sem encostar em nada.
    const g = buildEscritorio()
    for (const [cabo, plugue] of [["Cabo_PC", "Tomada_Plugue_A"], ["Cabo_Monitor", "Tomada_Plugue_B"]]) {
      const caixaPlugue = caixaMundo(g, plugue)
      const m = malha(g, cabo) as Mesh
      const pos = m.geometry.getAttribute("position")
      // A ponta é o vértice mais próximo da parede do fundo (maior y).
      let ponta = new Vector3()
      for (let i = 0; i < pos.count; i++) {
        const v = new Vector3().fromBufferAttribute(pos, i)
        if (v.y > ponta.y || i === 0) ponta = v
      }
      expect(caixaPlugue.containsPoint(ponta.add(m.position))).toBe(true)
    }
  })

  it("cabo: o plugue encosta na placa da tomada, sem folga e sem afundar", () => {
    const g = buildEscritorio()
    const placa = caixaMundo(g, "Tomada_Espelho")
    for (const p of ["Tomada_Plugue_A", "Tomada_Plugue_B"]) {
      // A face de trás do plugue e a da frente da placa são a mesma linha.
      expect(Math.abs(caixaMundo(g, p).max.y - placa.min.y)).toBeLessThan(1e-6)
    }
  })

  it("tomada: dois bocais, um por cabo — com um só, um dos dois sobrava", () => {
    const g = buildEscritorio()
    expect(pecas(g, "Tomada_Furo_").length).toBe(6)
    expect(pecas(g, "Tomada_Plugue_").length).toBe(2)
    // Os dois plugues em alturas diferentes, senão são o mesmo ponto.
    const a = caixaMundo(g, "Tomada_Plugue_A")
    const b = caixaMundo(g, "Tomada_Plugue_B")
    expect(a.min.z).toBeGreaterThan(b.max.z - 1e-6)
  })

  it("estante: a armação não engole os livros — era o que a deixava um bloco marrom", () => {
    const g = buildEscritorio({ extras: { estante: true } })
    const livros = pecas(g, "Estante_Livro_")
    expect(livros.length).toBeGreaterThan(24)
    const armacao = pecas(g, "Estante_").filter((n) => !n.includes("Livro"))
    for (const peca of armacao) {
      const caixa = caixaMundo(g, peca)
      for (const livro of livros) {
        expect(caixa.containsBox(caixaMundo(g, livro))).toBe(false)
      }
    }
  })

  it("estante: a frente é aberta — nada da armação fica na frente de um livro", () => {
    // A câmera olha do +x (ver lib/office-camera), então "na frente" é ter x
    // MAIOR que o do livro, cruzando com ele em y e z. Era exatamente o que a
    // caixa maciça fazia com os 32 livros de uma vez.
    const g = buildEscritorio({ extras: { estante: true } })
    const armacao = pecas(g, "Estante_").filter((n) => !n.includes("Livro"))
      .map((n) => caixaMundo(g, n))
    for (const livro of pecas(g, "Estante_Livro_")) {
      const l = caixaMundo(g, livro)
      const tapando = armacao.filter(
        (a) => a.min.x > l.max.x - 1e-6 &&
          a.max.y > l.min.y + 1e-6 && a.min.y < l.max.y - 1e-6 &&
          a.max.z > l.min.z + 1e-6 && a.min.z < l.max.z - 1e-6
      )
      expect(tapando.length).toBe(0)
    }
  })

  it("estante: nenhum livro fura o tampo — o de cima passava 6mm do topo antigo", () => {
    const g = buildEscritorio({ extras: { estante: true } })
    // `buildEscritorio` devolve o grupo em coordenadas da SALA (o mapeamento
    // para o mundo mora na cena), e ali o eixo de cima é o z.
    const tampo = caixaMundo(g, "Estante_Tampo")
    for (const livro of pecas(g, "Estante_Livro_")) {
      expect(caixaMundo(g, livro).max.z).toBeLessThanOrEqual(tampo.min.z + 1e-6)
    }
  })

  it("estante: presa na parede lateral, sem atravessá-la", () => {
    const g = buildEscritorio({ extras: { estante: true } })
    for (const n of pecas(g, "Estante_")) {
      expect(caixaMundo(g, n).min.x).toBeGreaterThanOrEqual(FACE_LATERAL - 1e-6)
    }
  })

  it("LED RGB: contorna as DUAS paredes e as cores variam ao longo da fita", () => {
    const g = buildEscritorio({ extras: { ledRgb: true } })
    const fundo = pecas(g, "Led_Fundo_")
    expect(fundo.length).toBeGreaterThan(8)
    expect(pecas(g, "Led_Lateral_").length).toBe(fundo.length)
    // Cor de segmentos vizinhos tem de ser diferente — fita de uma cor só não é RGB
    const cor = (n: string) => ((malha(g, n) as Mesh).material as unknown as { color: { getHex(): number } }).color.getHex()
    expect(cor("Led_Fundo_0")).not.toBe(cor("Led_Fundo_1"))
  })

  it("LED RGB: é luz — os segmentos emitem, não só têm cor", () => {
    const g = buildEscritorio({ extras: { ledRgb: true } })
    const mat = (malha(g, "Led_Fundo_0") as Mesh).material as unknown as { emissiveIntensity: number }
    expect(mat.emissiveIntensity).toBeGreaterThan(1)
  })

  // O que desbotava a cena inteira: "luz forte" virava emissivo alto sobre uma
  // base da MESMA cor, os três canais passavam de 1 e o ACES devolvia branco.
  // Neon rosa, fita RGB e ventoinhas saíam pastel. Vale para toda peça colorida
  // que acende — a luz da luminária fica de fora, ela é branca de propósito.
  it("peças coloridas acesas: a cor vem da emissão, e ela cabe na faixa do tone mapping", () => {
    const g = buildEscritorio({ extras: { ledRgb: true, neon: true } })
    const coloridas = ["Led_Fundo_0", "Neon_f_0", "PC_Fan_A_Aro", "PC_Fan_B_Aro", "PC_Cooler_Aro", "PC_Gpu_Led"]
    for (const n of coloridas) {
      const m = (malha(g, n) as Mesh).material as unknown as {
        color: { r: number; g: number; b: number }
        emissive: { r: number; g: number; b: number }
        emissiveIntensity: number
      }
      const pico = (c: { r: number; g: number; b: number }) => Math.max(c.r, c.g, c.b)
      // Base quase preta: se ela repetir a cor, soma com a emissão e estoura.
      expect(pico(m.color)).toBeLessThan(pico(m.emissive) * 0.2)
      // E a emissão não pode jogar o canal mais forte muito acima de 1.
      expect(pico(m.emissive) * m.emissiveIntensity).toBeLessThan(1.4)
    }
  })

  it("notebook: troca o desktop inteiro — sem torre e sem suporte de monitor", () => {
    const g = buildEscritorio({ extras: { setup: "notebook" } })
    expect(pecas(g, "PC_Torre").length).toBe(0)
    expect(pecas(g, "Monitor_Suporte").length).toBe(0)
    expect(pecas(g, "Notebook_").length).toBeGreaterThan(2)
  })

  // O gabinete é um chassi de painéis (aberto no lado do vidro), então a "caixa
  // da torre" é a união deles — não existe uma peça única que a represente.
  const caixaDaTorre = (g: Group) => {
    const b = new Box3()
    for (const n of pecas(g, "PC_Torre_")) b.union(caixaMundo(g, n))
    return b
  }

  it("gabinete: é chassi aberto no lado do vidro — caixa fechada não mostra nada", () => {
    const g = buildEscritorio()
    // 5 painéis: base, topo, fundo e as duas laterais em y. O 6º lado é o vão.
    expect(pecas(g, "PC_Torre_").length).toBe(5)
    const dentro = caixaMundo(g, "PC_Placa_Mae")
    // Nenhum painel tapa a abertura: todos ficam atrás do plano do vidro.
    const abertura = caixaMundo(g, "PC_Vidro").min.x
    for (const n of pecas(g, "PC_Torre_")) {
      expect(caixaMundo(g, n).min.x).toBeLessThan(abertura)
    }
    expect(dentro.max.x).toBeLessThan(abertura)
  })

  it("gabinete: vidro na face que a câmera vê, e ele é transparente de verdade", () => {
    const g = buildEscritorio()
    const vidro = caixaMundo(g, "PC_Vidro")
    // A câmera está em +x: o vidro tem de ser a peça mais à direita da torre.
    expect(vidro.min.x).toBeGreaterThanOrEqual(caixaDaTorre(g).max.x - 1e-6)
    const mat = (malha(g, "PC_Vidro") as Mesh).material as unknown as { transparent: boolean; opacity: number }
    expect(mat.transparent).toBe(true)
    expect(mat.opacity).toBeLessThan(0.5)
  })

  it("gabinete: o chassi é DoubleSide — visto por dentro, o teto não some", () => {
    const g = buildEscritorio()
    const mat = (malha(g, "PC_Torre_Topo") as Mesh).material as unknown as { side: number }
    expect(mat.side).toBe(DoubleSide)
  })

  it("gabinete: duas ventoinhas na FRENTE, com aro aceso e pás — não discos chapados", () => {
    const g = buildEscritorio()
    const torre = caixaDaTorre(g)
    for (const fan of ["PC_Fan_A", "PC_Fan_B"]) {
      expect(pecas(g, `${fan}_Pa_`).length).toBe(5)
      // Frente = y menor (o lado de quem senta): o aro fica à frente da caixa.
      expect(caixaMundo(g, `${fan}_Aro`).max.y).toBeLessThanOrEqual(torre.min.y + 1e-6)
      const mat = (malha(g, `${fan}_Aro`) as Mesh).material as unknown as { emissiveIntensity: number }
      expect(mat.emissiveIntensity).toBeGreaterThan(1)
    }
    // Cores diferentes entre elas — duas iguais não é RGB, é lanterna dupla
    const cor = (n: string) => ((malha(g, n) as Mesh).material as unknown as { color: { getHex(): number } }).color.getHex()
    expect(cor("PC_Fan_A_Aro")).not.toBe(cor("PC_Fan_B_Aro"))
  })

  it("gabinete: as tripas ficam DENTRO da caixa — nada vazando pelas laterais", () => {
    const g = buildEscritorio()
    const torre = caixaDaTorre(g)
    for (const n of ["PC_Placa_Mae", "PC_Fonte", "PC_Gpu", "PC_Gpu_Led", "PC_Led_Interno", "PC_Cooler_Aro", "PC_Cooler_Hub"]) {
      expect(torre.containsBox(caixaMundo(g, n))).toBe(true)
    }
  })

  it("gabinete: apoia no tampo, sem afundar nele (a caixa antiga entrava 3 cm)", () => {
    const g = buildEscritorio()
    const tampo = caixaMundo(g, "Mesa_Tampo")
    expect(caixaDaTorre(g).min.z).toBeGreaterThanOrEqual(tampo.max.z - 1e-6)
  })

  it("gabinete: o notebook não traz peça nenhuma dele junto", () => {
    const g = buildEscritorio({ extras: { setup: "notebook" } })
    expect(pecas(g, "PC_").length).toBe(0)
  })

  it("luminária: braço articulado de verdade — duas barras com junta no meio", () => {
    const g = buildEscritorio({ extras: { luminaria: true } })
    expect(pecas(g, "Luminaria_Braco_").length).toBe(2)
    const cot = caixaMundo(g, "Luminaria_Cotovelo").getCenter(new Vector3())
    const b1 = caixaMundo(g, "Luminaria_Braco_1")
    const b2 = caixaMundo(g, "Luminaria_Braco_2")
    // A junta fecha o vão: as duas barras se encontram nela, não flutuam soltas.
    expect(b1.distanceToPoint(cot)).toBeLessThan(0.02)
    expect(b2.distanceToPoint(cot)).toBeLessThan(0.02)
  })

  it("luminária: a cúpula aponta para BAIXO, para a mesa — não para o teto", () => {
    const g = buildEscritorio({ extras: { luminaria: true } })
    const punho = caixaMundo(g, "Luminaria_Punho").getCenter(new Vector3())
    const boca = caixaMundo(g, "Luminaria_Luz").getCenter(new Vector3())
    expect(boca.z).toBeLessThan(punho.z)
    // e para a frente da mesa (y menor), onde a pessoa trabalha
    expect(boca.y).toBeLessThan(punho.y)
  })

  it("luminária: fica em cima do tampo, sem cúpula atravessando a mesa", () => {
    const g = buildEscritorio({ extras: { luminaria: true } })
    const tampo = caixaMundo(g, "Mesa_Tampo")
    expect(caixaMundo(g, "Luminaria_Base").min.z).toBeGreaterThanOrEqual(tampo.max.z - 1e-6)
    for (const n of pecas(g, "Luminaria_")) {
      const c = caixaMundo(g, n)
      expect(c.min.z).toBeGreaterThan(tampo.max.z - 1e-6)
      expect(c.min.x).toBeGreaterThan(tampo.min.x)
      expect(c.max.x).toBeLessThan(tampo.max.x)
      expect(c.max.y).toBeLessThan(tampo.max.y)
    }
  })

  it("luminária: a boca é a face acesa — o que emite fica na FRENTE da cúpula", () => {
    const g = buildEscritorio({ extras: { luminaria: true } })
    const mat = (malha(g, "Luminaria_Luz") as Mesh).material as unknown as { emissiveIntensity: number }
    expect(mat.emissiveIntensity).toBeGreaterThan(1)
    // Peças sólidas com tampa: o disco aceso precisa estar além da boca da
    // cúpula, senão fica escondido dentro dela e a luminária parece apagada.
    const eixo = caixaMundo(g, "Luminaria_Punho").getCenter(new Vector3())
    const dist = (n: string) => caixaMundo(g, n).getCenter(new Vector3()).distanceTo(eixo)
    expect(dist("Luminaria_Luz")).toBeGreaterThan(dist("Luminaria_Cupula"))
    expect(dist("Luminaria_Bulbo")).toBeGreaterThan(dist("Luminaria_Luz"))
  })

  it("luminária: não bate no monitor nem no setup ultrawide", () => {
    for (const setup of [undefined, "ultrawide"] as const) {
      const g = buildEscritorio({ extras: { luminaria: true, setup } })
      const tela = caixaMundo(g, setup === "ultrawide" ? "Monitor_Bezel" : "Monitor_Bezel")
      for (const n of pecas(g, "Luminaria_")) {
        expect(caixaMundo(g, n).intersectsBox(tela)).toBe(false)
      }
    }
  })

  it("tela: todo setup mostra código, não uma chapa lisa", () => {
    const casos: [EscritorioExtras["setup"], string][] = [
      [undefined, "Monitor_Codigo_"],
      ["ultrawide", "Monitor_Codigo_"],
      ["duplo", "Monitor_Codigo_L_"],
      ["notebook", "Monitor_Codigo_Note_"],
    ]
    for (const [setup, prefixo] of casos) {
      const g = buildEscritorio({ extras: { setup } })
      expect(pecas(g, prefixo).length).toBeGreaterThan(5)
    }
    // O setup duplo escreve nas DUAS telas
    const duplo = buildEscritorio({ extras: { setup: "duplo" } })
    expect(pecas(duplo, "Monitor_Codigo_R_").length).toBeGreaterThan(5)
  })

  it("tela: as linhas cabem dentro do vidro e ficam À FRENTE dele", () => {
    const g = buildEscritorio()
    const tela = caixaMundo(g, "Monitor_Tela")
    for (const n of pecas(g, "Monitor_Codigo_")) {
      const c = caixaMundo(g, n)
      expect(c.min.x).toBeGreaterThan(tela.min.x)
      expect(c.max.x).toBeLessThan(tela.max.x)
      expect(c.min.z).toBeGreaterThan(tela.min.z)
      expect(c.max.z).toBeLessThan(tela.max.z)
      // Frente do monitor = y menor (o lado de quem senta).
      expect(c.max.y).toBeLessThanOrEqual(tela.min.y + 1e-6)
    }
  })

  it("tela: a mesma sala desenha sempre o mesmo trecho — nada de piscar texto", () => {
    const posicoes = (g: Group) =>
      pecas(g, "Monitor_Codigo_").map((n) => caixaMundo(g, n).getCenter(new Vector3()).toArray().join(","))
    expect(posicoes(buildEscritorio())).toEqual(posicoes(buildEscritorio()))
  })

  it("tela: as linhas são escuras — a tela acende até 2,6 ao trabalhar", () => {
    const g = buildEscritorio()
    for (const n of pecas(g, "Monitor_Codigo_")) {
      const m = (malha(g, n) as Mesh).material as unknown as {
        color: { r: number; g: number; b: number }
        emissive: { getHex(): number }
      }
      expect(Math.max(m.color.r, m.color.g, m.color.b)).toBeLessThan(0.65)
      expect(m.emissive.getHex()).toBe(0) // não acendem: quem acende é a tela
    }
  })

  it("notebook: a tela fica acima do tampo e inclinada para trás", () => {
    const g = buildEscritorio({ extras: { setup: "notebook" } })
    const tampo = caixaMundo(g, "Mesa_Tampo")
    const tela = caixaMundo(g, "Monitor_Tela_Note")
    expect(tela.min.z).toBeGreaterThan(tampo.max.z)
    // Inclinada: mais alta atrás do que na frente (a dobradiça fica embaixo)
    expect(tela.max.z - tela.min.z).toBeGreaterThan(0.15)
  })
})

describe("céu da janela em degradê", () => {
  it("o céu tem cor POR VÉRTICE, não uma cor chapada", () => {
    const g = buildEscritorio({ extras: { janela: true } })
    const ceu = malha(g, "Janela_Ceu") as Mesh
    const cor = ceu.geometry.getAttribute("color")
    expect(cor).toBeTruthy()
    expect((ceu.material as unknown as { vertexColors: boolean }).vertexColors).toBe(true)
  })

  it("escurece para cima: topo e base têm cores diferentes", () => {
    const g = buildEscritorio({ extras: { janela: true }, fase: "day" })
    const ceu = malha(g, "Janela_Ceu") as Mesh
    const pos = ceu.geometry.getAttribute("position")
    const cor = ceu.geometry.getAttribute("color")
    let zMin = Infinity, zMax = -Infinity, iMin = 0, iMax = 0
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i)
      if (z < zMin) { zMin = z; iMin = i }
      if (z > zMax) { zMax = z; iMax = i }
    }
    const base = [cor.getX(iMin), cor.getY(iMin), cor.getZ(iMin)]
    const topo = [cor.getX(iMax), cor.getY(iMax), cor.getZ(iMax)]
    expect(topo).not.toEqual(base)
    // De dia o alto do céu é mais escuro que o horizonte
    const soma = (c: number[]) => c[0] + c[1] + c[2]
    expect(soma(topo)).toBeLessThan(soma(base))
  })

  it("as nuvens acompanham a hora: bem mais discretas à noite", () => {
    const opacidade = (fase: "day" | "night") => {
      const g = buildEscritorio({ extras: { janela: true }, fase })
      const nomes = pecas(g, "Janela_Nuvem_")
      expect(nomes.length).toBeGreaterThan(0) // nuvem à noite existe, só é sutil
      return ((malha(g, nomes[0]) as Mesh).material as unknown as { opacity: number }).opacity
    }
    expect(opacidade("night")).toBeLessThan(opacidade("day") / 2)
  })

  it("as nuvens são translúcidas e cabem no vão da janela", () => {
    const g = buildEscritorio({ extras: { janela: true }, fase: "day" })
    const vao = caixaMundo(g, "Janela_Vidro")
    for (const n of pecas(g, "Janela_Nuvem_")) {
      const mat = (malha(g, n) as Mesh).material as unknown as { transparent: boolean; opacity: number }
      expect(mat.transparent).toBe(true)
      expect(mat.opacity).toBeLessThan(1)
      expect(caixaMundo(g, n).max.z).toBeLessThanOrEqual(vao.max.z + 1e-6)
    }
  })
})

describe("céu: a cor vem do degradê, não do material", () => {
  it("o material do céu é branco — senão a cor entra duas vezes", () => {
    // vertexColors MULTIPLICA cor do vértice pela do material. Com pal.ceu nos
    // dois, o céu escurecia ao quadrado (foi o que aconteceu na primeira versão).
    const g = buildEscritorio({ extras: { janela: true }, fase: "day" })
    const mat = (malha(g, "Janela_Ceu") as Mesh).material as unknown as { color: { r: number; g: number; b: number } }
    expect(mat.color.r).toBe(1)
    expect(mat.color.g).toBe(1)
    expect(mat.color.b).toBe(1)
  })
})
