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
    for (const n of pecas(g, "Janela_Predio_")) {
      const b = caixaMundo(g, n)
      expect(b.min.x).toBeGreaterThanOrEqual(vao.min.x - 1e-6)
      expect(b.max.x).toBeLessThanOrEqual(vao.max.x + 1e-6)
      expect(b.max.z).toBeLessThanOrEqual(vao.max.z + 1e-6)
    }
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
// A cabeça é uma esfera de raio 0.14 centrada em (0, 0.9, 1.26) — é dela que
// saem todas as medidas abaixo.

const CABECA = new Vector3(0, 0.9, 1.26)
const R_CABECA = 0.14

function boneco(acess: Parameters<typeof buildPersonagem>[1]) {
  const p = buildPersonagem(undefined, acess)
  p.updateMatrixWorld(true)
  return p
}

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

describe("óculos", () => {
  for (const tipo of ["grau", "escuros"] as const) {
    it(`${tipo}: a lente fica À FRENTE do rosto, não embutida nele`, () => {
      const p = boneco({ oculos: tipo })
      const lente = new Box3().setFromObject(malha(p, "Oculos_Lente_Direita"))
      const z = lente.getCenter(new Vector3()).z
      // Raio da seção da cabeça naquela altura: o que a lente precisa passar.
      const raioNaAltura = Math.sqrt(Math.max(0, R_CABECA ** 2 - (z - CABECA.z) ** 2))
      expect(lente.min.y).toBeGreaterThan(CABECA.y + raioNaAltura - 0.005)
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
    const g = buildEscritorio({ extras: { papelParede: true } })
    expect(pecas(g, "Papel_Listra_Fundo_").length).toBeGreaterThan(5)
    expect(pecas(g, "Papel_Listra_Lateral_").length).toBeGreaterThan(5)
  })

  it("sem o item comprado, nenhuma listra aparece", () => {
    expect(pecas(buildEscritorio(), "Papel_Listra_").length).toBe(0)
  })

  it("as listras ficam à frente da parede, não afundadas nela", () => {
    const g = buildEscritorio({ extras: { papelParede: true } })
    for (const n of pecas(g, "Papel_Listra_Fundo_")) {
      expect(caixaMundo(g, n).max.y).toBeLessThanOrEqual(FACE_FUNDO + 1e-6)
    }
    for (const n of pecas(g, "Papel_Listra_Lateral_")) {
      expect(caixaMundo(g, n).min.x).toBeGreaterThanOrEqual(FACE_LATERAL - 1e-6)
    }
  })

  it("as listras cobrem a largura da sala, sem transbordar", () => {
    const g = buildEscritorio({ extras: { papelParede: true } })
    for (const n of pecas(g, "Papel_Listra_Fundo_")) {
      const b = caixaMundo(g, n)
      expect(b.min.x).toBeGreaterThanOrEqual(-2.01)
      expect(b.max.x).toBeLessThanOrEqual(2.01)
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

  it("notebook: troca o desktop inteiro — sem torre e sem suporte de monitor", () => {
    const g = buildEscritorio({ extras: { setup: "notebook" } })
    expect(pecas(g, "PC_Torre").length).toBe(0)
    expect(pecas(g, "Monitor_Suporte").length).toBe(0)
    expect(pecas(g, "Notebook_").length).toBeGreaterThan(2)
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
