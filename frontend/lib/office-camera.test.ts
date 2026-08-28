import { describe, it, expect } from "vitest"
import { BoxGeometry, Mesh, MeshBasicMaterial, OrthographicCamera, Vector3 } from "three"
import {
  AZIMUTE_MAX, AZIMUTE_MIN, AZIMUTE_PADRAO, azimuteApos, fitOrthoCamera,
  limitarAzimute, passoDoGiro, posicaoDaCamera,
} from "./office-camera"

// O auto-fit é o que centraliza a sala e a faz preencher o quadro em qualquer
// nível. Se ele errar, a sala fica jogada num canto ou com chão sobrando — o
// bug que a gente estava consertando. Testa as duas garantias: centraliza e cabe.

function boxMesh(cx: number, cy: number, cz: number, w: number, h: number, d: number): Mesh {
  const m = new Mesh(new BoxGeometry(w, h, d), new MeshBasicMaterial())
  m.position.set(cx, cy, cz)
  m.updateMatrixWorld(true)
  return m
}

const camera = () => new OrthographicCamera(-1, 1, 1, -1, -100, 300)

describe("fitOrthoCamera", () => {
  it("centraliza: o centro do conteúdo projeta em (0,0) e respeita o aspect", () => {
    const cam = camera()
    fitOrthoCamera(cam, boxMesh(2, 3, -1, 8, 5, 6), 1.5, 1)

    expect(cam.right / cam.top).toBeCloseTo(1.5, 5)
    const center = new Vector3(2, 3, -1).project(cam)
    expect(center.x).toBeCloseTo(0, 5)
    expect(center.y).toBeCloseTo(0, 5)
  })

  it("cabe tudo: os 8 cantos ficam dentro de [-1,1] em NDC", () => {
    const cam = camera()
    fitOrthoCamera(cam, boxMesh(0, 4, 0, 12, 8, 10), 1.4118, 1.05)

    for (const sx of [-6, 6]) for (const sy of [0, 8]) for (const sz of [-5, 5]) {
      const p = new Vector3(sx, sy, sz).project(cam)
      expect(Math.abs(p.x)).toBeLessThanOrEqual(1.0001)
      expect(Math.abs(p.y)).toBeLessThanOrEqual(1.0001)
    }
  })

  it("cabe tudo em QUALQUER volta, com o mesmo frustum", () => {
    // É a razão de o fit varrer o intervalo em vez de medir só a volta atual:
    // com o frustum da volta de 15°, girar até 45° cortaria o canto da sala.
    const cam = camera()
    const conteudo = boxMesh(0, 4, 0, 12, 8, 10)
    fitOrthoCamera(cam, conteudo, 1.4118, 1.05)
    const frustum = { l: cam.left, r: cam.right, t: cam.top, b: cam.bottom }

    for (const graus of [5, 20, 45, 70, 85]) {
      fitOrthoCamera(cam, conteudo, 1.4118, 1.05, (graus * Math.PI) / 180)
      // O frustum não muda de volta para volta — só o ponto de vista.
      expect(cam.right).toBeCloseTo(frustum.r, 10)
      expect(cam.top).toBeCloseTo(frustum.t, 10)
      for (const sx of [-6, 6]) for (const sy of [0, 8]) for (const sz of [-5, 5]) {
        const p = new Vector3(sx, sy, sz).project(cam)
        expect(Math.abs(p.x)).toBeLessThanOrEqual(1.0001)
        expect(Math.abs(p.y)).toBeLessThanOrEqual(1.0001)
      }
    }
  })

  it("na sala de verdade quem aperta o quadro é a ALTURA, não a largura", () => {
    // É por isso que a moldura extra do giro sai barata. A largura projetada
    // cresce ~15% entre 15° e 45°; se ela mandasse, quem nunca arrasta pagaria
    // isso em tamanho de sala. Como o canvas é largo, sobra folga lateral e o
    // que decide é a altura — que o giro não muda.
    const cam = camera()
    const aspect = 480 / 340
    fitOrthoCamera(cam, boxMesh(0, 1.3, 0, 4, 2.6, 4), aspect, 1.06)
    expect(cam.right / cam.top).toBeCloseTo(aspect, 6)
    // A largura saiu do aspect (folga de sobra), e não do conteúdo.
    expect(cam.right).toBeGreaterThan(cam.top)
  })

  it("box vazio não quebra (câmera intacta)", () => {
    const cam = new OrthographicCamera(-2, 2, 2, -2, -100, 300)
    cam.position.set(16, 14, 16)
    fitOrthoCamera(cam, new Mesh(), 1.4)
    expect(cam.right).toBe(2) // não mexeu
  })
})

describe("girar a vista", () => {
  it("a câmera não sai do lado ABERTO da sala", () => {
    // Fora do intervalo uma parede entra na frente: com azimute ≤ 0 é a do
    // fundo, passando de ~95° é a lateral.
    expect(limitarAzimute(-1)).toBe(AZIMUTE_MIN)
    expect(limitarAzimute(Math.PI)).toBe(AZIMUTE_MAX)
    expect(limitarAzimute(Number.NaN)).toBe(AZIMUTE_PADRAO)
    for (const g of [-90, 0, 15, 45, 95, 200]) {
      const a = limitarAzimute((g * Math.PI) / 180)
      expect(a).toBeGreaterThanOrEqual(AZIMUTE_MIN)
      expect(a).toBeLessThanOrEqual(AZIMUTE_MAX)
    }
  })

  it("dentro do intervalo, a câmera fica no quadrante que enxerga as duas paredes por dentro", () => {
    for (const a of [AZIMUTE_MIN, AZIMUTE_PADRAO, AZIMUTE_MAX]) {
      const [x, , z] = posicaoDaCamera(a)
      expect(x).toBeGreaterThan(0) // não passou por trás da parede lateral
      expect(z).toBeGreaterThan(0) // nem por trás da do fundo
    }
  })

  it("a altura e a distância ao centro não mudam com o giro", () => {
    const raio = (a: number) => Math.hypot(posicaoDaCamera(a)[0], posicaoDaCamera(a)[2])
    expect(raio(AZIMUTE_MAX)).toBeCloseTo(raio(AZIMUTE_MIN), 9)
    expect(posicaoDaCamera(AZIMUTE_MAX)[1]).toBe(posicaoDaCamera(AZIMUTE_MIN)[1])
  })

  it("arrastar para a direita leva a câmera para a esquerda da cena", () => {
    const depois = azimuteApos(AZIMUTE_PADRAO, 100)
    expect(depois).toBeGreaterThan(AZIMUTE_PADRAO)
    expect(azimuteApos(AZIMUTE_PADRAO, -100)).toBeLessThan(AZIMUTE_PADRAO)
  })

  it("o arrasto para nos limites, sem dar a volta", () => {
    expect(azimuteApos(AZIMUTE_PADRAO, 100_000)).toBe(AZIMUTE_MAX)
    expect(azimuteApos(AZIMUTE_PADRAO, -100_000)).toBe(AZIMUTE_MIN)
    expect(azimuteApos(AZIMUTE_PADRAO, Number.NaN)).toBe(AZIMUTE_PADRAO)
  })

  it("a volta inteira sai num arrasto de tela, não de milímetros", () => {
    const px = (AZIMUTE_MAX - AZIMUTE_MIN) / (azimuteApos(AZIMUTE_MIN, 1) - AZIMUTE_MIN)
    expect(px).toBeGreaterThan(300)
    expect(px).toBeLessThan(900)
  })
})

describe("passoDoGiro", () => {
  it("meia-vida é meia-vida: metade do caminho no tempo dela", () => {
    expect(passoDoGiro(0.05, 0.05)).toBeCloseTo(0.5, 10)
  })

  it("o mesmo TEMPO leva ao mesmo lugar em qualquer taxa de quadros", () => {
    const restante = (delta: number, quadros: number) => Math.pow(1 - passoDoGiro(delta), quadros)
    expect(restante(1 / 30, 15)).toBeCloseTo(restante(1 / 60, 30), 10)
    expect(restante(1 / 144, 72)).toBeCloseTo(restante(1 / 60, 30), 10)
  })

  it("nunca ultrapassa o alvo nem anda para trás", () => {
    for (const d of [0, -1, NaN, Infinity]) expect(passoDoGiro(d)).toBe(0)
    for (const d of [1 / 240, 1 / 60, 0.5, 10]) {
      expect(passoDoGiro(d)).toBeGreaterThan(0)
      expect(passoDoGiro(d)).toBeLessThanOrEqual(1)
    }
  })
})
