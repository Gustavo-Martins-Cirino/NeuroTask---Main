import { REGIAO_DEFAULT, regiaoDoFormato, type Regiao } from "@/lib/regiao"
import { type TimeFormat } from "@/lib/time-format"
import { type ChaveSaudacao } from "@/lib/saudacao"
import { type ChaveFaixa } from "@/lib/nivel-faixa"

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

/** O locale para Intl/toLocaleDateString de cada idioma. */
export const LOCALE: Record<Idioma, string> = { pt: "pt-BR", en: "en-US" }

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
  /**
   * Os nomes das telas — a moldura que aparece em toda página (dock e título
   * no topo).
   *
   * O app chama o dashboard de **dois nomes**: "Dashboard" no dock e "Início"
   * no título. A tradução expôs isso; unificar seria mudar o que a tela diz, e
   * isso é decisão de produto, não de tradução. Ficam as duas chaves, e a
   * escolha continua de quem desenha.
   *
   * "Neuro IA" é nome próprio: não traduz em idioma nenhum.
   */
  telas: {
    inicio: string
    /** O mesmo lugar, como o dock o chama. */
    inicioNav: string
    calendario: string
    /** No topo da tela o calendário tem nome longo; no dock, curto. */
    calendarioTitulo: string
    tarefas: string
    favoritos: string
    notas: string
    neuroIa: string
    escritorio: string
    amigos: string
    configuracoes: string
  }
  inicio: {
    /** Saudação: a hora escolhe a chave (lib/saudacao), aqui vira texto. */
    saudacoes: Record<ChaveSaudacao, string>
    /** Nome do degrau de nível; a chave vem de lib/nivel-faixa. */
    faixas: Record<ChaveFaixa, string>
    nivel: (n: number, faixa: string) => string
    pendentes: (quantas: number, percentual: number) => string
    tudoEmDia: string
    metricas: { tarefas: string; concluidas: string; pendentes: string; blocosHoje: string }
    agora: string
    ate: (hora: string) => string
    depois: (titulo: string, hora: string) => string
    proximoBloco: string
    as: (hora: string) => string
    semBlocos: string
    planejarODia: string
    tarefasDeHoje: string
    semTarefasHoje: string
    autoconhecimento: string
    planejadoReal: (planejado: number, real: number) => string
    emDia: string
    aMais: (minutos: number) => string
    autoconhecimentoRodape: string
    lembretes: string
    verTodas: string
    verNoCalendario: string
    acoes: {
      calendario: { titulo: string; desc: string }
      tarefas: { titulo: string; desc: string }
      neuro: { titulo: string; desc: string }
    }
  }
  configuracoes: {
    perfil: {
      titulo: string
      descricao: string
      nome: string
      nomePlaceholder: string
      email: string
      salvar: string
      salvo: string
    }
    aparencia: {
      titulo: string
      descricao: string
      claro: string
      escuro: string
      sistema: string
      regiao: string
      /** O que a região faz de fato — e a tradução mudou essa resposta. */
      regiaoAjuda: string
    }
    rotina: {
      titulo: string
      descricao: string
      sonoDesejado: string
      avisos: string
      avisosDetalhe: string
      salvar: string
      minhasAtividades: string
      atividadesAjuda: string
      adicionar: string
      nomePlaceholder: string
      excluir: string
      aceitar: string
      ignorar: string
      /**
       * As duas frases de sugestão têm trechos em negrito no meio. O `§` marca
       * o que vai em <strong> (ver `enfatizar` em lib/enfase.tsx): assim cada
       * idioma escreve a frase inteira, com a ORDEM das palavras que quiser, e
       * o negrito acompanha — em vez de a frase virar pedaços costurados no
       * JSX, que prendem a ordem do português.
       */
      sugestaoNova: (titulo: string, dias: number, categoria: string, minutos: number) => string
      sugestaoAjuste: (titulo: string, real: number, amostras: number, antes: number) => string
      toastAtualizada: string
    }
    importarExportar: { titulo: string; descricao: string }
    assinar: { titulo: string; descricao: string }
    compartilharAgenda: { titulo: string; descricao: string }
    notificacoes: {
      titulo: string
      descricao: string
      nesteDispositivo: string
      suportado: string
      naoSuportado: string
      toastDesativadas: string
      toastAtivadas: string
      toastAtivadasDetalhe: string
      erroAtivar: string
    }
    telegram: {
      titulo: string
      descricao: string
      mandeParaOBot: string
      expiraEm: (mm: string) => string
      gerarCodigo: string
      conversasConectadas: string
      conversaSemNome: string
      ultimaMensagem: (data: string) => string
      semMensagens: string
      ajudaComandos: string
      erroGerar: string
      tenteNovamente: string
    }
    conta: { titulo: string; sair: string }
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
  telas: {
    inicio: "Início",
    inicioNav: "Dashboard",
    calendario: "Calendário",
    calendarioTitulo: "Meu Dia · Time Blocking",
    tarefas: "Tarefas",
    favoritos: "Favoritos",
    notas: "Notas",
    neuroIa: "Neuro IA",
    escritorio: "Escritório",
    amigos: "Amigos",
    configuracoes: "Configurações",
  },
  inicio: {
    saudacoes: { ola: "Olá", bomDia: "Bom dia", boaTarde: "Boa tarde", boaNoite: "Boa noite" },
    faixas: {
      comecando: "Começando",
      emRitmo: "Em ritmo",
      constante: "Constante",
      avancado: "Avançado",
      veterano: "Veterano",
      lendario: "Lendário",
    },
    nivel: (n, faixa) => `Nível ${n} · ${faixa}`,
    pendentes: (quantas, percentual) =>
      `Você tem ${quantas} ${quantas === 1 ? "tarefa pendente" : "tarefas pendentes"}. ${percentual}% concluído.`,
    tudoEmDia: "Tudo em dia. Que tal planejar algo novo?",
    metricas: {
      tarefas: "Tarefas",
      concluidas: "Concluídas",
      pendentes: "Pendentes",
      blocosHoje: "Blocos hoje",
    },
    agora: "Agora",
    ate: (hora) => `até ${hora}`,
    depois: (titulo, hora) => `Depois: ${titulo} às ${hora}`,
    proximoBloco: "Próximo bloco",
    as: (hora) => `às ${hora}`,
    semBlocos: "Nenhum bloco pela frente hoje.",
    planejarODia: "Planejar o dia",
    tarefasDeHoje: "Tarefas de hoje",
    semTarefasHoje: "Nada com prazo para hoje. 🎉",
    autoconhecimento: "Autoconhecimento",
    planejadoReal: (planejado, real) => `planejado ${planejado}min · real ~${real}min`,
    emDia: "em dia",
    aMais: (minutos) => `+${minutos}min`,
    autoconhecimentoRodape:
      "Calculado dos seus check-ins — responda \u201cConcluí\u201d quando um bloco terminar.",
    lembretes: "Lembretes de hoje",
    verTodas: "Ver todas",
    verNoCalendario: "Ver no calendário",
    acoes: {
      calendario: { titulo: "Calendário", desc: "Organize seu tempo com blocos de foco" },
      tarefas: { titulo: "Tarefas", desc: "Gerencie e priorize suas atividades" },
      neuro: { titulo: "Neuro IA", desc: "Insights e sugestões inteligentes" },
    },
  },
  configuracoes: {
    perfil: {
      titulo: "Perfil",
      descricao: "Sua foto, nome e email",
      nome: "Nome",
      nomePlaceholder: "Seu nome",
      email: "Email",
      salvar: "Salvar",
      salvo: "Salvo",
    },
    aparencia: {
      titulo: "Aparência",
      descricao: "Tema e região",
      claro: "Claro",
      escuro: "Escuro",
      sistema: "Sistema",
      regiao: "Região",
      regiaoAjuda:
        "Decide como as horas aparecem e em que idioma o app fala. A tradução está em andamento: a moldura e o compartilhamento de agenda já acompanham; o resto ainda está em português.",
    },
    rotina: {
      titulo: "Rotina",
      descricao: "Seus tempos pessoais — usados pelo planejamento e pelos avisos do calendário",
      sonoDesejado: "Sono desejado",
      avisos: "Avisos inteligentes no calendário",
      avisosDetalhe: "Sono curto antes de compromissos, telas perto da hora de dormir",
      salvar: "Salvar rotina",
      minhasAtividades: "Minhas atividades",
      atividadesAjuda:
        "Atividades nomeadas com duração — viram blocos de 1 toque no calendário e alimentam o planejamento da Neuro. Ex.: \u201cDeslocamento \u2192 Trabalho\u201d, \u201cSe arrumar (evento)\u201d.",
      adicionar: "Adicionar atividade",
      nomePlaceholder: "Nome — ex.: Deslocamento \u2192 Trabalho",
      excluir: "Excluir atividade",
      aceitar: "Aceitar sugestão",
      ignorar: "Ignorar",
      sugestaoNova: (titulo, dias, categoria, minutos) =>
        `Você fez §${titulo}§ em ${dias} dias diferentes — salvar como atividade de ${categoria} de §${minutos} min§?`,
      sugestaoAjuste: (titulo, real, amostras, antes) =>
        `Em §${titulo}§ você leva ~§${real} min§ na prática (${amostras} check-ins), não ${antes} — ajustar?`,
      toastAtualizada: "Rotina atualizada! ✨",
    },
    importarExportar: {
      titulo: "Importar e exportar",
      descricao: "Traga sua agenda de outro calendário (.ics) ou leve a sua pra fora",
    },
    assinar: {
      titulo: "Assinar no Google/Outlook",
      descricao: "Um link que mostra seus blocos no seu calendário de sempre, atualizando sozinho",
    },
    compartilharAgenda: {
      titulo: "Compartilhar meus horários",
      descricao: "Um link para quem precisa marcar horário com você — sem conta, e sem ver o que você faz",
    },
    notificacoes: {
      titulo: "Notificações",
      descricao: "Lembretes e check-ins mesmo com o app fechado",
      nesteDispositivo: "Notificações neste dispositivo",
      suportado: "Ative em cada aparelho que quiser receber (celular, computador).",
      naoSuportado:
        "Não suportado neste navegador. No iPhone: adicione o app à tela de início e ative por lá.",
      toastDesativadas: "Notificações desativadas neste dispositivo.",
      toastAtivadas: "Notificações ativadas! 🔔",
      toastAtivadasDetalhe: "Lembretes e check-ins chegam mesmo com o app fechado.",
      erroAtivar: "Não deu para ativar",
    },
    telegram: {
      titulo: "Telegram",
      descricao: "Mande uma mensagem para o bot e ela vira tarefa",
      mandeParaOBot: "No Telegram, mande para o bot:",
      expiraEm: (mm) => `Expira em ${mm}.`,
      gerarCodigo: "Gerar código de pareamento",
      conversasConectadas: "Conversas conectadas",
      conversaSemNome: "Conversa do Telegram",
      ultimaMensagem: (data) => `Última mensagem em ${data}`,
      semMensagens: "Ainda sem mensagens",
      ajudaComandos:
        "Qualquer mensagem vira tarefa (1ª linha = título). Também entende /hoje e /ajuda.",
      erroGerar: "Não deu para gerar o código",
      tenteNovamente: "Tente novamente.",
    },
    conta: { titulo: "Conta", sair: "Sair da conta" },
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
  telas: {
    inicio: "Home",
    inicioNav: "Dashboard",
    calendario: "Calendar",
    calendarioTitulo: "My Day · Time Blocking",
    tarefas: "Tasks",
    favoritos: "Favorites",
    notas: "Notes",
    neuroIa: "Neuro IA",
    escritorio: "Office",
    amigos: "Friends",
    configuracoes: "Settings",
  },
  inicio: {
    saudacoes: { ola: "Hello", bomDia: "Good morning", boaTarde: "Good afternoon", boaNoite: "Good evening" },
    faixas: {
      comecando: "Starting out",
      emRitmo: "Getting going",
      constante: "Steady",
      avancado: "Advanced",
      veterano: "Veteran",
      lendario: "Legendary",
    },
    nivel: (n, faixa) => `Level ${n} · ${faixa}`,
    pendentes: (quantas, percentual) =>
      `You have ${quantas} ${quantas === 1 ? "task pending" : "tasks pending"}. ${percentual}% done.`,
    tudoEmDia: "All caught up. How about planning something new?",
    metricas: {
      tarefas: "Tasks",
      concluidas: "Done",
      pendentes: "Pending",
      blocosHoje: "Blocks today",
    },
    agora: "Now",
    ate: (hora) => `until ${hora}`,
    depois: (titulo, hora) => `Next: ${titulo} at ${hora}`,
    proximoBloco: "Next block",
    as: (hora) => `at ${hora}`,
    semBlocos: "Nothing else scheduled today.",
    planejarODia: "Plan the day",
    tarefasDeHoje: "Today\u2019s tasks",
    semTarefasHoje: "Nothing due today. 🎉",
    autoconhecimento: "Know yourself",
    planejadoReal: (planejado, real) => `planned ${planejado}min · actual ~${real}min`,
    emDia: "on point",
    aMais: (minutos) => `+${minutos}min`,
    autoconhecimentoRodape:
      "Worked out from your check-ins — answer \u201cDone\u201d when a block ends.",
    lembretes: "Today\u2019s reminders",
    verTodas: "See all",
    verNoCalendario: "See in calendar",
    acoes: {
      calendario: { titulo: "Calendar", desc: "Organise your time with focus blocks" },
      tarefas: { titulo: "Tasks", desc: "Manage and prioritise what you have to do" },
      neuro: { titulo: "Neuro IA", desc: "Insights and smart suggestions" },
    },
  },
  configuracoes: {
    perfil: {
      titulo: "Profile",
      descricao: "Your photo, name and email",
      nome: "Name",
      nomePlaceholder: "Your name",
      email: "Email",
      salvar: "Save",
      salvo: "Saved",
    },
    aparencia: {
      titulo: "Appearance",
      descricao: "Theme and region",
      claro: "Light",
      escuro: "Dark",
      sistema: "System",
      regiao: "Region",
      regiaoAjuda:
        "Sets how times are shown and which language the app speaks. Translation is under way: the app frame and schedule sharing already follow it; the rest is still in Portuguese.",
    },
    rotina: {
      titulo: "Routine",
      descricao: "Your personal timings — used by planning and by the calendar warnings",
      sonoDesejado: "Target sleep",
      avisos: "Smart calendar warnings",
      avisosDetalhe: "Short sleep before commitments, screens close to bedtime",
      salvar: "Save routine",
      minhasAtividades: "My activities",
      atividadesAjuda:
        "Named activities with a duration — they become one-tap blocks in the calendar and feed Neuro\u2019s planning. E.g. \u201cCommute \u2192 Work\u201d, \u201cGet ready (event)\u201d.",
      adicionar: "Add activity",
      nomePlaceholder: "Name — e.g. Commute \u2192 Work",
      excluir: "Delete activity",
      aceitar: "Accept suggestion",
      ignorar: "Dismiss",
      sugestaoNova: (titulo, dias, categoria, minutos) =>
        `You did §${titulo}§ on ${dias} different days — save it as a ${categoria} activity of §${minutos} min§?`,
      sugestaoAjuste: (titulo, real, amostras, antes) =>
        `§${titulo}§ actually takes you ~§${real} min§ (${amostras} check-ins), not ${antes} — adjust it?`,
      toastAtualizada: "Routine updated! ✨",
    },
    importarExportar: {
      titulo: "Import and export",
      descricao: "Bring your schedule from another calendar (.ics), or take yours elsewhere",
    },
    assinar: {
      titulo: "Subscribe on Google/Outlook",
      descricao: "A link that shows your blocks in your usual calendar, updating on its own",
    },
    compartilharAgenda: {
      titulo: "Share my hours",
      descricao: "A link for whoever needs to book time with you — no account, and no view of what you do",
    },
    notificacoes: {
      titulo: "Notifications",
      descricao: "Reminders and check-ins even with the app closed",
      nesteDispositivo: "Notifications on this device",
      suportado: "Turn it on for each device you want to be notified on (phone, computer).",
      naoSuportado:
        "Not supported in this browser. On iPhone: add the app to your home screen and enable it there.",
      toastDesativadas: "Notifications turned off on this device.",
      toastAtivadas: "Notifications on! 🔔",
      toastAtivadasDetalhe: "Reminders and check-ins arrive even with the app closed.",
      erroAtivar: "Could not turn it on",
    },
    telegram: {
      titulo: "Telegram",
      descricao: "Send the bot a message and it becomes a task",
      mandeParaOBot: "On Telegram, send the bot:",
      expiraEm: (mm) => `Expires in ${mm}.`,
      gerarCodigo: "Generate pairing code",
      conversasConectadas: "Connected chats",
      conversaSemNome: "Telegram chat",
      ultimaMensagem: (data) => `Last message on ${data}`,
      semMensagens: "No messages yet",
      ajudaComandos:
        "Any message becomes a task (first line = title). It also understands /hoje and /ajuda.",
      erroGerar: "Could not generate the code",
      tenteNovamente: "Try again.",
    },
    conta: { titulo: "Account", sair: "Sign out" },
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
