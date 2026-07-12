import { createClient } from "@/lib/supabase/client"

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

// Retorna null em caso de sucesso; senão, a mensagem de erro
export async function enablePush(): Promise<string | null> {
  if (!pushSupported()) {
    return "Este navegador não suporta notificações push. No iPhone, adicione o app à tela de início primeiro."
  }
  const perm = await Notification.requestPermission()
  if (perm !== "granted") return "Permissão de notificações negada no navegador."

  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!key) return "Chave de push não configurada no servidor."

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
    if (!json.keys?.p256dh || !json.keys?.auth) return "Inscrição de push inválida."

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return "Você precisa estar logado."

    const { error } = await supabase.from("push_subscriptions").upsert(
      { user_id: user.id, endpoint: sub.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
      { onConflict: "endpoint" }
    )
    return error?.message ?? null
  } catch (e) {
    return e instanceof Error ? e.message : "Falha ao ativar as notificações."
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
