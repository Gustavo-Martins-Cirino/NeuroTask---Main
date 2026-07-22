"use client"

import { useEffect, useMemo, useRef } from "react"
import { useGLTF, useAnimations } from "@react-three/drei"
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js"
import type { Group } from "three"

// ─────────────────────────────────────────────────────────────────────────
// AJUSTE FINO — mexa só aqui para posicionar o personagem no assento.
// (auditoria da cena: o assento fica em y≈2.75 no espaço LOCAL do grupo-pai
//  da cadeira; a cadeira olha para -Z, direção da mesa/monitores.)
// ─────────────────────────────────────────────────────────────────────────

/** Caminho padrão do modelo. Vira prop `modelUrl` → cada usuário/amigo pode
 *  ter um avatar diferente só trocando esta string (skins como dados). */
export const DEFAULT_MODEL_URL = "/models/seated-character.glb"

/** Nome do clip de animação sentado. Se não existir no .glb, cai no 1º clip. */
const CLIP_NAME = "Sitting" // tente também "SittingIdle" / "Seated Idle"

/** Offset BASE do personagem sobre o assento (espaço local do grupo da cadeira).
 *  Como o personagem é filho do MESMO grupo-pai da cadeira, ele já herda a
 *  rotação para a mesa — a rotação abaixo é só um ajuste fino relativo. */
const BASE_POSITION: [number, number, number] = [0, 0, 0.3]
const BASE_ROTATION: [number, number, number] = [0, 0, 0]
const BASE_SCALE = 7 // .glb costuma vir em metros (~1.7 em pé); ~7 encaixa aqui

/** O topo do assento muda por modelo de cadeira comprado na loja. Este mapa
 *  reposiciona o personagem no assento de cada cadeira. Chaves = ids da loja. */
export const offsetPorCadeira: Record<
  string,
  { position?: [number, number, number]; rotation?: [number, number, number]; scale?: number }
> = {
  padrao: { position: [0, 0, 0.3], scale: 7 },
  "cadeira-ergonomica": { position: [0, 0, 0.3], scale: 7 },
  "cadeira-gamer": { position: [0, 0.25, 0.35], scale: 7.2 },
}

interface SeatedCharacterProps {
  /** URL do .glb rigado. Troque por avatar do usuário/amigo. */
  modelUrl?: string
  /** id da cadeira equipada (loja) → escolhe o offset do assento. */
  chairId?: string
  onClick?: () => void
}

export function SeatedCharacter({
  modelUrl = DEFAULT_MODEL_URL,
  chairId = "padrao",
  onClick,
}: SeatedCharacterProps) {
  const ref = useRef<Group>(null)
  const { scene, animations } = useGLTF(modelUrl)

  // Clona a cena (com o esqueleto) para permitir VÁRIAS instâncias — amigos /
  // skins diferentes na mesma tela — cada uma com sua própria animação.
  const model = useMemo(() => cloneSkeleton(scene), [scene])
  const { actions, names } = useAnimations(animations, ref)

  useEffect(() => {
    const action = actions[CLIP_NAME] ?? (names.length ? actions[names[0]] : undefined)
    action?.reset().fadeIn(0.3).play()
    return () => {
      action?.fadeOut(0.2)
    }
  }, [actions, names])

  const off = offsetPorCadeira[chairId] ?? offsetPorCadeira.padrao
  const position = off.position ?? BASE_POSITION
  const rotation = off.rotation ?? BASE_ROTATION
  const scale = off.scale ?? BASE_SCALE

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <primitive object={model} />
    </group>
  )
}

// Pré-carrega o modelo padrão (drei faz cache por URL → reuso barato entre
// instâncias; skins com URLs diferentes carregam uma vez cada e ficam em cache).
useGLTF.preload(DEFAULT_MODEL_URL)
