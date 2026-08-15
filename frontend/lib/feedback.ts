// Envio de feedback — a parte que decide o que fazer quando o banco não está
// exatamente como o SQL deste repositório espera.
//
// Por que isso existe: feedback que não chega é o pior resultado possível da
// Fase 5. Se a tabela estiver com uma coluna a menos (SQL rodado numa versão
// anterior, execução pela metade), o insert inteiro falha e a pessoa perde o
// que escreveu — por causa de um METADADO, não da mensagem dela.

export interface ErroDoPostgrest {
  code?: string
  message?: string
}

/** Sem isto o feedback não serve para nada: nunca vale a pena reenviar sem. */
export const CAMPOS_ESSENCIAIS = ["message", "kind", "user_id"] as const

/** Quantas colunas ausentes vale a pena descascar antes de desistir. */
export const MAX_TENTATIVAS = 4

/**
 * Nome da coluna que o PostgREST diz não conhecer (PGRST204), ou null se o erro
 * for outro. A mensagem vem no formato:
 * "Could not find the 'commit' column of 'feedback' in the schema cache"
 */
export function colunaFaltante(err: ErroDoPostgrest | null | undefined): string | null {
  if (!err || err.code !== "PGRST204") return null
  const m = /Could not find the '([^']+)' column/.exec(err.message ?? "")
  return m ? m[1] : null
}

/**
 * O mesmo envio sem a coluna que o banco não tem. Devolve null quando não há o
 * que tentar de novo — coluna essencial, ou coluna que nem estava no envio
 * (aí o erro é outra coisa e insistir viraria laço infinito).
 */
export function envioSemColuna<T extends Record<string, unknown>>(
  envio: T,
  coluna: string
): Partial<T> | null {
  if ((CAMPOS_ESSENCIAIS as readonly string[]).includes(coluna)) return null
  if (!(coluna in envio)) return null
  const resto = { ...envio }
  delete resto[coluna]
  return resto
}

// O erro do Postgres vem pelo CÓDIGO, não pelo texto: a mensagem de violação de
// RLS cita o nome da tabela ("...for table \"feedback\""), então casar por
// substring fazia RLS e cache virarem "a tabela não existe" — e mandava rodar de
// novo um SQL que já estava rodado.
export function explicaErro(err: ErroDoPostgrest): string {
  switch (err.code) {
    case "42P01":
      return "A tabela de feedback ainda não existe. Rode supabase/feedback.sql no Supabase."
    case "PGRST205":
      return "A tabela existe, mas a API do Supabase ainda não a enxerga (cache do schema). Espere alguns segundos e tente de novo."
    case "PGRST204":
      return "A tabela de feedback está sem uma coluna que o app usa. Rode supabase/feedback.sql de novo — ele acrescenta o que falta sem apagar nada."
    case "42501":
      return "Sem permissão para gravar (RLS). Confira se você está logado e se a policy de insert do feedback.sql foi criada."
    default:
      return err.message ?? "Não deu para enviar agora. Tente de novo em instantes."
  }
}
