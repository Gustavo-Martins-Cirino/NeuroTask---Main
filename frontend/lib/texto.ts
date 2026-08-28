// Maiúscula de frase, que não é a mesma coisa que maiúscula de palavra.
//
// O `capitalize` do CSS sobe TODA palavra, e em português isso estraga data:
// `toLocaleDateString("pt-BR")` devolve "sexta-feira, 28 de agosto" e o CSS
// entrega "Sexta-Feira, 28 De Agosto" — com dois erros numa linha só, na
// primeira frase que uma conta nova lê no dashboard.
//
// Em inglês o mesmo CSS acerta ("Friday, August 28"), e é por isso que o hábito
// passa despercebido: a regra de lá é justamente subir toda palavra.

/** Sobe a primeira letra e não encosta no resto. */
export function maiusculaInicial(texto: string): string {
  if (!texto) return texto
  return texto[0].toUpperCase() + texto.slice(1)
}
