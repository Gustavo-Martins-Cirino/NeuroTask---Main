import DOMPurify from "dompurify"

// O HTML que o editor de notas aceita carregar.
//
// O editor punha o conteúdo salvo direto no `innerHTML`, e esse conteúdo não
// vem só do teclado de quem usa: a Neuro grava notas com o texto que o MODELO
// escreveu (`create_note`/`update_note`). Um `<img src=x onerror=…>` ali roda
// JavaScript no site, com a sessão de quem abriu a nota. A limpeza é no
// carregamento porque é o único lugar que transforma a nota em HTML vivo — a
// lista de notas tira as tags por regex e o React mostra texto.
//
// É o DOMPurify, e não um filtro escrito aqui: os truques conhecidos (SVG,
// `noscript`, HTML malformado que o parser "conserta" para algo perigoso) são
// exatamente o que um filtro caseiro esquece. A lista abaixo é o que o editor
// produz — negrito, listas, títulos, tamanho (`<font size>`), cor e fundo
// (`style`), imagens coladas — mais o que costuma vir num colar da web.

const TAGS = [
  "b", "strong", "i", "em", "u", "s", "strike", "sub", "sup",
  "p", "div", "br", "span", "font", "blockquote", "pre", "code", "hr",
  "ul", "ol", "li", "h1", "h2", "h3", "h4",
  "img", "a",
]
const ATRIBUTOS = ["style", "size", "color", "src", "alt", "href", "width", "height"]

// Só o que o editor escreve em `style`. `background` (com url) e `position`
// (para cobrir a tela com algo falso) ficam de fora.
const PROPRIEDADES = new Set([
  "color", "background-color", "font-size", "font-weight", "font-style",
  "text-decoration", "text-decoration-line", "text-align", "width", "height",
])

/**
 * As declarações de CSS que passam, sem nenhuma que carregue URL. Cada uma sai
 * terminada em `;`, como o navegador escreve — assim a nota limpa não difere da
 * salva só por pontuação.
 */
export function estiloDaNota(estilo: string): string {
  return estilo
    .split(";")
    .map((d) => d.trim())
    .filter((d) => {
      const i = d.indexOf(":")
      if (i <= 0) return false
      const propriedade = d.slice(0, i).trim().toLowerCase()
      const valor = d.slice(i + 1).toLowerCase()
      return PROPRIEDADES.has(propriedade) && !valor.includes("url(") && !valor.includes("\\")
    })
    .map((d) => `${d};`)
    .join(" ")
}

let purificador: ReturnType<typeof DOMPurify> | null = null

function obterPurificador() {
  if (!purificador) {
    purificador = DOMPurify(window)
    purificador.addHook("uponSanitizeAttribute", (_no, dado) => {
      if (dado.attrName !== "style") return
      dado.attrValue = estiloDaNota(dado.attrValue)
      if (!dado.attrValue) dado.keepAttr = false
    })
  }
  return purificador
}

/** O HTML de uma nota pronto para ir ao `innerHTML`. Só roda no navegador. */
export function limpaHtmlDaNota(html: string): string {
  return obterPurificador().sanitize(html, { ALLOWED_TAGS: TAGS, ALLOWED_ATTR: ATRIBUTOS })
}
