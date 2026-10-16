// A regra de senha do app — a MESMA configurada no Supabase (Authentication →
// Sign In / Providers → Email: mínimo 8, "Letters and digits").
//
// Quem manda é o Supabase: senha fora da regra volta como `weak_password`.
// Conferir aqui antes não é segurança, é a tela dizer EXATAMENTE o que falta
// — "precisa de um número" — em vez de um "senha fraca" genérico depois da
// ida ao servidor. Mudou a regra no painel, muda aqui também.

export const MIN_SENHA = 8

/** Os requisitos, na ordem em que a tela os lista. */
export const REQUISITOS_SENHA = ["tamanho", "letra", "numero"] as const
export type RequisitoSenha = (typeof REQUISITOS_SENHA)[number]

export type FaltaNaSenha = "curta" | "semLetra" | "semNumero"

/**
 * Cada requisito, cumprido ou não — o que o cadeado e a lista mostram enquanto
 * a pessoa digita. É a mesma conta do `faltaNaSenha`, que barra o envio: a
 * lista nunca diz "pronto" para uma senha que o botão recusaria.
 */
export function requisitosDaSenha(senha: string): Record<RequisitoSenha, boolean> {
  return {
    tamanho: senha.length >= MIN_SENHA,
    // A/Z do alfabeto latino sem acento: é o que o Supabase conta como letra.
    letra: /[a-zA-Z]/.test(senha),
    numero: /[0-9]/.test(senha),
  }
}

/** O que falta para a senha passar, ou `null` quando passa. */
export function faltaNaSenha(senha: string): FaltaNaSenha | null {
  const requisitos = requisitosDaSenha(senha)
  if (!requisitos.tamanho) return "curta"
  if (!requisitos.letra) return "semLetra"
  if (!requisitos.numero) return "semNumero"
  return null
}
