// Para onde o login pode mandar a pessoa depois de entrar.
//
// O `next` chega pela URL, e quem monta a URL é quem manda o link — não o app.
// Colado depois da origem sem conferir, `?next=@outro-site.com` virava
// `https://<site>@outro-site.com`, que o navegador lê como o HOST
// `outro-site.com`: a pessoa fazia o login de verdade e caía num site falso.
//
// A conferência é pelo parser do próprio navegador, e não por lista de
// prefixos proibidos: `//`, `/\`, tab e quebra de linha no meio (que o parser
// joga fora antes de ler) são todos jeitos de trocar o host, e a lista sempre
// esquece um. Se o caminho resolvido sair da origem, não passa.

const BASE = "http://destino.invalid"

/** Um caminho do próprio site (com busca e âncora), ou `padrao`. */
export function destinoSeguro(next: string | null | undefined, padrao = "/app"): string {
  if (!next?.startsWith("/")) return padrao
  let url: URL
  try {
    url = new URL(next, BASE)
  } catch {
    return padrao
  }
  if (url.origin !== BASE) return padrao
  return url.pathname + url.search + url.hash
}
