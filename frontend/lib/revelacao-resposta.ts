// A resposta da Neuro entrando escrita, no chat de texto.
//
// O provedor padrão (Groq) responde com ferramentas, e aí o texto chega num
// pedaço só: o leitor do `fetch` recebe tudo de uma vez e a bolha salta pronta
// no lugar onde estava o spinner. É a mesma ideia da conversa ao vivo
// (lib/transcricao-viva.ts) — a mensagem chega, não surge.
//
// A diferença que muda a conta: lá o texto já está todo em mãos e o relógio a
// seguir é o da voz; aqui ele PODE ir crescendo (quando o provedor transmite em
// pedaços), então a revelação persegue um alvo que se move.
//
// Por isso a velocidade não é constante entre respostas: com um CPS fixo, uma
// resposta de mil caracteres levaria quase meio minuto para terminar de
// aparecer. O que se fixa é a DURAÇÃO — toda resposta leva mais ou menos o mesmo
// tempo para entrar, e é o tamanho dela que decide o ritmo.

/** Piso da velocidade, em caracteres por segundo — resposta curta não fica lenta à toa. */
export const CPS_MINIMO = 40

/** Quanto tempo uma resposta leva para terminar de aparecer, em segundos. */
export const DURACAO_ALVO = 0.9

/** De quanto em quanto tempo a tela é redesenhada, em milissegundos. */
export const PASSO_MS = 50

/**
 * Velocidade em caracteres por segundo para uma resposta de `total` caracteres.
 *
 * Proporcional ao TOTAL, e não ao que falta: proporcional ao que falta daria uma
 * desaceleração — o começo voando e o fim se arrastando —, e texto que
 * desacelera é desconfortável de ler. Dentro de uma resposta o ritmo é constante,
 * como quem digita.
 */
export function velocidadeDaRevelacao(total: number): number {
  if (!Number.isFinite(total) || total <= 0) return CPS_MINIMO
  return Math.max(CPS_MINIMO, total / DURACAO_ALVO)
}

/**
 * Quantos caracteres estão revelados depois de `delta` segundos.
 *
 * Devolve número fracionário de propósito: arredondar a cada passo perderia o
 * resto e travaria a revelação quando a velocidade fosse menor que um caractere
 * por passo. Quem desenha é que corta em inteiro (e em palavra inteira).
 */
export function avancarRevelacao(revelado: number, disponivel: number, delta: number): number {
  // Alvo inválido não pode esconder a resposta: mostrar tudo é o fracasso seguro.
  if (!Number.isFinite(disponivel) || disponivel < 0) return Number.MAX_SAFE_INTEGER
  if (!Number.isFinite(revelado) || revelado < 0) return 0
  if (revelado >= disponivel) return disponivel
  if (!Number.isFinite(delta) || delta <= 0) return revelado
  return Math.min(disponivel, revelado + velocidadeDaRevelacao(disponivel) * delta)
}

/** Já apareceu tudo — não há mais o que revelar deste texto. */
export function revelacaoTerminou(revelado: number, disponivel: number): boolean {
  return !Number.isFinite(disponivel) || revelado >= disponivel
}
