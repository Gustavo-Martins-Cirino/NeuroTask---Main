import { createClient } from "@/lib/supabase/client"
import { falhaDaExcecao, type Falha } from "@/lib/falha"

// Notificações push (funcionam com o app fechado).
// Inscreve este dispositivo e salva a inscrição no Supabase; o servidor
// (api/push/dispatch, acionado pelo pg_cron) envia os pushes na hora certa.

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window
}

export async function getPushStatus(): Promise<boolean> {
  if (!pushSupported()) return false
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    return !!sub && Notification.permission === "granted"
  } catch {
    return false
  }
}

/**
 * Por que ativar não deu certo, como id — `null` quando deu.
 *
 * `semChave` e `semSuporte` não são a mesma coisa para quem lê: um é o servidor
 * que não foi configurado (e só eu conserto), o outro é o aparelho da pessoa
 * (e ela conserta, adicionando o app à tela de início no iPhone).
 */
export type MotivoDePush =
  | "semSuporte"
  | "permissaoNegada"
  | "semChave"
  | "inscricaoInvalida"
  | "precisaLogin"

export async function enablePush(): Promise<Falha<MotivoDePush> | null> {
  if (!pushSupported()) return { motivo: "semSuporte" }
  const perm = await Notification.requestPermission()
  if (perm !== "granted") return { motivo: "permissaoNegada" }

  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!key) return { motivo: "semChave" }

  try {
    const reg = await navigator.serviceWorker.register("/sw.js")
    await navigator.serviceWorker.ready
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      }))

    const json = sub.toJSON()
    if (!json.keys?.p256dh || !json.keys?.auth) return { motivo: "inscricaoInvalida" }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { motivo: "precisaLogin" }

    // O fuso vai junto: quem sabe onde este aparelho está é ele mesmo. O
    // servidor roda em UTC e os lembretes são hora de parede sem fuso, então
    // sem isto ele teria que chutar o país de todo mundo (ver push_tz.sql).
    // Reinscrever atualiza o valor — é o que conserta o fuso de quem mudou de
    // país, já que o upsert casa pelo endpoint.
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        tz_offset_min: new Date().getTimezoneOffset(),
      },
      { onConflict: "endpoint" }
    )
    return error ? { motivo: "desconhecido", cru: error.message } : null
  } catch (e) {
    return falhaDaExcecao(e)
  }
}

export async function disablePush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      const supabase = createClient()
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
      await sub.unsubscribe()
    }
  } catch {
    /* ignora */
  }
}
