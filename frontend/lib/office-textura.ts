// Padrões de parede desenhados em pixels, não em malhas.
//
// Tijolinho em caixinhas custaria umas 380 malhas POR PAREDE — a fiada tem 16
// tijolos e cabem 24 fiadas. Como pixel, o mesmo desenho é uma textura só, que
// o three repete pela parede inteira em um draw call.
//
// Aqui não há canvas: os testes rodam em `node` (ver vitest.config), onde
// `document` não existe. O que sai daqui é o array de bytes RGBA cru, que vira
// `DataTexture` do lado do three — e, sendo array, dá para conferir pixel a
// pixel no teste em vez de no olho.

export interface Padrao {
  largura: number
  altura: number
  /** RGBA, 4 bytes por pixel, linha 0 embaixo (é como o three lê a textura).
   *  Tipado sobre `ArrayBuffer` concreto: o `DataTexture` do three não aceita o
   *  `ArrayBufferLike` genérico que o `new Uint8Array(n)` infere. */
  dados: Uint8Array<ArrayBuffer>
}

export type Cor = [number, number, number]

function pintar(p: Padrao, x: number, y: number, [r, g, b]: Cor): void {
  const i = (y * p.largura + x) * 4
  p.dados[i] = Math.round(Math.max(0, Math.min(1, r)) * 255)
  p.dados[i + 1] = Math.round(Math.max(0, Math.min(1, g)) * 255)
  p.dados[i + 2] = Math.round(Math.max(0, Math.min(1, b)) * 255)
  p.dados[i + 3] = 255
}

export function ler(p: Padrao, x: number, y: number): Cor {
  const i = (y * p.largura + x) * 4
  return [p.dados[i] / 255, p.dados[i + 1] / 255, p.dados[i + 2] / 255]
}

function vazio(largura: number, altura: number): Padrao {
  return { largura, altura, dados: new Uint8Array(new ArrayBuffer(largura * altura * 4)) }
}

/** Ruído determinístico em [0,1) a partir de dois inteiros. Mesma entrada,
 *  mesma saída sempre — textura que muda a cada carregamento não é textura. */
function baralho(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function clarear([r, g, b]: Cor, d: number): Cor {
  return [r + d, g + d, b + d]
}

/** Tamanho do azulejo do tijolo: DUAS fiadas e DOIS tijolos. Menos que isso não
 *  fecha a volta — a fiada de cima anda meio tijolo, então só a cada duas o
 *  desenho se repete. */
export const TIJOLO_TILE = { largura: 128, altura: 64, junta: 5 }

export function texturaTijolo(cor: Cor, argamassa: Cor): Padrao {
  const { largura, altura, junta } = TIJOLO_TILE
  const p = vazio(largura, altura)
  const fiada = altura / 2
  const tijolo = largura / 2
  for (let y = 0; y < altura; y++) {
    const linha = Math.floor(y / fiada)
    const dentroDaFiada = y % fiada
    // Meia peça de deslocamento na fiada de cima: sem isso as juntas verticais
    // formam uma coluna contínua e o desenho vira grade, não parede.
    const desloca = linha === 1 ? tijolo / 2 : 0
    for (let x = 0; x < largura; x++) {
      const emJuntaH = dentroDaFiada < junta
      const emJuntaV = (((x + desloca) % tijolo) + tijolo) % tijolo < junta
      if (emJuntaH || emJuntaV) {
        pintar(p, x, y, argamassa)
        continue
      }
      // Tijolo nenhum tem a cor do vizinho. A variação é por PEÇA, não por
      // pixel: por pixel viraria chuvisco.
      const peca = Math.floor((x + desloca) / tijolo) + linha * 31
      pintar(p, x, y, clarear(cor, (baralho(peca, linha) - 0.5) * 0.09))
    }
  }
  return p
}

/** Ripado: só muda ao longo de x, então duas linhas bastam. */
export const RIPADO_TILE = { largura: 32, altura: 4, fresta: 7 }

export function texturaRipado(cor: Cor, fundo: Cor): Padrao {
  const { largura, altura, fresta } = RIPADO_TILE
  const p = vazio(largura, altura)
  for (let x = 0; x < largura; x++) {
    let c: Cor
    if (x < fresta) c = fundo
    // A régua não é chapada: clareia no meio e escurece na quina, que é o que
    // dá volume de madeira sem relevo nenhum.
    else {
      const t = (x - fresta) / (largura - fresta)
      c = clarear(cor, (0.5 - Math.abs(t - 0.5)) * 0.12 - 0.03)
    }
    for (let y = 0; y < altura; y++) pintar(p, x, y, c)
  }
  return p
}

export const CIMENTO_TILE = { lado: 128, celula: 16 }

/**
 * Cimento queimado: manchas largas e suaves, sem forma nenhuma.
 *
 * O azulejo é aplicado UMA vez na parede inteira (sem repetição), então ele
 * precisa fechar a volta consigo mesmo — a grade do ruído usa o resto da
 * divisão, e por isso a borda direita continua na esquerda sem emenda.
 */
export function texturaCimento(cor: Cor, amplitude = 0.05): Padrao {
  const { lado, celula } = CIMENTO_TILE
  const p = vazio(lado, lado)
  const n = lado / celula
  const nos = (i: number, j: number) => baralho(((i % n) + n) % n, ((j % n) + n) % n)
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const fx = x / celula, fy = y / celula
      const i = Math.floor(fx), j = Math.floor(fy)
      const tx = fx - i, ty = fy - j
      // Suavização em S: com interpolação reta a grade do ruído aparece como
      // losangos, e aí lê como pano, não como parede.
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty)
      const a = nos(i, j) + (nos(i + 1, j) - nos(i, j)) * sx
      const b = nos(i, j + 1) + (nos(i + 1, j + 1) - nos(i, j + 1)) * sx
      pintar(p, x, y, clarear(cor, (a + (b - a) * sy - 0.5) * amplitude))
    }
  }
  return p
}
