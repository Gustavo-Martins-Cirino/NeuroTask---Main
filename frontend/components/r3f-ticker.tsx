"use client"

import { useEffect, useRef } from "react"
import { useThree } from "@react-three/fiber"
import gsap from "gsap"
import { relogioNovo, proximoQuadro, tickerSumiu } from "@/lib/frame-clock"

/**
 * Faz um `<Canvas>` desenhar a partir do ticker do GSAP — o mesmo relógio que
 * já puxa o Lenis (`TickerUnico`, em components/smooth-scroll.tsx). Sem isto
 * cada Canvas abre o próprio requestAnimationFrame, e dois loops medindo o
 * tempo por conta própria saem de fase: a cena anda num compasso enquanto a
 * página rola em outro.
 *
 * Vai DENTRO do Canvas que ele conduz, e o pai precisa passar
 * `frameloop="never"`. O `advance` vem do estado da raiz do R3F, então é o
 * advance DESTA raiz — não encosta em nenhum outro canvas da página.
 *
 * Uso:
 *   const [socorro, setSocorro] = useState(false)
 *   const socorrer = useCallback(() => setSocorro(true), [])
 *   <Canvas frameloop={socorro && naTela ? "always" : "never"}>
 *     {!socorro && <TickerDoGsap ativo={naTela} onSocorro={socorrer} />}
 */
export function TickerDoGsap({
  ativo,
  onSocorro,
}: {
  /** Falso com a cena fora da tela: o ticker segue, quem não desenha é ela. */
  ativo: boolean
  /**
   * Chamado quando os quadros param de chegar. Quem monta deve reagir voltando
   * o Canvas para `frameloop="always"` e desmontando este componente.
   */
  onSocorro: () => void
}) {
  const advance = useThree((s) => s.advance)
  const clock = useThree((s) => s.clock)
  // O quadro chega entre um render e outro do React; o callback do ticker só
  // enxerga o ref.
  const ativoRef = useRef(ativo)
  const ultimoQuadroRef = useRef(0)

  useEffect(() => {
    ativoRef.current = ativo
    // Cena voltando à tela: o último quadro é de minutos atrás, e sem zerar
    // aqui o vigia acusaria pane no vão até o primeiro quadro novo.
    if (ativo) ultimoQuadroRef.current = performance.now()
  }, [ativo])

  useEffect(() => {
    let relogio = relogioNovo(clock.elapsedTime)

    // O ticker entrega segundos, a mesma unidade que o advance() espera em
    // frameloop="never" — mas o tempo não vai cru; o porquê está em frame-clock.
    const tick = (tempo: number) => {
      if (!ativoRef.current) return
      relogio = proximoQuadro(relogio, tempo)
      ultimoQuadroRef.current = performance.now()
      advance(relogio.tempo)
    }

    // add() acorda o ticker, e com mais de um ouvinte ele não volta a dormir.
    gsap.ticker.add(tick)

    // O vigia. Um Canvas em "never" depende INTEIRAMENTE de alguém chamar
    // advance(): se esse alguém sumir, a cena não fica lenta, ela congela — e
    // nada na tela explica o porquê. O ticker é do GSAP, não do app, e dorme
    // sozinho quando não há tween ativo e há menos de dois ouvintes. Enquanto
    // estivermos inscritos isso não deveria acontecer, mas "não deveria" é
    // fraco demais para uma tela que some.
    const vigia = setInterval(() => {
      if (tickerSumiu(ativoRef.current, performance.now() - ultimoQuadroRef.current)) onSocorro()
    }, 500)

    return () => {
      gsap.ticker.remove(tick)
      clearInterval(vigia)
    }
  }, [advance, clock, onSocorro])

  return null
}
