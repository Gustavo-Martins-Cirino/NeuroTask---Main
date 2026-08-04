import { describe, it, expect } from "vitest"
import { BoxGeometry, Mesh, MeshBasicMaterial, OrthographicCamera, Vector3 } from "three"
import { fitOrthoCamera } from "./office-camera"

// O auto-fit é o que centraliza a sala e a faz preencher o quadro em qualquer
// nível. Se ele errar, a sala fica jogada num canto ou com chão sobrando — o
// bug que a gente estava consertando. Testa as duas garantias: centraliza e cabe.

function boxMesh(cx: number, cy: number, cz: number, w: number, h: number, d: number): Mesh {
  const m = new Mesh(new BoxGeometry(w, h, d), new MeshBasicMaterial())
  m.position.set(cx, cy, cz)
  m.updateMatrixWorld(true)
  return m
}

describe("fitOrthoCamera", () => {
  it("centraliza: o centro do conteúdo projeta em (0,0) e respeita o aspect", () => {
    const cam = new OrthographicCamera(-1, 1, 1, -1, -100, 300)
    cam.position.set(16, 14, 16)
    fitOrthoCamera(cam, boxMesh(2, 3, -1, 8, 5, 6), 1.5, 1)

    expect(cam.right / cam.top).toBeCloseTo(1.5, 5)
    const center = new Vector3(2, 3, -1).project(cam)
    expect(center.x).toBeCloseTo(0, 5)
    expect(center.y).toBeCloseTo(0, 5)
  })

  it("cabe tudo: os 8 cantos ficam dentro de [-1,1] em NDC", () => {
    const cam = new OrthographicCamera(-1, 1, 1, -1, -100, 300)
    cam.position.set(16, 14, 16)
    fitOrthoCamera(cam, boxMesh(0, 4, 0, 12, 8, 10), 1.4118, 1.05)

    for (const sx of [-6, 6]) for (const sy of [0, 8]) for (const sz of [-5, 5]) {
      const p = new Vector3(sx, sy, sz).project(cam)
      expect(Math.abs(p.x)).toBeLessThanOrEqual(1.0001)
      expect(Math.abs(p.y)).toBeLessThanOrEqual(1.0001)
    }
  })

  it("box vazio não quebra (câmera intacta)", () => {
    const cam = new OrthographicCamera(-2, 2, 2, -2, -100, 300)
    cam.position.set(16, 14, 16)
    fitOrthoCamera(cam, new Mesh(), 1.4)
    expect(cam.right).toBe(2) // não mexeu
  })
})
