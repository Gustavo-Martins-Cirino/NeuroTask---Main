// O aviso de "não consegui falar com o servidor".
//
// Achado na varredura de queda do banco (28/08): com o Supabase fora, as telas
// não quebram — mostram o ESTADO VAZIO. Quem abre o app durante uma queda lê
// "Nenhuma tarefa ainda" e conclui que perdeu o que tinha. Para alguém que
// acabou de confiar a rotina ao app, esse susto é pior que uma tela de erro
// honesta: leva a pessoa de volta ao calendário de onde ela veio.
//
// A decisão de MOSTRAR mora aqui, separada do componente, porque ela tem
// sutileza e a sutileza merece teste.

export const EVENTO_CONEXAO = "neurotask:conexao"

export interface PulsoDeConexao {
  ok: boolean
  /** Momento em ms — o componente não chama Date.now(), recebe. */
  quando: number
}

export interface EstadoConexao {
  /** Falhas seguidas, sem nenhum sucesso no meio. */
  falhasSeguidas: number
  /** Desde quando a primeira falha da sequência aconteceu. */
  desde: number | null
}

export const CONEXAO_INICIAL: EstadoConexao = { falhasSeguidas: 0, desde: null }

/**
 * Quantas falhas seguidas antes de avisar.
 *
 * Duas, e não uma: uma requisição isolada falha por motivo bobo o tempo todo
 * (aba dormindo, wi-fi trocando de antena, o Supabase reciclando conexão), e um
 * banner que pisca sozinho ensina a pessoa a ignorar banner.
 */
export const FALHAS_PARA_AVISAR = 2

export function aplicaPulso(estado: EstadoConexao, pulso: PulsoDeConexao): EstadoConexao {
  // Um sucesso zera tudo: se o servidor respondeu, ele está lá.
  if (pulso.ok) return CONEXAO_INICIAL
  return {
    falhasSeguidas: estado.falhasSeguidas + 1,
    desde: estado.desde ?? pulso.quando,
  }
}

export function deveAvisar(estado: EstadoConexao): boolean {
  return estado.falhasSeguidas >= FALHAS_PARA_AVISAR
}

/**
 * Se esta resposta conta como "o servidor está fora".
 *
 * 4xx NÃO conta. Um 401 é sessão vencida, um 403 é permissão, um 404 é linha
 * que não existe — todos são o servidor funcionando e dizendo não. Anunciar
 * "sem conexão" neles mandaria a pessoa reiniciar o roteador por causa de um
 * problema que está no app.
 */
export function respostaIndicaQueda(status: number): boolean {
  return status >= 500 || status === 0
}
