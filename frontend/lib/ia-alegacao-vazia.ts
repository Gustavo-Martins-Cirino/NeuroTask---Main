// O par do recibo, do outro lado: o recibo prova o que a Neuro FEZ; isto apaga a
// afirmação de ter feito o que NÃO foi feito.
//
// **O bug que deu origem a isto** (relatório de teste): pedida para criar um
// bloco, a Neuro respondeu, na MESMA mensagem, "Posso criar…?" e "✅ bloco
// criado" — sem chamar a ferramenta. O calendário ficava vazio e quem lia achava
// que estava feito. O recibo não pega esse caso: não houve escrita, então não há
// linha nenhuma para contradizer a frase.
//
// A regra é estreita de propósito. O único gatilho é o marcador ✅ — que, neste
// app, é convenção do SERVIDOR (recibo e confirmações). Quando o modelo o escreve
// e NENHUMA escrita aconteceu no turno, é sempre uma alegação vazia. Palavra solta
// ("criei", "agendei") fica com o prompt: distinguir "criei" de "posso criar" por
// regex enche de falso positivo, e apagar frase do modelo por engano é pior que o
// bug.

/** Corta a alegação de execução (✅ …) quando nada foi escrito neste turno. */
export function semAlegacaoVazia(texto: string, houveEscrita: boolean): string {
  if (houveEscrita) return texto
  if (typeof texto !== "string" || !texto.includes("✅")) return texto

  // Do ✅ até o fim da linha: some a afirmação onde quer que ela esteja, inline
  // depois da pergunta ("Posso criar? ✅ bloco criado") ou em linha própria.
  const limpo = texto
    .split(/\r?\n/)
    .map((linha) => linha.replace(/✅.*$/u, "").replace(/[ \t]+$/u, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  // Se sobrou vazio, a mensagem era SÓ a alegação falsa. Devolver o original
  // (uma frase errada) é menos ruim que a tela em branco — e é caso de canto:
  // o normal é vir junto com a pergunta de confirmação, que sobrevive ao corte.
  return limpo || texto
}
