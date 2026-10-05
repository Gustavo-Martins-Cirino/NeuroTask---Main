import type { Task } from "@/lib/types"
import { restanteAte } from "@/lib/sino-foco"

// A sessão do Modo Foco guardada na ABA, para sobreviver a um recarregamento.
//
// Sem isto o foco morava só na memória da página, e o Chrome descarta aba parada
// para poupar memória (o celular faz o mesmo ao trocar de app): na volta a
// página recarregava e o foco tinha sumido — para quem olha, "o tempo parou".
//
// sessionStorage, e não localStorage: ele sobrevive ao recarregamento e ao
// descarte da MESMA aba, mas não vaza para outra. Com localStorage, abrir o app
// numa segunda aba restauraria o mesmo foco nas duas — e o sino tocaria duas vezes.

export const CHAVE_SESSAO_FOCO = "neurotask:foco-sessao"

/** Foco que acabou há mais que isto não volta: ninguém quer reabrir o app no dia
 *  seguinte e dar de cara com o 00:00 de ontem. */
export const VALIDADE_DEPOIS_DO_FIM = 60 * 60_000

const DURACAO_MAXIMA = 24 * 60 * 60

export interface SessaoFoco {
  /** Segundos. */
  duracao: number
  /** Segundos que faltam — vale quando PAUSADA. */
  restante: number
  /** Instante (ms) do fim. Presente = rodando. */
  fimEm: number | null
  tarefa: Task | null
  minimizado: boolean
  ambiente: number
  /** Segundos focados antes de um "recomeçar" ou troca de duração (lib/foco-pontos). */
  focadoAntes?: number
  /** Blocos de 5 min já pagos: recarregar não pode pagá-los de novo. */
  blocosPagos?: number
  /** XP que o servidor confirmou nesta sessão — o "+N XP neste foco". */
  xpGanho?: number
}

export interface SessaoRestaurada extends SessaoFoco {
  rodando: boolean
  /** O fim passou enquanto a página estava fora — recarregada, descartada. */
  terminouFora: boolean
}

const numeroFinito = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v)

/** Contador da sessão: ausente (sessão de antes dos pontos do foco) ou torto vira 0. */
const contador = (v: unknown): number => (numeroFinito(v) && v >= 0 ? Math.floor(v) : 0)

function tarefaValida(v: unknown): Task | null {
  if (!v || typeof v !== "object") return null
  const t = v as Partial<Task>
  return typeof t.id === "string" && typeof t.title === "string" ? (t as Task) : null
}

export function serializaSessao(s: SessaoFoco): string {
  return JSON.stringify(s)
}

/**
 * Lê o que estava guardado e diz como o foco deve voltar AGORA. Tudo que vier
 * torto (JSON quebrado, número fora da faixa, versão antiga) devolve null: na
 * dúvida, o foco não volta — melhor que voltar errado.
 */
export function restauraSessao(raw: string | null, agora: number, totalAmbientes: number): SessaoRestaurada | null {
  if (!raw) return null
  let d: Record<string, unknown>
  try {
    d = JSON.parse(raw)
  } catch {
    return null
  }
  if (!d || typeof d !== "object") return null

  const { duracao, restante, fimEm, ambiente } = d
  if (!numeroFinito(duracao) || duracao <= 0 || duracao > DURACAO_MAXIMA) return null
  if (fimEm !== null && !numeroFinito(fimEm)) return null
  if (fimEm === null && (!numeroFinito(restante) || restante < 0 || restante > duracao)) return null

  const base = {
    duracao,
    tarefa: tarefaValida(d.tarefa),
    minimizado: d.minimizado === true,
    ambiente: Number.isInteger(ambiente) && (ambiente as number) >= 0 && (ambiente as number) < totalAmbientes ? (ambiente as number) : 0,
    focadoAntes: contador(d.focadoAntes),
    blocosPagos: contador(d.blocosPagos),
    xpGanho: contador(d.xpGanho),
  }

  if (fimEm === null) {
    return { ...base, restante: restante as number, fimEm: null, rodando: false, terminouFora: false }
  }
  if (agora >= fimEm) {
    if (agora - fimEm > VALIDADE_DEPOIS_DO_FIM) return null
    return { ...base, restante: 0, fimEm: null, rodando: false, terminouFora: true }
  }
  return { ...base, restante: restanteAte(fimEm, agora), fimEm, rodando: true, terminouFora: false }
}
