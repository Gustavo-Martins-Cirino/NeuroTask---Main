// Link do YouTube → endereço do embed oficial (player do Modo Foco).
//
// O que entra é texto que a pessoa colou, e o que sai vira `src` de iframe —
// por isso nada do link passa adiante sem ser conferido pelo FORMATO:
//
// - o host é comparado inteiro, nunca por sufixo: `endsWith("youtube.com")`,
//   como estava, aceitava `evilyoutube.com` (alerta do CodeQL, 17/10);
// - o id do vídeo é o que o YouTube usa (11 caracteres de [A-Za-z0-9_-]) e a
//   lista também só tem esses caracteres. Fora disso o pedaço é descartado, e
//   um `&`, `#` ou `"` escondido no link não chega à URL do iframe.
//
// A URL de saída é sempre montada aqui, em www.youtube.com/embed.

const HOSTS = new Set(["youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"])
const ID = /^[\w-]{11}$/
const LISTA = /^[\w-]{2,64}$/
const CAMINHOS_COM_ID = new Set(["live", "embed", "shorts"])

export const PARAMETROS_DO_EMBED = "autoplay=1&rel=0&modestbranding=1&playsinline=1"

function montar(id: string, lista: string): string | null {
  const idOk = ID.test(id) ? id : ""
  const listaOk = LISTA.test(lista) ? lista : ""
  if (idOk && listaOk) return `https://www.youtube.com/embed/${idOk}?list=${listaOk}&${PARAMETROS_DO_EMBED}`
  if (listaOk) return `https://www.youtube.com/embed/videoseries?list=${listaOk}&${PARAMETROS_DO_EMBED}`
  if (idOk) return `https://www.youtube.com/embed/${idOk}?${PARAMETROS_DO_EMBED}`
  return null
}

/** O `src` do embed, ou `null` quando o texto não é um link do YouTube que dê para tocar. */
export function embedDoYoutube(bruto: string): string | null {
  const texto = bruto.trim()
  if (!texto) return null
  if (ID.test(texto)) return montar(texto, "")

  let u: URL
  try {
    u = new URL(/^https?:\/\//i.test(texto) ? texto : `https://${texto}`)
  } catch {
    return null
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null

  const host = u.hostname.toLowerCase().replace(/^www\./, "")
  const lista = u.searchParams.get("list") ?? ""
  if (host === "youtu.be") return montar(u.pathname.split("/")[1] ?? "", lista)
  if (!HOSTS.has(host)) return null

  if (u.pathname === "/watch") return montar(u.searchParams.get("v") ?? "", lista)
  const [, primeiro = "", segundo = ""] = u.pathname.split("/")
  return montar(CAMINHOS_COM_ID.has(primeiro) ? segundo : "", lista)
}
