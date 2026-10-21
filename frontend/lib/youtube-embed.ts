// Link do YouTube → o que tocar (player do Modo Foco).
//
// O que entra é texto que a pessoa colou, e o que sai vira `src` de iframe ou
// parâmetro da API do player — por isso nada do link passa adiante sem ser
// conferido pelo FORMATO:
//
// - o host é comparado inteiro, nunca por sufixo: `endsWith("youtube.com")`,
//   como estava, aceitava `evilyoutube.com` (alerta do CodeQL, 17/10);
// - o id do vídeo é o que o YouTube usa (11 caracteres de [A-Za-z0-9_-]) e a
//   lista também só tem esses caracteres. Fora disso o pedaço é descartado, e
//   um `&`, `#` ou `"` escondido no link não chega ao player.

const HOSTS = new Set(["youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"])
const ID = /^[\w-]{11}$/
const LISTA = /^[\w-]{2,64}$/
const CAMINHOS_COM_ID = new Set(["live", "embed", "shorts"])

export const PARAMETROS_DO_EMBED = "autoplay=1&rel=0&modestbranding=1&playsinline=1"

/** Pelo menos um dos dois existe; o que não passou no formato vem `null`. */
export interface IdsDoYoutube {
  video: string | null
  lista: string | null
}

function ids(video: string, lista: string): IdsDoYoutube | null {
  const v = ID.test(video) ? video : null
  const l = LISTA.test(lista) ? lista : null
  return v || l ? { video: v, lista: l } : null
}

/** O vídeo e/ou a lista de um link do YouTube, ou `null` quando não dá para tocar. */
export function idsDoYoutube(bruto: string): IdsDoYoutube | null {
  const texto = bruto.trim()
  if (!texto) return null
  if (ID.test(texto)) return ids(texto, "")

  let u: URL
  try {
    u = new URL(/^https?:\/\//i.test(texto) ? texto : `https://${texto}`)
  } catch {
    return null
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null

  const host = u.hostname.toLowerCase().replace(/^www\./, "")
  const lista = u.searchParams.get("list") ?? ""
  if (host === "youtu.be") return ids(u.pathname.split("/")[1] ?? "", lista)
  if (!HOSTS.has(host)) return null

  if (u.pathname === "/watch") return ids(u.searchParams.get("v") ?? "", lista)
  const [, primeiro = "", segundo = ""] = u.pathname.split("/")
  return ids(CAMINHOS_COM_ID.has(primeiro) ? segundo : "", lista)
}

/** O `src` do embed, sempre montado aqui, em www.youtube.com/embed. */
export function embedDoYoutube(bruto: string): string | null {
  const achados = idsDoYoutube(bruto)
  if (!achados) return null
  const { video, lista } = achados
  if (video && lista) return `https://www.youtube.com/embed/${video}?list=${lista}&${PARAMETROS_DO_EMBED}`
  if (lista) return `https://www.youtube.com/embed/videoseries?list=${lista}&${PARAMETROS_DO_EMBED}`
  return `https://www.youtube.com/embed/${video}?${PARAMETROS_DO_EMBED}`
}
