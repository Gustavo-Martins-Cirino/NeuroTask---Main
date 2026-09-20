import { Fragment, type ReactNode } from "react"

// O `**negrito**` que a Neuro escreve, virando negrito de verdade.
//
// **O bug** (relatório de 19-20/09/2026): "negrito não renderiza: aparece
// `**[TESTE] T01 Academia**` com asteriscos". O modelo escreve markdown porque
// é o que todo modelo faz, e a bolha do chat mostrava `m.content` cru.
//
// O curioso é que o app já TRATAVA `**` como marcação: `fecharMarcacao`, na
// transcrição ao vivo, existe para tirar o par partido no meio da revelação —
// o comentário de lá fala em "negrito partido ao meio". Faltava só o outro
// lado, o que pinta.
//
// Isto é primo de `lib/enfase.tsx`, e a diferença importa: lá a marca é `§`,
// escolhida porque ninguém a digita por acaso, e o texto vem do dicionário —
// escrito por mim. Aqui o texto vem do MODELO, então a marca é a que ele usa.
//
// Não é um renderizador de markdown, e não deve virar um: títulos, listas,
// links e tabelas ficam como estão. Negrito é o que ela usa para destacar o
// nome do bloco, e é o que resolve a queixa.

const MARCA = "**"

/**
 * Divide o texto nos `**` e devolve os trechos ímpares em <strong>.
 *
 * Marca sobrando (número ímpar) não quebra nada: o último pedaço fica sem
 * negrito e o texto aparece inteiro, com os asteriscos daquele pedaço já
 * removidos. Texto certo sem negrito é melhor que uma exceção na tela.
 *
 * Monta nós do React, e nunca HTML por string: o conteúdo vem de um modelo, e
 * modelo repete o que a pessoa escreveu. `dangerouslySetInnerHTML` aqui seria
 * um caminho de injeção com o carimbo da casa.
 */
export function comNegrito(texto: string): ReactNode {
  if (!texto.includes(MARCA)) return texto
  const partes = texto.split(MARCA)
  // Número ÍMPAR de marcas deixa o último pedaço sem par — e um pedaço sem par
  // não é negrito, é um asterisco que sobrou. Sem esta linha, uma resposta
  // cortada no meio ("Criei **Academia") sairia com o resto todo em negrito.
  const semPar = partes.length % 2 === 0 ? partes.length - 1 : -1
  return partes.map((parte, i) =>
    // Pedaço vazio não vira `<strong></strong>`: "****" é ruído, não ênfase.
    i % 2 === 1 && i !== semPar && parte !== "" ? (
      <strong key={i}>{parte}</strong>
    ) : (
      <Fragment key={i}>{parte}</Fragment>
    )
  )
}

/** O texto sem as marcas — para `title`, `aria-label` e o que mais for string. */
export function semNegrito(texto: string): string {
  return texto.split(MARCA).join("")
}
