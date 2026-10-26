export interface PropsDaCena {
  /** 0 → 1 do quanto a sessão de foco já andou. */
  progresso: number
  /** Duração da sessão, em segundos. */
  duracao: number
  /** Textos que a cena mostra (só o Fôlego usa: "inspire" / "solte"). */
  textos: { inspire: string; solte: string }
}
