"use client"

import { useState } from "react"
import { SinapsesCpu } from "./sinapses-cpu"
import { SinapsesGpu } from "./sinapses-gpu"
import type { PropsDaCena } from "./tipos"

// Sinapses (600 moedas): uma rede que se liga sozinha, como neurônios — o
// Physarum, o modelo do mofo limoso. A versão principal roda na placa de vídeo,
// na resolução da tela; sem WebGL2 com textura de ponto flutuante como alvo
// (ou se a placa recusar no meio do caminho), cai para a versão na CPU.

let naGpu: boolean | null = null

function temGpuParaARede(): boolean {
  if (naGpu !== null) return naGpu
  try {
    const gl = document.createElement("canvas").getContext("webgl2")
    naGpu = !!gl?.getExtension("EXT_color_buffer_float")
    gl?.getExtension("WEBGL_lose_context")?.loseContext()
  } catch {
    naGpu = false
  }
  return naGpu
}

export function Sinapses(props: PropsDaCena) {
  const [gpu, setGpu] = useState(temGpuParaARede)
  if (!gpu) return <SinapsesCpu {...props} />
  return (
    <SinapsesGpu
      {...props}
      aoFalhar={() => {
        naGpu = false
        setGpu(false)
      }}
    />
  )
}
