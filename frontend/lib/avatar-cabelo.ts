// O contorno do cabelo cacheado do bonequinho.
//
// **O que ele substitui**: sete círculos chapados espalhados por cima da cabeça.
// De perto dava para ver a intenção; no tamanho em que o boneco é desenhado na
// cena, sete discos da mesma cor viram uma mancha com caroços — e onde dois se
// encostavam aparecia um vinco que não é de cacho nenhum.
//
// O que faz cabelo cacheado ler como cabelo é a BORDA ondulada, não bolinhas
// soltas. Aqui a cabeça vira um contorno único cujo raio sobe e desce: um
// desenho fechado, sem emenda interna e sem sobreposição.

/** Uma volta completa. */
const TAU = Math.PI * 2

/**
 * Raio do arquinho de cada cacho, a partir da corda e da altura da saliência.
 *
 * É geometria de arco circular: com a corda `c` e a flecha `h`, o raio é
 * (c²/4 + h²) / 2h. Chutar esse raio é o que faz o cacho ou achatar (arco quase
 * reto) ou estourar em bico — e nenhum dos dois lê como cacho.
 */
export function raioDoCacho(corda: number, saliencia: number): number {
  const c = Math.abs(corda)
  const h = Math.abs(saliencia)
  if (!Number.isFinite(c) || !Number.isFinite(h) || h <= 0) return c / 2 || 1
  return (c * c) / 4 / (2 * h) + h / 2
}

/** O quanto o contorno se afasta do crânio no alto de cada cacho. */
export function picoDoCacho(raio: number, cachos: number, saliencia: number): number {
  return raio * Math.cos(Math.PI / cachos) + saliencia
}

/**
 * O contorno fechado do cabelo cacheado.
 *
 * `cachos` pontos igualmente espaçados na circunferência do crânio, ligados por
 * arquinhos que estufam para fora. Ímpar de propósito no uso: com número par a
 * onda fica simétrica em relação ao eixo vertical e o cabelo ganha um ar de
 * engrenagem.
 */
export function caminhoDeCachos(
  cx: number,
  cy: number,
  raio: number,
  cachos = 9,
  saliencia = 2.4
): string {
  const n = Math.max(3, Math.floor(cachos))
  const r = Number.isFinite(raio) && raio > 0 ? raio : 1
  const h = Number.isFinite(saliencia) && saliencia > 0 ? saliencia : 1
  const corda = 2 * r * Math.sin(Math.PI / n)
  const rb = raioDoCacho(corda, h)
  const arred = (v: number) => Math.round(v * 100) / 100
  const ponto = (i: number): [number, number] => {
    // Começa no topo (−90°) para o desenho não depender de onde o zero cai.
    const a = -Math.PI / 2 + (TAU * i) / n
    return [arred(cx + Math.cos(a) * r), arred(cy + Math.sin(a) * r)]
  }

  const [x0, y0] = ponto(0)
  const partes = [`M ${x0} ${y0}`]
  for (let i = 1; i <= n; i++) {
    const [x, y] = ponto(i % n)
    // sweep-flag 1: o arco estufa para FORA. Com 0 ele afunda, e o cabelo fica
    // com mordidas em vez de cachos.
    partes.push(`A ${arred(rb)} ${arred(rb)} 0 0 1 ${x} ${y}`)
  }
  partes.push("Z")
  return partes.join(" ")
}
