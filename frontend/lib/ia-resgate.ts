// As chamadas de ferramenta escondidas no `failed_generation` do Groq — o texto
// que o modelo gerou quando o parser dele recusou o tool call. Formatos vistos:
// `<function=NOME>{...}</function>` e `<function=NOME({...})</function>`.
//
// Era uma regex só, com três `\s*` encostados e um `[\s\S]*?` no meio, e ela
// voltava atrás ao CUBO: `<function=a` seguido de 4.000 espaços levou 28 s numa
// busca (medido em 17/10). O texto é do modelo, e o modelo escreve o que o
// pedido manda — um pedido montado para isso prendia a função do servidor até
// o tempo limite. Aqui a leitura é linear: acha a abertura, acha o fechamento
// com `indexOf`, e o JSON é o que vai da primeira `{` à última `}` entre os dois.
// Quem decide se é JSON de verdade é o `JSON.parse`, depois.

const ABRE = /<function=([a-zA-Z_]+)/g
const FECHA = "</function>"

export interface ChamadaRecusada {
  nome: string
  json: string
}

export function chamadasRecusadas(texto: string): ChamadaRecusada[] {
  const achadas: ChamadaRecusada[] = []
  ABRE.lastIndex = 0
  let abertura: RegExpExecArray | null
  while ((abertura = ABRE.exec(texto)) !== null) {
    const inicio = ABRE.lastIndex
    const fim = texto.indexOf(FECHA, inicio)
    if (fim < 0) break
    // A próxima busca começa DEPOIS deste fechamento: uma abertura dentro do
    // miolo de outra chamada não vira uma chamada a mais.
    ABRE.lastIndex = fim + FECHA.length
    const miolo = texto.slice(inicio, fim)
    const a = miolo.indexOf("{")
    const b = miolo.lastIndexOf("}")
    if (a < 0 || b < a) continue
    achadas.push({ nome: abertura[1], json: miolo.slice(a, b + 1) })
  }
  return achadas
}
