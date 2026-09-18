import type { Idioma } from "@/lib/i18n"

// O idioma da Neuro IA: o que ela RESPONDE, e as palavras que o app fala com
// ela. Nada aqui aparece na tela — é tudo conversa entre o app e o modelo —,
// então nada disto mora no dicionário, que é para o que a pessoa lê.

/**
 * O trecho que entra no fim do system prompt.
 *
 * Escrito NO idioma de destino de propósito: instrução em português mandando
 * responder em inglês é um pedido que o modelo tem de traduzir antes de obedecer,
 * e ele obedece melhor quando o pedido já está na língua da resposta.
 *
 * A última frase é a que evita o estrago: o que a pessoa escreveu (título de
 * tarefa, texto de nota) é dado dela, não texto a traduzir. Sem isso, pedir "list
 * my tasks" devolvia "Buy bread" para quem tinha escrito "Comprar pão".
 */
export function instrucaoDeIdioma(idioma: Idioma): string {
  if (idioma === "en") {
    return [
      "LANGUAGE: the instructions above are written in Portuguese, but the person you are talking to reads English.",
      "Always answer in English (United States) — including the confirmation question, which becomes \"Can I confirm?\", and any wording you would otherwise copy from the Portuguese examples above.",
      "Never translate what the person wrote: task titles, note contents and block names stay exactly as they are.",
    ].join(" ")
  }
  return "IDIOMA: responda sempre em português do Brasil."
}

/**
 * As palavras que os botões Sim/Não da conversa por voz ENVIAM.
 *
 * Não confundir com o rótulo do botão, que é do dicionário: o rótulo é o que a
 * pessoa lê, isto é o que a IA recebe. Eles coincidem em cada idioma, e por
 * motivos diferentes.
 */
export const RESPOSTA_CURTA: Record<Idioma, { sim: string; nao: string }> = {
  pt: { sim: "sim", nao: "não" },
  en: { sim: "yes", nao: "no" },
}

/**
 * A IA está pedindo confirmação? É o que faz os botões Sim/Não aparecerem na
 * conversa por voz, onde não dá para digitar.
 *
 * Reconhece os dois idiomas SEMPRE, e não só o idioma da interface: o modelo às
 * vezes responde na língua da última mensagem em vez da que foi mandada, e um
 * botão que não aparece é pior que um botão a mais.
 */
const PEDIDO_DE_CONFIRMACAO =
  /(posso confirmar|confirmar\?|confirma\?|can i confirm|should i confirm|shall i confirm|confirm\?)/i

export function pedeConfirmacao(texto: string): boolean {
  return PEDIDO_DE_CONFIRMACAO.test(texto)
}

/**
 * O último recurso do laço de ferramentas: quando as iterações acabam, a rota
 * injeta ISTO como mensagem do usuário para arrancar um resumo do que foi feito.
 *
 * Precisa mudar de idioma junto, e não é firula: é uma mensagem de USUÁRIO no
 * histórico, e o modelo tende a responder na língua da última fala. Em português
 * ela puxaria de volta para o português a conversa que estava em inglês.
 */
export function pedidoDeResumo(idioma: Idioma): string {
  return idioma === "en"
    ? "Summarize for me, in one or two sentences, what you actually managed to do based on the tool results above. Do not call any more tools."
    : "Resuma para mim, em uma ou duas frases, o que você efetivamente conseguiu fazer com base nos resultados das ferramentas acima. Não chame mais ferramentas."
}
