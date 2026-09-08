import { REGIAO_DEFAULT, regiaoDoFormato, type Regiao } from "@/lib/regiao"
import { type TimeFormat } from "@/lib/time-format"

// Tradução do app — a primeira fatia.
//
// **Por que um dicionário à mão, e não uma biblioteca.** O que as bibliotecas
// resolvem (carregar arquivo por locale, negociar idioma no servidor, plural de
// idioma eslavo) não é problema aqui: são dois idiomas, o pacote inteiro é
// pequeno e o app já é client-side. O que elas cobram em troca é caro no que
// importa — chave em string solta (`t("agenda.titulo")`), que erra em silêncio
// no dia em que alguém renomeia. Com uma interface, **falta de chave é erro de
// compilação**: o `en` só compila se tiver tudo que o `pt` tem.
//
// **Por que funções e não só strings.** Frase com nome no meio e plural não
// cabem em texto fixo, e concatenar no JSX ("Os próximos " + n + " dias") é o
// que impede a tradução de verdade: em inglês a ordem muda. Cada frase que
// varia é uma função, e cada idioma escreve a sua do jeito dele.
//
// **De onde vem o idioma.** No app, da região — que já é derivada do formato de
// hora (lib/regiao.ts explica por que não há armazenamento próprio). Na página
// pública `/agenda/<token>`, do NAVEGADOR de quem abre: quem recebe o link não
// tem conta aqui, e o idioma de quem compartilhou não diz nada sobre ele.

export type Idioma = "pt" | "en"

export const IDIOMA_DEFAULT: Idioma = "pt"

/** A forma do dicionário. É este contrato que faz falta de chave não compilar. */
export interface Dicionario {
  agenda: {
    /** Título da página. Sem nome quando o dono não escolheu @usuário. */
    titulo: (nome: string | null) => string
    /** "Os próximos 14 dias. O que não está marcado aqui está livre." */
    periodo: (dias: number) => string
    fuso: (zona: string) => string
    carregando: string
    hoje: string
    livreODiaTodo: string
    /** O rodapé que explica o que NÃO é compartilhado. */
    rodape: (dono: string) => string
    /** Quando o dono não tem nome público, é assim que o rodapé o chama. */
    donoAnonimo: string
  }
  compartilhar: {
    explicacao: string
    mostrarProximos: string
    dias: (n: number) => string
    copiar: string
    criarLink: string
    gerarNovo: string
    desativar: string
    carregando: string
    toastCriado: string
    toastCopiado: string
    toastDesativado: string
    erroCopiar: string
    /** Falhas de banco. Dizem QUAL arquivo rodar — é o que resolve. */
    erroSemTabela: string
    erroCacheSchema: string
    erroPermissao: string
  }
}

export const pt: Dicionario = {
  agenda: {
    titulo: (nome) => (nome ? `Horários ocupados de ${nome}` : "Horários ocupados"),
    periodo: (dias) =>
      `Os próximos ${dias} ${dias === 1 ? "dia" : "dias"}. O que não está marcado aqui está livre.`,
    fuso: (zona) => `Horários no fuso ${zona}.`,
    carregando: "Carregando a agenda…",
    hoje: "hoje",
    livreODiaTodo: "Livre o dia todo",
    rodape: (dono) =>
      `${dono} compartilhou só os horários. O que ocupa cada faixa — título, local ou com quem — nunca sai do app.`,
    donoAnonimo: "Esta pessoa",
  },
  compartilhar: {
    explicacao:
      "Um link para mandar a quem precisa marcar horário com você — cliente, professor, quem for. Não exige conta e mostra só quando você está ocupado: título, local e com quem nunca saem daqui.",
    mostrarProximos: "Mostrar os próximos",
    dias: (n) => `${n} dias`,
    copiar: "Copiar",
    criarLink: "Criar link de agenda",
    gerarNovo: "Gerar novo link (invalida o antigo)",
    desativar: "Desativar",
    carregando: "Carregando…",
    toastCriado: "Link pronto! Quem abrir vê só seus horários ocupados.",
    toastCopiado: "Link copiado! Mande para quem precisa marcar horário com você.",
    toastDesativado: "Link desativado. Quem tinha ele agora vê uma página que não existe.",
    erroCopiar: "Não consegui copiar — selecione o link e copie manualmente.",
    erroSemTabela: "A tabela ainda não existe. Rode supabase/agenda_publica.sql no Supabase.",
    erroCacheSchema:
      "A tabela existe, mas a API do Supabase ainda não a enxerga (cache do schema). Espere alguns segundos e recarregue.",
    erroPermissao: "Sem permissão (RLS). Confira se as policies do agenda_publica.sql foram criadas.",
  },
}

export const en: Dicionario = {
  agenda: {
    titulo: (nome) => (nome ? `${nome}'s busy hours` : "Busy hours"),
    periodo: (dias) =>
      `The next ${dias} ${dias === 1 ? "day" : "days"}. Anything not shown here is free.`,
    fuso: (zona) => `Times shown in ${zona}.`,
    carregando: "Loading the schedule…",
    hoje: "today",
    livreODiaTodo: "Free all day",
    rodape: (dono) =>
      `${dono} shared only the hours. What fills each slot — title, place or with whom — never leaves the app.`,
    donoAnonimo: "This person",
  },
  compartilhar: {
    explicacao:
      "A link to send to whoever needs to book time with you — a client, a teacher, anyone. No account needed, and it shows only when you are busy: title, place and with whom never leave this app.",
    mostrarProximos: "Show the next",
    dias: (n) => `${n} days`,
    copiar: "Copy",
    criarLink: "Create schedule link",
    gerarNovo: "Generate a new link (revokes the old one)",
    desativar: "Turn off",
    carregando: "Loading…",
    toastCriado: "Link ready! Whoever opens it sees only your busy hours.",
    toastCopiado: "Link copied! Send it to whoever needs to book time with you.",
    toastDesativado: "Link turned off. Anyone who had it now sees a page that does not exist.",
    erroCopiar: "Could not copy — select the link and copy it manually.",
    erroSemTabela: "The table does not exist yet. Run supabase/agenda_publica.sql on Supabase.",
    erroCacheSchema:
      "The table exists, but the Supabase API cannot see it yet (schema cache). Wait a few seconds and reload.",
    erroPermissao: "No permission (RLS). Check that the agenda_publica.sql policies were created.",
  },
}

const DICIONARIOS: Record<Idioma, Dicionario> = { pt, en }

export function dicionario(idioma: Idioma): Dicionario {
  return DICIONARIOS[idioma] ?? DICIONARIOS[IDIOMA_DEFAULT]
}

export function idiomaDaRegiao(regiao: Regiao): Idioma {
  return regiao === "US" ? "en" : "pt"
}

/** O idioma do app: formato de hora → região → idioma, sem dado novo guardado. */
export function idiomaDoFormato(formato: TimeFormat): Idioma {
  return idiomaDaRegiao(regiaoDoFormato(formato) ?? REGIAO_DEFAULT)
}

/**
 * O idioma de quem ABRE um link público, a partir de `navigator.languages`.
 *
 * O padrão aqui é INGLÊS, ao contrário do resto do app. Quem chega numa página
 * pública sem falar português também não fala: mostrar inglês para um navegador
 * em francês é um palpite útil; mostrar português é insistir num que já falhou.
 * Só cai em português quando o navegador realmente pede português.
 */
export function idiomaDoNavegador(idiomas: readonly string[] | undefined): Idioma {
  for (const tag of idiomas ?? []) {
    const base = String(tag).toLowerCase().split("-")[0]
    if (base === "pt") return "pt"
    if (base === "en") return "en"
  }
  return "en"
}
