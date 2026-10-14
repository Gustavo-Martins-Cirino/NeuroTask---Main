// A regra de senha do app — a MESMA configurada no Supabase (Authentication →
// Sign In / Providers → Email: mínimo 8, "Letters and digits").
//
// Quem manda é o Supabase: senha fora da regra volta como `weak_password`.
// Conferir aqui antes não é segurança, é a tela dizer EXATAMENTE o que falta
// — "precisa de um número" — em vez de um "senha fraca" genérico depois da
// ida ao servidor. Mudou a regra no painel, muda aqui também.

export const MIN_SENHA = 8

export type FaltaNaSenha = "curta" | "semLetra" | "semNumero"

/** O que falta para a senha passar, ou `null` quando passa. */
export function faltaNaSenha(senha: string): FaltaNaSenha | null {
  if (senha.length < MIN_SENHA) return "curta"
  // A/Z do alfabeto latino sem acento: é o que o Supabase conta como letra.
  if (!/[a-zA-Z]/.test(senha)) return "semLetra"
  if (!/[0-9]/.test(senha)) return "semNumero"
  return null
}
