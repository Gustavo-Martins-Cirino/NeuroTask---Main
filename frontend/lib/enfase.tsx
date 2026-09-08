import { Fragment, type ReactNode } from "react"

// Negrito DENTRO de uma frase traduzida.
//
// O problema: "Você fez **X** em 3 dias" tem ênfase no meio. A saída óbvia é
// quebrar em pedaços no JSX — `<>Você fez <strong>{x}</strong> em {n} dias</>`
// — e ela é a que impede traduzir: os pedaços congelam a ordem das palavras do
// português, e em inglês a frase se monta ao contrário.
//
// Então a frase continua inteira, uma string por idioma, e a ênfase viaja
// dentro dela marcada por `§`. Cada tradutor escreve a frase na ordem que o
// idioma dele pede e põe o `§` onde faz sentido ali.
//
// Escolhi `§` por ser um caractere que ninguém digita por acaso num texto de
// interface — diferente de `*` ou `_`, que aparecem em nome de arquivo, atalho
// e emoticon.

const MARCA = "§"

/**
 * Divide a frase na marca e devolve os trechos ímpares em <strong>.
 *
 * Marca sobrando (número ímpar de `§`) não quebra nada: o último pedaço fica
 * sem ênfase e o texto aparece inteiro. Numa tela, texto certo sem negrito é
 * muito melhor que uma exceção.
 */
export function enfatizar(frase: string): ReactNode {
  const partes = frase.split(MARCA)
  if (partes.length === 1) return frase
  return partes.map((parte, i) =>
    i % 2 === 1 ? <strong key={i}>{parte}</strong> : <Fragment key={i}>{parte}</Fragment>
  )
}

/** O texto sem as marcas — para `title`, `aria-label` e afins. */
export function semMarcas(frase: string): string {
  return frase.split(MARCA).join("")
}
