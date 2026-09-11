import { REGIAO_DEFAULT, regiaoDoFormato, type Regiao } from "@/lib/regiao"
import { type TimeFormat } from "@/lib/time-format"
import { type ChaveSaudacao } from "@/lib/saudacao"
import { type ChaveFaixa } from "@/lib/nivel-faixa"
import { type Repeticao } from "@/lib/task-recurrence"
import { type TaskPriority } from "@/lib/types"
import { type ChaveCorDeNota } from "@/lib/nota-cor"
import { type VisaoDoCalendario } from "@/lib/calendario-visao"

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
      /** Nome de cada região — a chave vem de lib/regiao. */
      regioes: Record<"BR" | "US", string>
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
    importarExportar: {
      titulo: string
      descricao: string
      importar: string
      importarDescricao: string
      exportar: string
      exportarDescricao: string
      /** Ainda não há bloco nenhum — não é erro, é aviso. */
      nadaParaExportar: string
      toastExportado: (n: number) => string
      /** O diálogo que a opção "Importar" abre. */
      dialogo: {
        titulo: string
        escolherArquivo: string
        /** Onde achar o .ics no Google — a ênfase marca o passo final. */
        ondeAchar: string
        semEventos: string
        erroLeitura: string
        precisaLogin: string
        marcarTodos: string
        desmarcarTodos: string
        /** "12 eventos · 3 já existe(m) · selecione o que criar" */
        resumo: (total: number, duplicados: number) => string
        jaExiste: string
        diaInteiro: string
        /**
         * O chip de repetição do evento importado. Diário e semanal saem do
         * vocabulário da TAREFA, que é o mesmo; só "dias úteis" nasce aqui,
         * porque o rótulo do bloco ("Dias úteis (seg–sex)") é de opção de
         * menu e não cabe num chip de 10px.
         */
        repeticaoDiasUteis: string
        cancelar: string
        importar: string
        importarN: (n: number) => string
        toastImportado: (n: number) => string
      }
    }
    assinar: {
      titulo: string
      descricao: string
      explicacao: string
      carregando: string
      copiar: string
      gerar: string
      gerarNovo: string
      /** Onde colar o link no Google — a ênfase marca o caminho do menu. */
      ondeColar: string
      toastPronto: string
      toastCopiado: string
      erroCopiar: string
      /** Falhas de banco. Dizem QUAL arquivo rodar — é o que resolve. */
      erroSemTabela: string
      erroCacheSchema: string
      erroPermissao: string
    }
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
  tarefas: {
    nova: string
    criar: string
    salvar: string
    cancelar: string
    vazio: string
    /** As listas: a de sempre, as criadas, e o balaio de órfãs. */
    listaGeral: string
    listaOutras: string
    novaLista: string
    nomeDaLista: string
    excluirLista: string
    /** O filtro por data, no alto da lista. */
    escopos: { hoje: string; proximos: string; todos: string }
    vazioHoje: string
    vazioProximos: string
    vazioTodos: string
    concluidas: (n: number) => string
    erroSemTabelaListas: string
    erroExcluir: string
    erroRepeticao: string
    toastRecorrente: string
    toastRecorrenteDetalhe: (data: string) => string
    toastSemXp: string
    toastSemXpDetalhe: (minutos: number) => string
    /**
     * "Repete: diariamente" — a minúscula no meio da frase é decisão de CADA
     * idioma, não do código que chama. Em português e inglês o rótulo desce
     * para minúscula; em alemão, onde substantivo é maiúsculo, quem escrever o
     * `de` simplesmente não faz isso.
     */
    toastRepete: (rotulo: string) => string
    toastNaoRepete: string
    /** Os nomes das repetições. A chave vem de lib/task-recurrence. */
    repeticao: {
      naoRepete: string
      diariamente: string
      semanalmente: string
      mensalmente: string
      anualmente: string
      aCadaNDias: (dias: number) => string
      /** A opção do menu, quando ainda não há número escolhido. */
      aCadaNDiasVazio: string
    }
    prioridades: Record<TaskPriority, string>
    cartao: {
      concluir: string
      marcarPendente: string
      favoritar: string
      desfavoritar: string
      editar: string
      excluir: string
      repetir: string
      atrasada: string
      faltamMinutos: (n: number) => string
      faltamHoras: (n: number) => string
      faltamDias: (n: number) => string
      entrar: string
      copiarLinkReuniao: string
      toastLinkReuniao: string
      emAndamento: string
      iniciar: string
    }
    dialogo: {
      editarTitulo: string
      novaTitulo: string
      tituloPlaceholder: string
      descricaoPlaceholder: string
      prioridade: string
      tempoEstimado: string
      personalizarTempo: string
      vencimento: string
      semData: string
      hoje: string
      amanha: string
      emNDias: (n: number) => string
      emXDias: string
      data: string
      reuniao: string
      opcional: string
      linkPlaceholder: string
      copiarLink: string
      toastLinkCopiado: string
      horario: string
      horarioDoCompromisso: string
      escolher: string
      limpar: string
      semDataVale: (hora: string) => string
      localPlaceholder: string
      adicionarLocal: string
      repetir: string
      personalizado: string
      aCadaNDias: (dias: number) => string
      avancaSozinho: string
      precisaLogin: string
    }
  }
  favoritos: {
    vazio: string
    tarefas: (n: number) => string
    notas: (n: number) => string
    verTodas: string
    remover: string
    notaSemTitulo: string
    notaVazia: string
  }
  notas: {
    nova: string
    /**
     * "Nenhuma nota ainda. Clique em §Nova nota§ para começar a escrever."
     *
     * O `§` marca o negrito (ver lib/enfase.tsx). Era `<b>Nova nota</b>` no meio
     * do JSX — e é justamente o corte que prende a ordem das palavras do
     * português: em inglês o nome do botão não cai no mesmo lugar da frase.
     */
    vazio: string
    semTitulo: string
    vazia: string
    tituloPlaceholder: string
    escrevaAqui: string
    selecione: string
    salvando: string
    salvo: string
    favoritar: string
    desfavoritar: string
    excluir: string
    corDaNota: string
    semCor: string
    /** O nome de cada cor. A chave vem de lib/nota-cor. */
    cores: Record<ChaveCorDeNota, string>
    erroSemColunaCor: string
    erroSalvarCor: string
    editor: {
      desfazer: string
      refazer: string
      negrito: string
      italico: string
      sublinhado: string
      /**
       * As três letras do tamanho — P/M/G em português, S/M/L em inglês. É o
       * mesmo caso das iniciais dos dias da semana: letra solta que parece
       * neutra e não é.
       */
      tamanhos: { pequeno: string; medio: string; grande: string }
      tamanhoDica: (letra: string) => string
      titulo: string
      lista: string
      listaNumerada: string
      cores: string
      corDoTexto: string
      fundoMarcaTexto: string
      corPadrao: string
      semFundo: string
      /** As cores do texto e do marca-texto — as duas paletas usam estes nomes. */
      paleta: {
        vermelho: string
        laranja: string
        amarelo: string
        verde: string
        azul: string
        roxo: string
        rosa: string
      }
      imagem: string
      diminuir: string
      aumentar: string
      concluir: string
    }
  }
  /**
   * O calendário: barra de ferramentas, grade, painel do dia e o diálogo de
   * bloco de tempo.
   */
  calendario: {
    novoBloco: string
    hoje: string
    /** Os nomes das quatro visões, na ordem em que aparecem. */
    visoes: Record<VisaoDoCalendario, string>
    /** As sete iniciais no alto da grade — "DOM…SÁB" / "SUN…SAT". */
    diasDaSemana: readonly string[]
    dispensarAviso: string
    abrirODia: string
    recolherPainel: string
    expandirPainel: string
    painelContextual: string
    /**
     * Os avisos do calendário (lib/calendar-warnings decide qual e com quais
     * valores; a frase é daqui).
     */
    avisos: {
      telaAntesDeDormir: (titulo: string, horaDeDormir: string) => string
      sonoCurto: (inicio: string, fim: string, horas: string, desejadas: string) => string
      vaoAntesDoSono: (
        titulo: string, fim: string, tituloSeguinte: string, inicio: string,
        horas: string, desejadas: string
      ) => string
      /** "2,5h" em português, "2.5h" em inglês — a vírgula decimal não viaja. */
      horas: (h: number) => string
    }
    notas: {
      salvando: string
      salvo: string
      /** O que se escreve para a IA ler depois. */
      placeholder: string
    }
    lembretes: {
      titulo: string
      adicionar: string
      placeholder: string
      definirHorario: string
      horarioNotificacao: string
      remover: string
      vazio: string
    }
    bloco: {
      novoTitulo: string
      editarTitulo: string
      novoSubtitulo: string
      editarSubtitulo: string
      titulo: string
      tituloPlaceholder: string
      descricao: string
      descricaoPlaceholder: string
      inicio: string
      fim: string
      horarioDeInicio: string
      horarioDeFim: string
      data: string
      cor: string
      vincularTarefa: string
      nenhumaTarefa: string
      vincularAjuda: string
      repetir: string
      /**
       * A repetição de BLOCO. Ela reaproveita as chaves da tarefa onde as duas
       * coincidem e acrescenta a que só existe aqui — ver o comentário em
       * components/time-block-dialog sobre por que as listas não viram uma só.
       */
      diasUteis: string
      excluir: string
      excluirAtalho: string
      cancelar: string
      salvar: string
      criar: string
      salvando: string
      precisaLogin: string
    }
  }
}

export const pt: Dicionario = {
  calendario: {
    novoBloco: "Novo bloco",
    hoje: "Hoje",
    visoes: { dia: "dia", semana: "semana", mes: "mês", ano: "ano" },
    diasDaSemana: ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"],
    dispensarAviso: "Dispensar aviso",
    abrirODia: "Abrir o dia",
    recolherPainel: "Recolher painel",
    expandirPainel: "Expandir painel",
    painelContextual: "Painel contextual",
    avisos: {
      telaAntesDeDormir: (titulo, horaDeDormir) =>
        `"${titulo}" termina pouco antes de dormir (${horaDeDormir}). Telas perto do sono atrapalham o descanso — que tal encerrar mais cedo?`,
      sonoCurto: (inicio, fim, horas, desejadas) =>
        `Seu bloco de sono (${inicio}–${fim}) tem só ${horas} — abaixo das ${desejadas} que você quer dormir.`,
      vaoAntesDoSono: (titulo, fim, tituloSeguinte, inicio, horas, desejadas) =>
        `Entre "${titulo}" (até ${fim}) e "${tituloSeguinte}" (às ${inicio}) sobram só ${horas} — menos que suas ${desejadas} de sono.`,
      horas: (h) => `${String(Math.round(h * 10) / 10).replace(".", ",")}h`,
    },
    notas: {
      salvando: "Salvando…",
      salvo: "Salvo",
      placeholder: "Para interpretação por IA: Reflexões de hoje... Como tem sido seu foco? Alguma ideia solta?",
    },
    lembretes: {
      titulo: "Lembretes do dia",
      adicionar: "Adicionar lembrete",
      placeholder: "Adicionar lembrete...",
      definirHorario: "Definir horário",
      horarioNotificacao: "Horário (notificação)",
      remover: "Remover lembrete",
      vazio: "Nenhum lembrete por enquanto.",
    },
    bloco: {
      novoTitulo: "Novo bloco de tempo",
      editarTitulo: "Editar bloco",
      novoSubtitulo: "Agende um novo bloco de foco",
      editarSubtitulo: "Atualize os detalhes do bloco",
      titulo: "Título",
      tituloPlaceholder: "Ex: Foco em desenvolvimento",
      descricao: "Descrição",
      descricaoPlaceholder: "Detalhes opcionais...",
      inicio: "Início",
      fim: "Fim",
      horarioDeInicio: "Horário de início",
      horarioDeFim: "Horário de fim",
      data: "Data",
      cor: "Cor",
      vincularTarefa: "Vincular tarefa",
      nenhumaTarefa: "Nenhuma",
      vincularAjuda: "Liga este bloco a uma tarefa da sua lista — o bloco vira o horário de fazê-la.",
      repetir: "Repetir",
      diasUteis: "Dias úteis (seg–sex)",
      excluir: "Excluir bloco",
      excluirAtalho: "Excluir bloco (Backspace)",
      cancelar: "Cancelar",
      salvar: "Salvar",
      criar: "Criar bloco",
      salvando: "Salvando...",
      precisaLogin: "Você precisa estar logado",
    },
  },
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
      regioes: { BR: "Brasil", US: "Estados Unidos" },
      regiaoAjuda:
        "Decide como as horas aparecem e em que idioma o app fala. A tradução está em andamento — ainda faltam os amigos, o Escritório e a Neuro IA.",
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
      importar: "Importar",
      importarDescricao: "Traga sua agenda de um arquivo .ics (Google Calendar, Outlook…)",
      exportar: "Exportar",
      exportarDescricao: "Baixe seus blocos como .ics pra usar em outro calendário",
      nadaParaExportar: "Nenhum bloco pra exportar ainda.",
      toastExportado: (n) => `${n} ${n === 1 ? "bloco exportado" : "blocos exportados"} (.ics)`,
      dialogo: {
        titulo: "Importar agenda (.ics)",
        escolherArquivo: "Escolher arquivo .ics",
        ondeAchar:
          "No Google Calendar: Configurações → Importar e exportar → §Exportar§ (baixa um .zip com o .ics).",
        semEventos: "Não encontrei eventos nesse arquivo. Exporte a agenda como .ics no seu calendário.",
        erroLeitura: "Não consegui ler o arquivo.",
        precisaLogin: "Você precisa estar logado.",
        marcarTodos: "Marcar todos",
        desmarcarTodos: "Desmarcar todos",
        resumo: (total, duplicados) =>
          `${total} ${total === 1 ? "evento" : "eventos"} · ${duplicados > 0 ? `${duplicados} já existe(m) · ` : ""}selecione o que criar`,
        jaExiste: "já existe",
        diaInteiro: "dia inteiro",
        repeticaoDiasUteis: "Dias úteis",
        cancelar: "Cancelar",
        importar: "Importar",
        importarN: (n) => `Importar ${n}`,
        toastImportado: (n) => `${n} ${n === 1 ? "evento importado" : "eventos importados"}! 📅`,
      },
    },
    assinar: {
      titulo: "Assinar no Google/Outlook",
      descricao: "Um link que mostra seus blocos no seu calendário de sempre, atualizando sozinho",
      explicacao:
        "Assine sua agenda no Google Calendar, Outlook e outros: eles leem este link e mostram seus blocos, atualizando sozinhos. É só-leitura — ninguém edita sua agenda por aqui.",
      carregando: "Carregando…",
      copiar: "Copiar",
      gerar: "Gerar link de assinatura",
      gerarNovo: "Gerar novo link (invalida o antigo)",
      ondeColar:
        "No Google Calendar: §Outros calendários → Adicionar → De URL§, cole o link. A atualização do lado deles pode levar horas — o Google reamostra quando quer.",
      toastPronto: "Link de assinatura pronto! 📆",
      toastCopiado: 'Link copiado! Cole no seu calendário, em "assinar por URL".',
      erroCopiar: "Não consegui copiar — selecione o link e copie manualmente.",
      erroSemTabela: "A tabela do feed ainda não existe. Rode supabase/calendar_feed.sql no Supabase.",
      erroCacheSchema:
        "A tabela existe, mas a API do Supabase ainda não a enxerga (cache do schema). Espere alguns segundos e recarregue.",
      erroPermissao: "Sem permissão (RLS). Confira se as policies do calendar_feed.sql foram criadas.",
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
  tarefas: {
    nova: "Nova tarefa",
    criar: "Criar tarefa",
    salvar: "Salvar",
    cancelar: "Cancelar",
    vazio: "Nenhuma tarefa por aqui. Que tal adicionar uma?",
    listaGeral: "Geral",
    listaOutras: "Outras",
    novaLista: "Nova lista",
    nomeDaLista: "Nome da lista",
    excluirLista: "Excluir lista",
    escopos: { hoje: "Hoje", proximos: "Próximos", todos: "Todos" },
    vazioHoje: "Nada para hoje. 🎉",
    vazioProximos: "Nada nos próximos dias.",
    vazioTodos: "Nenhuma tarefa.",
    concluidas: (n) => `Concluídas (${n})`,
    erroSemTabelaListas:
      "A tabela de listas ainda não existe. Rode supabase/task_lists.sql no Supabase.",
    erroExcluir: "Não consegui excluir a tarefa.",
    erroRepeticao: "Não consegui mudar a repetição agora.",
    toastRecorrente: "Tarefa recorrente concluída! 🔁",
    toastRecorrenteDetalhe: (data) => `Próxima ocorrência: ${data}`,
    toastSemXp: "Concluída — sem XP desta vez 😉",
    toastSemXpDetalhe: (minutos) =>
      `Tarefas criadas há menos de ${minutos} min não geram XP.`,
    toastRepete: (rotulo) => `Repete: ${rotulo.toLowerCase()}`,
    toastNaoRepete: "Não repete mais",
    repeticao: {
      naoRepete: "Não repete",
      diariamente: "Diariamente",
      semanalmente: "Semanalmente",
      mensalmente: "Mensalmente",
      anualmente: "Anualmente",
      aCadaNDias: (dias) => `A cada ${dias} ${dias === 1 ? "dia" : "dias"}`,
      aCadaNDiasVazio: "A cada N dias…",
    },
    prioridades: { low: "Baixa", medium: "Média", high: "Alta", urgent: "Urgente" },
    cartao: {
      concluir: "Concluir tarefa",
      marcarPendente: "Marcar como pendente",
      favoritar: "Adicionar aos favoritos",
      desfavoritar: "Remover dos favoritos",
      editar: "Editar",
      excluir: "Excluir",
      repetir: "Repetir",
      atrasada: "Atrasada",
      faltamMinutos: (n) => `faltam ${n} min`,
      faltamHoras: (n) => `faltam ${n} h`,
      faltamDias: (n) => `${n === 1 ? "falta" : "faltam"} ${n} ${n === 1 ? "dia" : "dias"}`,
      entrar: "Entrar",
      copiarLinkReuniao: "Copiar link da reunião",
      toastLinkReuniao: "Link da reunião copiado!",
      emAndamento: "Em andamento",
      iniciar: "Iniciar",
    },
    dialogo: {
      editarTitulo: "Editar tarefa",
      novaTitulo: "Nova tarefa",
      tituloPlaceholder: "O que precisa ser feito?",
      descricaoPlaceholder: "Descrição (opcional)",
      prioridade: "Prioridade",
      tempoEstimado: "Tempo estimado",
      personalizarTempo: "Personalizar",
      vencimento: "Vencimento",
      semData: "Sem data",
      hoje: "Hoje",
      amanha: "Amanhã",
      emNDias: (n) => `em ${n} ${n === 1 ? "dia" : "dias"}`,
      emXDias: "Em X dias",
      data: "Data",
      reuniao: "Reunião",
      opcional: "Opcional",
      linkPlaceholder: "Cole o link — Meet, Zoom, Teams…",
      copiarLink: "Copiar link",
      toastLinkCopiado: "Link copiado!",
      horario: "Horário",
      horarioDoCompromisso: "Horário do compromisso",
      escolher: "Escolher",
      limpar: "limpar",
      semDataVale: (hora) => `Sem data escolhida — vale para hoje às ${hora}.`,
      localPlaceholder: "Local — sala, endereço…",
      adicionarLocal: "Adicionar local (presencial)",
      repetir: "Repetir",
      personalizado: "Personalizado",
      aCadaNDias: (dias) => `a cada ${dias} ${dias === 1 ? "dia" : "dias"}`,
      avancaSozinho: "Ao concluir, o prazo avança automaticamente para a próxima ocorrência.",
      precisaLogin: "Você precisa estar logado",
    },
  },
  favoritos: {
    vazio: "Nada favoritado ainda. Toque na ⭐ de uma tarefa ou nota para vê-la aqui.",
    tarefas: (n) => `Tarefas (${n})`,
    notas: (n) => `Notas (${n})`,
    verTodas: "Ver todas",
    remover: "Remover dos favoritos",
    notaSemTitulo: "Sem título",
    notaVazia: "Vazia",
  },
  notas: {
    nova: "Nova nota",
    vazio: "Nenhuma nota ainda. Clique em §Nova nota§ para começar a escrever.",
    semTitulo: "Sem título",
    vazia: "Vazia",
    tituloPlaceholder: "Título",
    escrevaAqui: "Comece a escrever...",
    selecione: "Selecione uma nota ou crie uma nova.",
    salvando: "Salvando…",
    salvo: "Salvo",
    favoritar: "Adicionar aos favoritos",
    desfavoritar: "Remover dos favoritos",
    excluir: "Excluir nota",
    corDaNota: "Cor da nota",
    semCor: "Sem cor",
    cores: {
      ambar: "Âmbar",
      coral: "Coral",
      rosa: "Rosa",
      violeta: "Violeta",
      azul: "Azul",
      verde: "Verde",
    },
    erroSemColunaCor:
      "A tabela de notas ainda não tem a coluna de cor. Rode supabase/notas_cor.sql no Supabase.",
    erroSalvarCor: "Não consegui salvar a cor agora.",
    editor: {
      desfazer: "Desfazer (Ctrl+Z)",
      refazer: "Refazer (Ctrl+Y)",
      negrito: "Negrito",
      italico: "Itálico",
      sublinhado: "Sublinhado",
      tamanhos: { pequeno: "P", medio: "M", grande: "G" },
      tamanhoDica: (letra) => `Tamanho ${letra}`,
      titulo: "Título",
      lista: "Lista",
      listaNumerada: "Lista numerada",
      cores: "Cores",
      corDoTexto: "Cor do texto",
      fundoMarcaTexto: "Fundo (marca-texto)",
      corPadrao: "Padrão",
      semFundo: "Sem fundo",
      paleta: {
        vermelho: "Vermelho",
        laranja: "Laranja",
        amarelo: "Amarelo",
        verde: "Verde",
        azul: "Azul",
        roxo: "Roxo",
        rosa: "Rosa",
      },
      imagem: "Imagem",
      diminuir: "Diminuir",
      aumentar: "Aumentar",
      concluir: "Concluir",
    },
  },
}

export const en: Dicionario = {
  calendario: {
    novoBloco: "New block",
    hoje: "Today",
    visoes: { dia: "day", semana: "week", mes: "month", ano: "year" },
    diasDaSemana: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
    dispensarAviso: "Dismiss warning",
    abrirODia: "Open this day",
    recolherPainel: "Collapse panel",
    expandirPainel: "Expand panel",
    painelContextual: "Context panel",
    avisos: {
      telaAntesDeDormir: (titulo, horaDeDormir) =>
        `"${titulo}" ends shortly before bedtime (${horaDeDormir}). Screens close to sleep get in the way of resting — how about wrapping up earlier?`,
      sonoCurto: (inicio, fim, horas, desejadas) =>
        `Your sleep block (${inicio}–${fim}) is only ${horas} — below the ${desejadas} you want to sleep.`,
      vaoAntesDoSono: (titulo, fim, tituloSeguinte, inicio, horas, desejadas) =>
        `Between "${titulo}" (ending ${fim}) and "${tituloSeguinte}" (at ${inicio}) there are only ${horas} — less than your ${desejadas} of sleep.`,
      horas: (h) => `${Math.round(h * 10) / 10}h`,
    },
    notas: {
      salvando: "Saving…",
      salvo: "Saved",
      placeholder: "For the AI to read: today's thoughts… How has your focus been? Any loose ideas?",
    },
    lembretes: {
      titulo: "Reminders for the day",
      adicionar: "Add reminder",
      placeholder: "Add a reminder...",
      definirHorario: "Set a time",
      horarioNotificacao: "Time (notification)",
      remover: "Remove reminder",
      vazio: "No reminders yet.",
    },
    bloco: {
      novoTitulo: "New time block",
      editarTitulo: "Edit block",
      novoSubtitulo: "Schedule a new focus block",
      editarSubtitulo: "Update the block details",
      titulo: "Title",
      tituloPlaceholder: "E.g. Deep work",
      descricao: "Description",
      descricaoPlaceholder: "Optional details...",
      inicio: "Start",
      fim: "End",
      horarioDeInicio: "Start time",
      horarioDeFim: "End time",
      data: "Date",
      cor: "Colour",
      vincularTarefa: "Link a task",
      nenhumaTarefa: "None",
      vincularAjuda: "Links this block to a task on your list — the block becomes the time to do it.",
      repetir: "Repeat",
      diasUteis: "Weekdays (Mon–Fri)",
      excluir: "Delete block",
      excluirAtalho: "Delete block (Backspace)",
      cancelar: "Cancel",
      salvar: "Save",
      criar: "Create block",
      salvando: "Saving...",
      precisaLogin: "You need to be signed in",
    },
  },
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
      regioes: { BR: "Brazil", US: "United States" },
      regiaoAjuda:
        "Sets how times are shown and which language the app speaks. Translation is under way — friends, the Office and Neuro IA are still to come.",
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
      importar: "Import",
      importarDescricao: "Bring your schedule in from an .ics file (Google Calendar, Outlook…)",
      exportar: "Export",
      exportarDescricao: "Download your blocks as .ics to use in another calendar",
      nadaParaExportar: "No blocks to export yet.",
      toastExportado: (n) => `${n} ${n === 1 ? "block" : "blocks"} exported (.ics)`,
      dialogo: {
        titulo: "Import a calendar (.ics)",
        escolherArquivo: "Choose an .ics file",
        ondeAchar:
          "In Google Calendar: Settings → Import & export → §Export§ (it downloads a .zip with the .ics inside).",
        semEventos: "I found no events in that file. Export your calendar as .ics first.",
        erroLeitura: "I couldn't read the file.",
        precisaLogin: "You need to be signed in.",
        marcarTodos: "Select all",
        desmarcarTodos: "Clear all",
        resumo: (total, duplicados) =>
          `${total} ${total === 1 ? "event" : "events"} · ${duplicados > 0 ? `${duplicados} already here · ` : ""}pick what to create`,
        jaExiste: "already here",
        diaInteiro: "all day",
        repeticaoDiasUteis: "Weekdays",
        cancelar: "Cancel",
        importar: "Import",
        importarN: (n) => `Import ${n}`,
        toastImportado: (n) => `${n} ${n === 1 ? "event" : "events"} imported! 📅`,
      },
    },
    assinar: {
      titulo: "Subscribe on Google/Outlook",
      descricao: "A link that shows your blocks in your usual calendar, updating on its own",
      explicacao:
        "Subscribe to your schedule in Google Calendar, Outlook and others: they read this link and show your blocks, refreshing on their own. It is read-only — nobody edits your schedule from there.",
      carregando: "Loading…",
      copiar: "Copy",
      gerar: "Generate subscription link",
      gerarNovo: "Generate a new link (the old one stops working)",
      ondeColar:
        "In Google Calendar: §Other calendars → Add → From URL§, paste the link. Their end can take hours to refresh — Google resamples whenever it likes.",
      toastPronto: "Subscription link ready! 📆",
      toastCopiado: 'Link copied! Paste it into your calendar, under "subscribe from URL".',
      erroCopiar: "I could not copy it — select the link and copy it by hand.",
      erroSemTabela: "The feed table does not exist yet. Run supabase/calendar_feed.sql on Supabase.",
      erroCacheSchema:
        "The table exists, but the Supabase API cannot see it yet (schema cache). Wait a few seconds and reload.",
      erroPermissao: "No permission (RLS). Check that the calendar_feed.sql policies were created.",
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
  tarefas: {
    nova: "New task",
    criar: "Create task",
    salvar: "Save",
    cancelar: "Cancel",
    vazio: "No tasks here yet. How about adding one?",
    listaGeral: "General",
    listaOutras: "Other",
    novaLista: "New list",
    nomeDaLista: "List name",
    excluirLista: "Delete list",
    escopos: { hoje: "Today", proximos: "Upcoming", todos: "All" },
    vazioHoje: "Nothing for today. 🎉",
    vazioProximos: "Nothing in the coming days.",
    vazioTodos: "No tasks.",
    concluidas: (n) => `Completed (${n})`,
    erroSemTabelaListas:
      "The lists table doesn't exist yet. Run supabase/task_lists.sql in Supabase.",
    erroExcluir: "I couldn't delete the task.",
    erroRepeticao: "I couldn't change the repeat right now.",
    toastRecorrente: "Recurring task completed! 🔁",
    toastRecorrenteDetalhe: (data) => `Next occurrence: ${data}`,
    toastSemXp: "Completed — no XP this time 😉",
    toastSemXpDetalhe: (minutos) => `Tasks created less than ${minutos} min ago don't earn XP.`,
    toastRepete: (rotulo) => `Repeats ${rotulo.toLowerCase()}`,
    toastNaoRepete: "Doesn't repeat anymore",
    repeticao: {
      naoRepete: "Doesn't repeat",
      diariamente: "Daily",
      semanalmente: "Weekly",
      mensalmente: "Monthly",
      anualmente: "Yearly",
      aCadaNDias: (dias) => `Every ${dias} ${dias === 1 ? "day" : "days"}`,
      aCadaNDiasVazio: "Every N days…",
    },
    prioridades: { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" },
    cartao: {
      concluir: "Complete task",
      marcarPendente: "Mark as pending",
      favoritar: "Add to favorites",
      desfavoritar: "Remove from favorites",
      editar: "Edit",
      excluir: "Delete",
      repetir: "Repeat",
      atrasada: "Overdue",
      faltamMinutos: (n) => `${n} min left`,
      faltamHoras: (n) => `${n} h left`,
      faltamDias: (n) => `${n} ${n === 1 ? "day" : "days"} left`,
      entrar: "Join",
      copiarLinkReuniao: "Copy meeting link",
      toastLinkReuniao: "Meeting link copied!",
      emAndamento: "In progress",
      iniciar: "Start",
    },
    dialogo: {
      editarTitulo: "Edit task",
      novaTitulo: "New task",
      tituloPlaceholder: "What needs to be done?",
      descricaoPlaceholder: "Description (optional)",
      prioridade: "Priority",
      tempoEstimado: "Estimated time",
      personalizarTempo: "Custom",
      vencimento: "Due",
      semData: "No date",
      hoje: "Today",
      amanha: "Tomorrow",
      emNDias: (n) => `in ${n} ${n === 1 ? "day" : "days"}`,
      emXDias: "In X days",
      data: "Date",
      reuniao: "Meeting",
      opcional: "Optional",
      linkPlaceholder: "Paste the link — Meet, Zoom, Teams…",
      copiarLink: "Copy link",
      toastLinkCopiado: "Link copied!",
      horario: "Time",
      horarioDoCompromisso: "Meeting time",
      escolher: "Pick",
      limpar: "clear",
      semDataVale: (hora) => `No date chosen — it applies to today at ${hora}.`,
      localPlaceholder: "Place — room, address…",
      adicionarLocal: "Add a place (in person)",
      repetir: "Repeat",
      personalizado: "Custom",
      aCadaNDias: (dias) => `every ${dias} ${dias === 1 ? "day" : "days"}`,
      avancaSozinho: "On completion, the due date moves to the next occurrence by itself.",
      precisaLogin: "You need to be signed in",
    },
  },
  favoritos: {
    vazio: "Nothing favorited yet. Tap the ⭐ on a task or note to see it here.",
    tarefas: (n) => `Tasks (${n})`,
    notas: (n) => `Notes (${n})`,
    verTodas: "See all",
    remover: "Remove from favorites",
    notaSemTitulo: "Untitled",
    notaVazia: "Empty",
  },
  notas: {
    nova: "New note",
    vazio: "No notes yet. Click §New note§ to start writing.",
    semTitulo: "Untitled",
    vazia: "Empty",
    tituloPlaceholder: "Title",
    escrevaAqui: "Start writing...",
    selecione: "Pick a note, or create a new one.",
    salvando: "Saving…",
    salvo: "Saved",
    favoritar: "Add to favorites",
    desfavoritar: "Remove from favorites",
    excluir: "Delete note",
    corDaNota: "Note color",
    semCor: "No color",
    cores: {
      ambar: "Amber",
      coral: "Coral",
      rosa: "Pink",
      violeta: "Violet",
      azul: "Blue",
      verde: "Green",
    },
    erroSemColunaCor:
      "The notes table has no color column yet. Run supabase/notas_cor.sql in Supabase.",
    erroSalvarCor: "I couldn't save the color right now.",
    editor: {
      desfazer: "Undo (Ctrl+Z)",
      refazer: "Redo (Ctrl+Y)",
      negrito: "Bold",
      italico: "Italic",
      sublinhado: "Underline",
      tamanhos: { pequeno: "S", medio: "M", grande: "L" },
      tamanhoDica: (letra) => `Size ${letra}`,
      titulo: "Heading",
      lista: "List",
      listaNumerada: "Numbered list",
      cores: "Colors",
      corDoTexto: "Text color",
      fundoMarcaTexto: "Background (highlight)",
      corPadrao: "Default",
      semFundo: "No background",
      paleta: {
        vermelho: "Red",
        laranja: "Orange",
        amarelo: "Yellow",
        verde: "Green",
        azul: "Blue",
        roxo: "Purple",
        rosa: "Pink",
      },
      imagem: "Image",
      diminuir: "Smaller",
      aumentar: "Bigger",
      concluir: "Done",
    },
  },
}

const DICIONARIOS: Record<Idioma, Dicionario> = { pt, en }

export function dicionario(idioma: Idioma): Dicionario {
  return DICIONARIOS[idioma] ?? DICIONARIOS[IDIOMA_DEFAULT]
}

/**
 * Uma repetição virando texto. Mora aqui, e não em lib/task-recurrence, porque
 * é a única metade da repetição que depende do idioma — o módulo de datas
 * decide QUAL repetição é, este decide como ela se diz.
 */
export function textoDaRepeticao(d: Dicionario, r: Repeticao): string {
  return r.chave === "aCadaNDias"
    ? d.tarefas.repeticao.aCadaNDias(r.dias ?? 1)
    : d.tarefas.repeticao[r.chave]
}

/**
 * As iniciais dos sete dias, começando no domingo — o cabeçalho do calendário
 * de escolher data.
 *
 * Sai do `Intl` em vez de uma lista escrita à mão porque a lista à mão estava
 * ERRADA em qualquer idioma que não o português: `["D","S","T","Q","Q","S","S"]`
 * é uma constante que ninguém lembraria de traduzir. Em pt-BR o Intl devolve
 * exatamente essas sete letras; em en-US, "S M T W T F S".
 *
 * O 4 de junho de 2023 é um domingo, e é só disso que a conta precisa.
 */
export function iniciaisDaSemana(locale: string): string[] {
  const domingo = new Date(2023, 5, 4)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(domingo)
    d.setDate(domingo.getDate() + i)
    return d.toLocaleDateString(locale, { weekday: "narrow" })
  })
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
