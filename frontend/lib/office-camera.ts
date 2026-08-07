import { Box3, Vector3, type Object3D, type OrthographicCamera } from "three"

// Posição da câmera isométrica. O ângulo NÃO é decorativo: a pessoa senta de
// frente para a mesa, que encosta na parede do fundo, então de onde a câmera
// olha depende se aparece o rosto dela ou a nuca.
//
// Antes ficava em [16, 14, 16] — azimute de 45°, a diagonal do canto. Dali o
// rosto ficava a 137° da câmera: óculos, olhos e boca nunca apareciam, e do
// boné só a copa (a aba apontava para trás). Girando o azimute para ~15°, a
// câmera desce pela lateral e passa a pegar a pessoa quase de perfil (~112°),
// sem sair do lado ABERTO da sala.
//
// O limite é rígido e vale saber: para ver o rosto de FRENTE a câmera teria de
// ir para trás da parede do fundo, que então taparia a sala. Perfil é o melhor
// que esta planta permite — só uma parede a menos mudaria isso.
//
// Altura (14) e distância ao centro (~22,6) são as de sempre: só o azimute
// mudou, para a inclinação isométrica continuar a mesma.
const AZIMUTE = (15 * Math.PI) / 180
const RAIO = Math.sqrt(16 * 16 + 16 * 16)

export const CAMERA_POS: [number, number, number] = [
  RAIO * Math.cos(AZIMUTE),
  14,
  RAIO * Math.sin(AZIMUTE),
]

// Enquadra a câmera ortográfica no conteúdo: mira no CENTRO do bounding box e
// dimensiona o frustum pra caber tudo com uma folga, respeitando o aspect do
// canvas. Assim a sala fica centralizada e cheia em qualquer nível — sem número
// mágico de lookAt por nível (era o que deixava chão sobrando embaixo e a sala
// jogada pra cima). A câmera precisa já estar posicionada (o ângulo isométrico
// vem da posição fixa); daqui só saem orientação e frustum.
export function fitOrthoCamera(cam: OrthographicCamera, content: Object3D, aspect: number, pad = 1.06) {
  const box = new Box3().setFromObject(content)
  if (box.isEmpty()) return

  const center = box.getCenter(new Vector3())
  cam.up.set(0, 1, 0)
  cam.lookAt(center)
  cam.updateMatrixWorld(true)
  cam.matrixWorldInverse.copy(cam.matrixWorld).invert()

  // Projeta os 8 cantos do box no espaço da câmera pra achar a extensão real.
  const view = cam.matrixWorldInverse
  const min = new Vector3(Infinity, Infinity, Infinity)
  const max = new Vector3(-Infinity, -Infinity, -Infinity)
  const c = new Vector3()
  for (let i = 0; i < 8; i++) {
    c.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z)
    c.applyMatrix4(view)
    min.min(c)
    max.max(c)
  }

  let halfW = ((max.x - min.x) / 2) * pad
  let halfH = ((max.y - min.y) / 2) * pad
  // Cobre o conteúdo nas duas dimensões dado o aspect do canvas.
  if (halfW / halfH < aspect) halfW = halfH * aspect
  else halfH = halfW / aspect

  cam.left = -halfW
  cam.right = halfW
  cam.top = halfH
  cam.bottom = -halfH
  cam.near = -100
  cam.far = 300
  cam.updateProjectionMatrix()
}
