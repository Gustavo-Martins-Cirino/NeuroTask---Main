// Qual retrato a pessoa QUER usar: a foto, o bonequinho do Escritório ou as
// iniciais do nome.
//
// Antes isso era uma cascata automática — foto vencia bonequinho, que vencia
// iniciais. Funciona, mas tira a escolha de quem montou um bonequinho a dedo e
// entrou por Google: a foto do provedor aparecia e não havia como preferir o
// boneco. Agora a preferência é explícita, e a cascata vira só o FALLBACK de
// quando o que se escolheu não existe (mais).

export type AvatarModo = "foto" | "boneco" | "iniciais"

/** Padrão de quem nunca escolheu: mantém o comportamento antigo. */
export const AVATAR_MODO_PADRAO: AvatarModo = "foto"

export function parseAvatarModo(v: unknown): AvatarModo {
  return v === "foto" || v === "boneco" || v === "iniciais" ? v : AVATAR_MODO_PADRAO
}

export interface RetratoDisponivel {
  temFoto: boolean
  temBoneco: boolean
}

/**
 * O que DESENHAR, dado o que a pessoa escolheu e o que existe.
 *
 * As iniciais sempre funcionam (todo mundo tem nome, e sem nome sobra o "?"),
 * então são o fim da linha. Escolher "foto" sem ter foto cai no bonequinho, e
 * não direto nas iniciais: é o retrato mais parecido com o que se pediu.
 */
export function resolverModo(escolhido: AvatarModo, tem: RetratoDisponivel): AvatarModo {
  if (escolhido === "foto" && tem.temFoto) return "foto"
  if (escolhido === "boneco" && tem.temBoneco) return "boneco"
  if (escolhido === "iniciais") return "iniciais"
  // O que se pediu não existe: desce a cascata a partir do topo.
  if (tem.temFoto) return "foto"
  if (tem.temBoneco) return "boneco"
  return "iniciais"
}

/** Uma opção disponível é a que dá para escolher sem cair em fallback. */
export function modosDisponiveis(tem: RetratoDisponivel): AvatarModo[] {
  const out: AvatarModo[] = []
  if (tem.temFoto) out.push("foto")
  if (tem.temBoneco) out.push("boneco")
  out.push("iniciais")
  return out
}
