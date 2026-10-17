// O texto que vai para a voz da Neuro (/api/ai/tts → msedge-tts).
//
// O msedge-tts cola o texto CRU dentro do SSML, que é XML. Duas consequências,
// achadas no teste de corpos ruins (17/10):
// - qualquer resposta com `&` ou `<` ("Pão & café", "3 < 5") virava XML
//   inválido, o serviço de voz recusava e aquela fala saía muda;
// - quem manda o texto podia enfiar marcação na fala (outra voz, pausas longas).
// E um `text` que não fosse string derrubava a rota com 500.
//
// O corte vem ANTES do escape, para nunca partir uma entidade (`&amp;`) ao meio.

export const MAX_TEXTO_DA_VOZ = 900

const ENTIDADES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }

export function textoParaVoz(bruto: unknown): string {
  if (typeof bruto !== "string") return ""
  return bruto
    .trim()
    .slice(0, MAX_TEXTO_DA_VOZ)
    .replace(/[&<>"']/g, (c) => ENTIDADES[c])
}
