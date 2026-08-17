// Avatar de quem ainda não montou o bonequinho: as iniciais, num círculo com
// cor própria. Referência: components/inspirações/Captura de tela 2026-08-07 213710.png.
//
// Onde isto NÃO entra: onde já existe avatar montado. O commit e419015 tirou de
// propósito a inicial da lista de Amigos para pôr o bonequinho, e isto não pode
// desfazer aquilo — o lugar das iniciais é o vazio (conta nova, header, quem
// nunca abriu o editor).

/** Ligações que não são nome de ninguém e não devem virar inicial. */
const PARTICULAS = new Set([
  "de", "da", "do", "das", "dos", "e", "di", "del", "della", "van", "von", "der", "la", "le",
])

function palavrasDoNome(nome: string | null | undefined): string[] {
  if (typeof nome !== "string") return []
  const limpo = nome
    // Separa a letra do acento e joga o acento fora: "Ângela" → "Angela". Sem
    // isto a inicial sai "Â", que num círculo de 36px vira um borrão.
    .normalize("NFD")
    // Escrito por código (U+0300–U+036F) e não com os acentos literais: soltos
    // no fonte, eles grudam no colchete no primeiro editor que reescrever o
    // arquivo, e a regex passa a casar coisa nenhuma sem ninguém notar.
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
  const partes = limpo.split(/[\s._-]+/).filter(Boolean)
  const semParticulas = partes.filter((p) => !PARTICULAS.has(p.toLowerCase()))
  // "de la" sozinho é nome de ninguém, mas também não pode devolver vazio.
  return semParticulas.length > 0 ? semParticulas : partes
}

function primeiraLetra(palavra: string): string {
  // Array.from respeita emoji e pares substitutos; palavra[0] os parte ao meio.
  return (Array.from(palavra)[0] ?? "").toUpperCase()
}

/**
 * Gustavo Cirino → GC · Carlos Augusto → CA · Madonna → MA.
 * Sempre duas letras quando dá, porque uma só é o que existe hoje e é justamente
 * o que a referência melhora: com uma letra, metade das pessoas colide.
 */
export function iniciaisDoNome(nome: string | null | undefined): string {
  const palavras = palavrasDoNome(nome)
  if (palavras.length === 0) return "?"
  if (palavras.length === 1) {
    const letras = Array.from(palavras[0])
    // Nome de uma palavra usa as duas primeiras letras dele.
    return (letras.slice(0, 2).join("") || "?").toUpperCase()
  }
  return primeiraLetra(palavras[0]) + primeiraLetra(palavras[palavras.length - 1])
}

/**
 * Matiz (0–359) derivada do nome. **Determinística de propósito**: cor que muda
 * a cada carregamento é bug aos olhos de quem usa, e o avatar é justamente a
 * coisa que a pessoa procura de relance numa lista.
 */
export function matizDoNome(nome: string | null | undefined): number {
  const base = typeof nome === "string" ? nome.trim().toLowerCase() : ""
  if (!base) return 0
  let h = 0
  for (let i = 0; i < base.length; i++) {
    // O 31 é o multiplicador clássico de hash de string: primo, e espalha bem
    // nomes parecidos ("Ana Silva" e "Ana Souza" caem longe um do outro).
    h = (h * 31 + base.charCodeAt(i)) % 360000
  }
  return h % 360
}
