// Os jeitos de entrar no app, e a memória de qual foi o último.
//
// Duas coisas moram aqui, as duas determinísticas:
//
// 1. QUAIS PROVEDORES APARECEM. Não é o código que decide, é a env
//    `NEXT_PUBLIC_OAUTH_PROVIDERS` — porque o botão só funciona depois de o
//    provedor ser habilitado no painel do Supabase, e isso é trabalho de fora
//    do repositório. Botão de "Entrar com Google" que dá erro é pior do que não
//    ter botão nenhum: na Fase 5, um tropeço na tela de entrada é o suficiente
//    para a pessoa não voltar. Env vazia = nada muda, que é o padrão seguro.
//
// 2. QUAL FOI O ÚLTIMO. Puro enfeite útil: marcar o método usado da última vez
//    poupa a pessoa de lembrar se criou a conta com Google ou com senha — que é
//    exatamente o momento em que se cria uma conta duplicada sem querer.

export const PROVEDORES = ["google", "github", "apple"] as const
export type Provedor = (typeof PROVEDORES)[number]

/** Entrar por senha também conta como método, e também é lembrado. */
export type Metodo = Provedor | "senha"

/**
 * Lê a env e devolve só o que reconhecemos, sem repetição e **sempre na mesma
 * ordem** — a de `PROVEDORES`. Deixar a ordem seguir o texto da env faria os
 * botões trocarem de lugar por causa de um espaço a mais, e posição de botão de
 * login é memória muscular.
 */
export function provedoresHabilitados(bruto: string | null | undefined): Provedor[] {
  if (typeof bruto !== "string") return []
  const pedidos = new Set(
    bruto
      .split(",")
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean)
  )
  return PROVEDORES.filter((p) => pedidos.has(p))
}

export const CHAVE_ULTIMO_METODO = "neurotask-ultimo-metodo"

/** O mínimo de localStorage que isto usa — para o teste poder passar um falso. */
export interface DepositoSimples {
  getItem(chave: string): string | null
  setItem(chave: string, valor: string): void
}

function depositoPadrao(): DepositoSimples | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage
  } catch {
    // Safari em janela privada chega a ESTOURAR ao tocar em localStorage.
    return null
  }
}

export function lembrarMetodo(metodo: Metodo, deposito = depositoPadrao()) {
  try {
    deposito?.setItem(CHAVE_ULTIMO_METODO, metodo)
  } catch {
    // Sem espaço ou sem permissão: perder a memória do último método não pode
    // impedir ninguém de entrar.
  }
}

/**
 * O último método, ou null. Valor que não reconhecemos vira null de propósito:
 * um selo "Last Used" apontando para um botão que não existe mais (provedor
 * desligado, versão antiga) confunde mais do que ajuda.
 */
export function metodoLembrado(deposito = depositoPadrao()): Metodo | null {
  let bruto: string | null = null
  try {
    bruto = deposito?.getItem(CHAVE_ULTIMO_METODO) ?? null
  } catch {
    return null
  }
  if (bruto === "senha") return "senha"
  return (PROVEDORES as readonly string[]).includes(bruto ?? "") ? (bruto as Provedor) : null
}

export const ROTULO_PROVEDOR: Record<Provedor, string> = {
  google: "Google",
  github: "GitHub",
  apple: "Apple",
}
