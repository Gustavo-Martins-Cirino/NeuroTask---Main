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
// Altura (14) e distância ao centro (~22,6) são as de sempre: só o azimute
// muda, para a inclinação isométrica continuar a mesma.

const D = (g: number) => (g * Math.PI) / 180

const RAIO = Math.sqrt(16 * 16 + 16 * 16)
const ALTURA = 14

/** O ângulo de partida, e para onde o duplo clique devolve a vista. */
export const AZIMUTE_PADRAO = D(15)

// ---- Até onde a vista pode girar ----
//
// A sala tem duas paredes: a do fundo (y = +S) e a lateral (x = −S). Elas só
// não atrapalham enquanto a câmera olha para as faces INTERNAS delas.
//
// A câmera fica em (R·cos θ, 14, R·sin θ), que no chão da sala é (R·cos θ,
// −R·sin θ). Com θ ≤ 0 ela passa para o lado +y e a parede do fundo entra na
// frente da sala; passando de ~95°, o x fica negativo e a lateral faz o mesmo.
// Os limites abaixo são esses dois muros, com folga — não gosto.
export const AZIMUTE_MIN = D(5)
export const AZIMUTE_MAX = D(85)

export function limitarAzimute(azimute: number): number {
  if (!Number.isFinite(azimute)) return AZIMUTE_PADRAO
  return Math.min(AZIMUTE_MAX, Math.max(AZIMUTE_MIN, azimute))
}

export function posicaoDaCamera(azimute: number = AZIMUTE_PADRAO): [number, number, number] {
  const a = limitarAzimute(azimute)
  return [RAIO * Math.cos(a), ALTURA, RAIO * Math.sin(a)]
}

export const CAMERA_POS: [number, number, number] = posicaoDaCamera()

/**
 * Quanto a vista gira por pixel arrastado. A volta inteira (80°) sai em uns
 * 500 px — mais sensível que isso e um tremor de mão já vira meia volta.
 */
export const RAD_POR_PIXEL = D(0.16)

/**
 * O azimute depois de arrastar `dx` pixels.
 *
 * Arrastar para a DIREITA leva a câmera para a esquerda da cena, que é o que
 * faz a sala parecer girar junto com a mão — como virar um objeto que se
 * segura. Invertido, o arrasto empurra a sala para o lado errado e a sensação
 * é de estar mexendo num controle, não no objeto.
 */
export function azimuteApos(azimute: number, dxPixels: number): number {
  if (!Number.isFinite(dxPixels)) return limitarAzimute(azimute)
  return limitarAzimute(azimute + dxPixels * RAD_POR_PIXEL)
}

/**
 * Fração do caminho até o alvo que se anda em `delta` segundos.
 *
 * Elevado ao número de meias-vidas que cabem no delta, e não multiplicado por
 * ele: assim a volta leva o mesmo TEMPO a 30, 60 ou 144 fps. É a mesma conta do
 * retorno das partículas da Neuro (lib/neuro-sphere) e pelo mesmo motivo.
 */
export function passoDoGiro(delta: number, meiaVida = 0.05): number {
  if (!Number.isFinite(delta) || delta <= 0) return 0
  const mv = Number.isFinite(meiaVida) && meiaVida > 0 ? meiaVida : 0.05
  return 1 - Math.pow(0.5, delta / mv)
}

/** Põe a câmera no azimute pedido, mirando no centro do conteúdo. */
export function apontarCamera(cam: OrthographicCamera, azimute: number, centro: Vector3) {
  cam.position.set(...posicaoDaCamera(azimute))
  cam.up.set(0, 1, 0)
  cam.lookAt(centro)
  cam.updateMatrixWorld(true)
  cam.matrixWorldInverse.copy(cam.matrixWorld).invert()
}

/** Meia largura e meia altura que o box ocupa na tela, do ponto de vista atual. */
function extensaoNaCamera(cam: OrthographicCamera, box: Box3): { halfW: number; halfH: number } {
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
  return { halfW: (max.x - min.x) / 2, halfH: (max.y - min.y) / 2 }
}

/** Quantas voltas amostrar ao medir o enquadramento. */
const AMOSTRAS = 17

/**
 * Enquadra a câmera ortográfica no conteúdo: mira no CENTRO do bounding box e
 * dimensiona o frustum pra caber tudo com uma folga, respeitando o aspect do
 * canvas. Assim a sala fica centralizada e cheia em qualquer nível — sem número
 * mágico de lookAt por nível.
 *
 * **O frustum é o maior de TODAS as voltas, não o da volta atual.** A vista gira
 * com o mouse, e refazer a conta a cada quadro faria a sala inchar e murchar
 * enquanto a pessoa arrasta — o oposto de "virar um objeto na mão", em que o
 * objeto muda de silhueta e não de tamanho. O preço é uma moldura um pouco mais
 * larga, e ele é pequeno de propósito: o que aperta o quadro aqui é a ALTURA da
 * sala, não a largura, e essa não muda com o giro.
 */
export function fitOrthoCamera(
  cam: OrthographicCamera,
  content: Object3D,
  aspect: number,
  pad = 1.06,
  azimute: number = AZIMUTE_PADRAO
) {
  const box = new Box3().setFromObject(content)
  if (box.isEmpty()) return

  const center = box.getCenter(new Vector3())

  let halfW = 0
  let halfH = 0
  for (let i = 0; i < AMOSTRAS; i++) {
    const a = AZIMUTE_MIN + (AZIMUTE_MAX - AZIMUTE_MIN) * (i / (AMOSTRAS - 1))
    apontarCamera(cam, a, center)
    const e = extensaoNaCamera(cam, box)
    halfW = Math.max(halfW, e.halfW * pad)
    halfH = Math.max(halfH, e.halfH * pad)
  }

  // Cobre o conteúdo nas duas dimensões dado o aspect do canvas.
  if (halfW / halfH < aspect) halfW = halfH * aspect
  else halfH = halfW / aspect

  cam.left = -halfW
  cam.right = halfW
  cam.top = halfH
  cam.bottom = -halfH
  cam.near = -100
  cam.far = 300
  // A câmera volta para a volta em que ela estava: a varredura acima é medição,
  // não movimento, e quem estiver arrastando não pode ver a sala saltar.
  apontarCamera(cam, azimute, center)
  cam.updateProjectionMatrix()
}

/** O centro do conteúdo — é para ele que a câmera mira a cada giro. */
export function centroDoConteudo(content: Object3D): Vector3 | null {
  const box = new Box3().setFromObject(content)
  return box.isEmpty() ? null : box.getCenter(new Vector3())
}
