// Hora do dia no Escritório 3D: a fase e a paleta da vista da janela.
//
// A cena já sabia a hora — `LIGHT` muda a luz-chave e o fundo conforme ela —,
// mas a cidade da janela era pintada uma vez só, no build. Resultado: às 9 da
// manhã a vista continuava anoitecida, com silhueta preta e janelinha acesa.
//
// Aqui está só a TABELA (puro, testável). Quem aplica é o buildEscritorio, que
// recebe a fase por opts — recolorir material na mão depois do build seria
// mexer em objeto compartilhado entre as instâncias da sala.

export type FaseDoDia = "dawn" | "day" | "dusk" | "night"

export function faseDaHora(h: number): FaseDoDia {
  if (h >= 5 && h < 8) return "dawn"
  if (h >= 8 && h < 17) return "day"
  if (h >= 17 && h < 19) return "dusk"
  return "night"
}

type V3 = [number, number, number]

export interface PaletaCidade {
  ceu: V3
  /** Emissivo do céu: de dia ele é a coisa mais clara do quadro; de noite, não. */
  ceuBrilho: number
  /** Cor no ALTO do céu. Céu de verdade não é chapado: escurece para cima e
   *  clareia no horizonte, e é essa diferença que faz ler como distância em vez
   *  de papel de parede. */
  ceuTopo: V3
  /** Nuvem que atravessa a janela. Opacidade 0 = céu limpo (à noite). */
  nuvem: V3
  nuvemOpacidade: number
  /** Fileira da frente — quanto mais escura, mais silhueta. */
  predioFrente: V3
  /** Fileira de trás: perspectiva atmosférica, sempre mais clara que a da frente. */
  predioTras: V3
  janela: V3
  /** 0 = janelas apagadas. De dia elas são vidro escuro no prédio claro, que é
   *  o que se vê de verdade — cidade com todas as luzes acesas ao meio-dia é o
   *  tipo de detalhe errado que denuncia a cena. */
  janelaBrilho: number
}

export const PALETA_CIDADE: Record<FaseDoDia, PaletaCidade> = {
  dawn: {
    ceu: [0.85, 0.73, 0.68], ceuBrilho: 0.3,
    ceuTopo: [0.42, 0.44, 0.68], nuvem: [1, 0.86, 0.82], nuvemOpacidade: 0.5,
    predioFrente: [0.26, 0.26, 0.32], predioTras: [0.58, 0.55, 0.58],
    janela: [1, 0.86, 0.56], janelaBrilho: 0.8,
  },
  day: {
    ceu: [0.62, 0.78, 0.93], ceuBrilho: 0.28,
    ceuTopo: [0.3, 0.55, 0.86], nuvem: [1, 1, 1], nuvemOpacidade: 0.62,
    predioFrente: [0.5, 0.53, 0.58], predioTras: [0.66, 0.72, 0.82],
    janela: [0.19, 0.24, 0.31], janelaBrilho: 0,
  },
  dusk: {
    ceu: [0.95, 0.62, 0.42], ceuBrilho: 0.32,
    ceuTopo: [0.3, 0.26, 0.5], nuvem: [1, 0.72, 0.6], nuvemOpacidade: 0.45,
    predioFrente: [0.15, 0.17, 0.24], predioTras: [0.44, 0.42, 0.5],
    janela: [1, 0.84, 0.5], janelaBrilho: 1.3,
  },
  night: {
    ceu: [0.09, 0.11, 0.22], ceuBrilho: 0.12,
    ceuTopo: [0.03, 0.04, 0.1], nuvem: [0.3, 0.32, 0.44], nuvemOpacidade: 0.22,
    predioFrente: [0.07, 0.08, 0.13], predioTras: [0.15, 0.17, 0.26],
    janela: [1, 0.85, 0.55], janelaBrilho: 1.4,
  },
}
