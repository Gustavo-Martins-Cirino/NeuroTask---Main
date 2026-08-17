// As contas da foto de perfil: o recorte, o que se aceita e onde o arquivo mora.
// Puro de propósito — o envio em si (canvas, Storage, user_metadata) fica em
// lib/avatar.ts, junto do resto do I/O do retrato. Mesma divisão de
// lib/time-format.ts e hooks/use-time-format.

/** Lado do quadrado guardado. O maior lugar em que a foto aparece é o círculo
 *  de 40px do header; 256 cobre telas retina com folga e ainda cabe em ~30 KB. */
export const LADO_FOTO = 256

export const QUALIDADE_JPEG = 0.85

/** Antes do recorte. Depois do recorte a foto tem sempre ~30 KB, mas quem
 *  escolhe um arquivo de 40 MB merece o "não" antes de esperar a leitura. */
export const TAMANHO_MAXIMO_BYTES = 12 * 1024 * 1024

export interface Recorte {
  /** Canto do quadrado dentro da imagem original. */
  sx: number
  sy: number
  /** Lado do quadrado recortado, em pixels da imagem original. */
  lado: number
}

// Recorte central: o quadrado maior que cabe na imagem, no meio dela.
//
// É o palpite certo porque foto de perfil é foto de gente, e gente costuma
// ficar no meio do quadro. Cortar pelo canto colocaria o rosto para fora em
// qualquer foto na vertical — que é como um celular fotografa por padrão.
export function recorteQuadrado(largura: number, altura: number): Recorte {
  const lado = Math.min(largura, altura)
  return {
    sx: Math.round((largura - lado) / 2),
    sy: Math.round((altura - lado) / 2),
    lado,
  }
}

/** O que o arquivo escolhido tem de errado, em português, ou `null` se está bom. */
export function erroDoArquivo(arquivo: { type: string; size: number }): string | null {
  if (!arquivo.type.startsWith("image/")) return "Escolha um arquivo de imagem."
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return `A imagem passa de ${Math.round(TAMANHO_MAXIMO_BYTES / 1024 / 1024)} MB.`
  }
  return null
}

/** Sempre o mesmo caminho por pessoa: trocar a foto sobrescreve a anterior em
 *  vez de deixar lixo acumulado no bucket. A primeira pasta é o dono, e é ela
 *  que as políticas de `foto_perfil.sql` conferem. */
export function caminhoDaFoto(userId: string): string {
  return `${userId}/perfil.jpg`
}

// A URL pública é sempre a mesma, então o navegador serviria a foto ANTIGA do
// cache depois de uma troca — o upload funcionaria e pareceria não ter
// funcionado. O carimbo muda a URL sem mudar o arquivo.
export function urlComCarimbo(url: string, carimbo: number): string {
  return `${url}${url.includes("?") ? "&" : "?"}v=${carimbo}`
}
