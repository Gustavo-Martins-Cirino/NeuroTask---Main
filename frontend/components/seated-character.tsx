"use client"

import { useEffect, useMemo } from "react"
import { useGLTF, useFBX } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js"
import { AnimationMixer, Box3, Color, Mesh, MeshStandardMaterial, Vector3, type AnimationClip, type Material, type Object3D } from "three"

// ─────────────────────────────────────────────────────────────────────────
// Personagem sentado 3D. Modelo dirigido por prop (modelUrl) → skins/amigos
// como dados. Aceita .fbx (Mixamo, com animação) e .glb (RPM, ou Mixamo
// convertido). A animação de sentar (Mixamo) é retargetada por NOME-BASE de
// osso, então funciona tanto no rig "mixamorig9…" quanto no "Hips…" do RPM.
// ─────────────────────────────────────────────────────────────────────────

/** Modelo padrão (humano texturizado, GLB convertido do Mixamo). */
export const DEFAULT_MODEL_URL = "/models/human.glb"

/** Fonte da animação de sentar (Mixamo) — reaproveitada por retarget quando o
 *  modelo não traz animação própria (RPM, ou GLB exportado sem anim). */
export const ANIM_SOURCE_URL = "/models/seated-character.fbx"

/** Se o modelo tiver um clip com este nome, usa-o; senão o de MAIOR duração. */
const CLIP_NAME = "Sitting"

/** Altura-alvo do personagem em pé, em unidades da CENA (mesa em z=37 ≈ 75cm).
 *  Auto-escala qualquer modelo para caber; não depende de cm vs metros. */
const TARGET_HEIGHT = 10.8
/** Altura nativa de referência do clip Mixamo (cm) para reescalar a posição. */
const CLIP_NATIVE_HEIGHT = 180

const BASE_POSITION: [number, number, number] = [0, 0, 0.25]
const BASE_ROTATION: [number, number, number] = [0, 0, 0]

/** Offset no assento por modelo de cadeira. Com a cadeira GLB (office-chair)
 *  o assento fica em ~3.7 un, então o corpo sobe ~1.0 pra pousar nele. Todas as
 *  cadeiras da loja são a MESMA malha (só muda a cor), logo o offset é único. */
export const offsetPorCadeira: Record<
  string,
  { position?: [number, number, number]; rotation?: [number, number, number] }
> = {
  padrao: { position: [0, 1.0, 0.1] },
  "cadeira-ergonomica": { position: [0, 1.0, 0.1] },
  "cadeira-gamer": { position: [0, 1.0, 0.1] },
}

interface SeatedCharacterProps {
  modelUrl?: string
  chairId?: string
  /** Recolore o corpo se o material NÃO tiver textura (manequim). */
  tint?: string
  onClick?: () => void
}

// Nome-base do osso, sem o prefixo Mixamo ("mixamorig9Hips" → "Hips";
// "mixamorig:Spine" → "Spine"; "Hips" do RPM continua "Hips").
const stripBone = (n: string) => n.replace(/^mixamorig\d*:?/, "")

// Retargeta um clip Mixamo para os ossos DESTE modelo (por nome-base) e
// reescala as faixas de posição para as unidades do modelo.
function retargetClip(clip: AnimationClip, model: Object3D, posScale: number): AnimationClip {
  const map: Record<string, string> = {}
  model.traverse((o) => {
    if ((o as { isBone?: boolean }).isBone) map[stripBone(o.name)] = o.name
  })
  const c = clip.clone()
  for (const track of c.tracks) {
    const dot = track.name.indexOf(".")
    const node = dot < 0 ? track.name : track.name.slice(0, dot)
    const prop = dot < 0 ? "" : track.name.slice(dot)
    const target = map[stripBone(node)]
    if (target) track.name = target + prop
    if (prop === ".position" && posScale !== 1) {
      for (let i = 0; i < track.values.length; i++) track.values[i] *= posScale
    }
  }
  return c
}

function applyTint(root: Object3D, tint?: string) {
  if (!tint) return
  const base = new Color(tint)
  root.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    const recolor = (mat: Material): Material => {
      const m = mat as MeshStandardMaterial
      if (m.map) return mat
      const c = m.clone() as MeshStandardMaterial
      const orig = m.color
      const lum = orig ? 0.3 * orig.r + 0.59 * orig.g + 0.11 * orig.b : 0.6
      c.color = base.clone().multiplyScalar(0.55 + lum * 0.9)
      return c
    }
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(recolor) : recolor(mesh.material)
  })
}

// Prepara o modelo: clona (esqueleto), aplica tint e calcula a auto-escala +
// o fator de posição da animação a partir da altura nativa (bind pose).
function usePreparedModel(source: Object3D, tint?: string) {
  return useMemo(() => {
    const model = cloneSkeleton(source)
    applyTint(model, tint)
    model.traverse((o) => {
      const mesh = o as Mesh
      if (mesh.isMesh) mesh.castShadow = true
    })
    const nativeH = new Box3().setFromObject(model).getSize(new Vector3()).y || CLIP_NATIVE_HEIGHT
    const scale = TARGET_HEIGHT / nativeH
    const posScale = nativeH / CLIP_NATIVE_HEIGHT
    return { model, scale, posScale }
  }, [source, tint])
}

// Escolhe o clip de sentar: o de nome CLIP_NAME, senão o de MAIOR duração.
function pickSeatedClip(clips: AnimationClip[]): AnimationClip | undefined {
  return clips.find((c) => c.name === CLIP_NAME) ?? clips.slice().sort((a, b) => b.duration - a.duration)[0]
}

// Toca o clip com um AnimationMixer PRÓPRIO, avançado a cada frame por useFrame.
// Mais robusto que o useAnimations do drei: ao trocar de skin (remount), o mixer
// é recriado e a animação SEMPRE começa — some o T-pose que exigia refresh.
function useSeatedMixer(model: Object3D, clip: AnimationClip | undefined) {
  const mixer = useMemo(() => new AnimationMixer(model), [model])
  useEffect(() => {
    if (!clip) return
    const action = mixer.clipAction(clip)
    action.reset().play()
    return () => {
      action.stop()
      mixer.uncacheClip(clip)
    }
  }, [mixer, clip])
  useFrame((_, delta) => mixer.update(delta))
}

type BodyProps = { url: string; position: [number, number, number]; rotation: [number, number, number]; tint?: string; onClick?: () => void }

function FbxBody({ url, position, rotation, tint, onClick }: BodyProps) {
  const fbx = useFBX(url)
  const { model, scale } = usePreparedModel(fbx, tint)
  const clip = useMemo(() => pickSeatedClip(fbx.animations), [fbx]) // FBX Mixamo já traz a animação
  useSeatedMixer(model, clip)
  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <primitive object={model} />
    </group>
  )
}

function GlbBody({ url, position, rotation, tint, onClick }: BodyProps) {
  // "/draco/" = decoder auto-hospedado (o human.glb é comprimido com Draco).
  const { scene, animations } = useGLTF(url, "/draco/")
  const animSrc = useFBX(ANIM_SOURCE_URL) // fonte da animação de sentar
  const { model, scale, posScale } = usePreparedModel(scene, tint)
  const clip = useMemo(() => {
    if (animations && animations.length) return pickSeatedClip(animations) // glb já animado
    const src = pickSeatedClip(animSrc.animations)
    return src ? retargetClip(src, model, posScale) : undefined
  }, [animations, animSrc, model, posScale])
  useSeatedMixer(model, clip)
  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <primitive object={model} />
    </group>
  )
}

export function SeatedCharacter({ modelUrl = DEFAULT_MODEL_URL, chairId = "padrao", tint, onClick }: SeatedCharacterProps) {
  const off = offsetPorCadeira[chairId] ?? offsetPorCadeira.padrao
  const shared = { url: modelUrl, position: off.position ?? BASE_POSITION, rotation: off.rotation ?? BASE_ROTATION, tint, onClick }
  return modelUrl.toLowerCase().endsWith(".fbx") ? <FbxBody {...shared} /> : <GlbBody {...shared} />
}

useGLTF.preload(DEFAULT_MODEL_URL, "/draco/")
useFBX.preload(ANIM_SOURCE_URL)
