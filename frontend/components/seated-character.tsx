"use client"

import { useEffect, useMemo, useRef } from "react"
import { useGLTF, useFBX, useAnimations } from "@react-three/drei"
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js"
import { Color, Mesh, MeshStandardMaterial, type AnimationClip, type Group, type Material, type Object3D } from "three"

// ─────────────────────────────────────────────────────────────────────────
// AJUSTE FINO — mexa só aqui para posicionar o personagem no assento.
// Auditoria da cena: assento em y≈2.75 no espaço LOCAL do grupo-pai da
// cadeira; a cadeira olha para -Z (mesa/monitores). O personagem é filho do
// MESMO grupo-pai → herda a orientação. Valores abaixo validados por render
// com o FBX "Seated Idle" do Mixamo (~180 un de altura → escala 0.06).
// ─────────────────────────────────────────────────────────────────────────

/** Caminho padrão do modelo. Vira prop `modelUrl` → cada usuário/amigo pode
 *  ter um avatar diferente só trocando esta string (skins como dados).
 *  Aceita .fbx (Mixamo) e .glb (Ready Player Me / Sketchfab). */
export const DEFAULT_MODEL_URL = "/models/seated-character.fbx"

/** Nome do clip de sentar. Se não existir (ex.: Mixamo nomeia "mixamo.com"),
 *  cai automaticamente no clip de MAIOR duração. */
const CLIP_NAME = "Sitting"

// Offset BASE sobre o assento (a rotação é fina; a orientação vem do pai).
const BASE_POSITION: [number, number, number] = [0, 0, 0.25]
const BASE_ROTATION: [number, number, number] = [0, 0, 0]
const BASE_SCALE = 0.06 // Mixamo FBX vem em cm; para .glb (metros) use ~7

/** O topo do assento varia por modelo de cadeira comprado na loja; este mapa
 *  reposiciona o personagem no assento de cada uma. Chaves = ids da loja. */
export const offsetPorCadeira: Record<
  string,
  { position?: [number, number, number]; rotation?: [number, number, number]; scale?: number }
> = {
  padrao: { position: [0, 0, 0.25], scale: 0.06 },
  "cadeira-ergonomica": { position: [0, 0, 0.25], scale: 0.06 },
  "cadeira-gamer": { position: [0, 0.2, 0.3], scale: 0.062 },
}

interface SeatedCharacterProps {
  /** URL do modelo rigado (.fbx/.glb). Troque pelo avatar do usuário/amigo. */
  modelUrl?: string
  /** id da cadeira equipada (loja) → escolhe o offset do assento. */
  chairId?: string
  /** Recolore o CORPO do manequim (materiais SEM textura). Modelos texturizados
   *  (Ready Player Me etc.) são preservados — o tint só afeta cor sólida. */
  tint?: string
  onClick?: () => void
}

// Recolore materiais sem textura (o manequim Mixamo é cor sólida). Clona o
// material por instância para não vazar cor entre pessoas (amigos/skins) nem
// no cache do drei. Materiais texturizados ficam intactos.
function applyTint(root: Object3D, tint?: string) {
  if (!tint) return
  const base = new Color(tint)
  root.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    const recolor = (mat: Material): Material => {
      const m = mat as MeshStandardMaterial
      if (m.map) return mat // tem textura → não mexe
      const c = m.clone() as MeshStandardMaterial
      // preserva o claro/escuro original (juntas ficam mais escuras) tingindo
      const orig = m.color
      const lum = orig ? 0.3 * orig.r + 0.59 * orig.g + 0.11 * orig.b : 0.6
      c.color = base.clone().multiplyScalar(0.55 + lum * 0.9)
      return c
    }
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(recolor) : recolor(mesh.material)
  })
}

// Escolhe e toca o clip de sentar em loop (por nome, ou o de maior duração).
function usePlaySeated(root: Object3D, clips: AnimationClip[], ref: React.RefObject<Group | null>) {
  const { actions, names } = useAnimations(clips, ref)
  useEffect(() => {
    let action = CLIP_NAME ? actions[CLIP_NAME] : undefined
    if (!action) {
      const longest = clips.slice().sort((a, b) => b.duration - a.duration)[0]
      action = longest ? actions[longest.name] : names.length ? actions[names[0]] : undefined
    }
    action?.reset().fadeIn(0.3).play()
    return () => {
      action?.fadeOut(0.2)
    }
  }, [actions, names, clips])
}

type BodyProps = { url: string; position: [number, number, number]; rotation: [number, number, number]; scale: number; tint?: string; onClick?: () => void }

function FbxBody({ url, position, rotation, scale, tint, onClick }: BodyProps) {
  const ref = useRef<Group>(null)
  const fbx = useFBX(url)
  // clona (com esqueleto) → várias instâncias (amigos) com animação própria
  const model = useMemo(() => {
    const m = cloneSkeleton(fbx)
    applyTint(m, tint)
    return m
  }, [fbx, tint])
  usePlaySeated(model, fbx.animations, ref)
  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <primitive object={model} />
    </group>
  )
}

function GlbBody({ url, position, rotation, scale, tint, onClick }: BodyProps) {
  const ref = useRef<Group>(null)
  const { scene, animations } = useGLTF(url)
  const model = useMemo(() => {
    const m = cloneSkeleton(scene)
    applyTint(m, tint)
    return m
  }, [scene, tint])
  usePlaySeated(model, animations, ref)
  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <primitive object={model} />
    </group>
  )
}

export function SeatedCharacter({ modelUrl = DEFAULT_MODEL_URL, chairId = "padrao", tint, onClick }: SeatedCharacterProps) {
  const off = offsetPorCadeira[chairId] ?? offsetPorCadeira.padrao
  const shared = {
    url: modelUrl,
    position: off.position ?? BASE_POSITION,
    rotation: off.rotation ?? BASE_ROTATION,
    scale: off.scale ?? BASE_SCALE,
    tint,
    onClick,
  }
  return modelUrl.toLowerCase().endsWith(".fbx") ? <FbxBody {...shared} /> : <GlbBody {...shared} />
}

// Pré-carrega o modelo padrão (cache por URL no drei → reuso barato entre
// instâncias; skins com URLs diferentes carregam uma vez cada e ficam em cache).
if (DEFAULT_MODEL_URL.toLowerCase().endsWith(".fbx")) useFBX.preload(DEFAULT_MODEL_URL)
else useGLTF.preload(DEFAULT_MODEL_URL)
