const API_BASE = "https://neuro-task-main.vercel.app"
const TRACKED_DOMAINS = [
  "instagram.com", "tiktok.com", "twitter.com", "x.com",
  "facebook.com", "reddit.com", "youtube.com", "threads.net",
]
const SYNC_PERIOD_MIN = 10
// Sem duração real no chrome.history — só timestamps de visita. O intervalo até a
// próxima navegação (qualquer domínio) vira a estimativa de "tempo gasto" no
// domínio anterior. Acima disso não dá pra saber se a pessoa ficou ali ou saiu
// (aba esquecida aberta, PC ocioso) — não conta.
const MAX_GAP_MS = 30 * 60_000
// Primeira sincronização depois de instalar: não varre o histórico inteiro, só o último dia.
const MAX_LOOKBACK_MS = 24 * 60 * 60_000

function matchDomain(hostname) {
  return TRACKED_DOMAINS.find((d) => hostname === d || hostname.endsWith("." + d)) ?? null
}

function localDateKey(ms) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

async function hasHistoryPermission() {
  return chrome.permissions.contains({ permissions: ["history"] })
}

async function getToken() {
  const { token } = await chrome.storage.local.get("token")
  return token || null
}

// Todas as visitas (não só domínios rastreados) no período — o próximo evento de
// navegação, seja qual for o domínio, marca o fim da visita anterior.
async function collectVisits(startTime, endTime) {
  const items = await chrome.history.search({ text: "", startTime, endTime, maxResults: 10000 })
  const visits = []
  for (const item of items) {
    if (!item.url) continue
    let hostname
    try {
      hostname = new URL(item.url).hostname
    } catch {
      continue
    }
    const domain = matchDomain(hostname)
    const itemVisits = await chrome.history.getVisits({ url: item.url })
    for (const v of itemVisits) {
      if (v.visitTime >= startTime && v.visitTime < endTime) {
        visits.push({ time: v.visitTime, domain })
      }
    }
  }
  return visits.sort((a, b) => a.time - b.time)
}

// Pareia visitas consecutivas: o intervalo até a próxima vira "tempo gasto" na
// primeira, se o domínio dela é rastreado e o intervalo é plausível.
function computeGapEntries(visits) {
  const entries = []
  for (let i = 0; i < visits.length - 1; i++) {
    const cur = visits[i]
    const next = visits[i + 1]
    if (!cur.domain) continue
    const gap = next.time - cur.time
    if (gap <= 0 || gap > MAX_GAP_MS) continue
    entries.push({ domain: cur.domain, date: localDateKey(cur.time), seconds: Math.round(gap / 1000) })
  }
  return entries
}

async function syncScreenTime() {
  const token = await getToken()
  if (!token) return
  if (!(await hasHistoryPermission())) return

  const { lastSync, pendingVisit } = await chrome.storage.local.get(["lastSync", "pendingVisit"])
  const endTime = Date.now()
  const startTime = lastSync ? Math.max(lastSync, endTime - MAX_LOOKBACK_MS) : endTime - MAX_LOOKBACK_MS

  const freshVisits = await collectVisits(startTime, endTime)
  // A última visita da sincronização anterior ficou sem par (não sabíamos o
  // próximo evento ainda) — entra de novo agora pra não perder aquele intervalo.
  const visits = pendingVisit ? [pendingVisit, ...freshVisits] : freshVisits
  const entries = computeGapEntries(visits)
  const newPendingVisit = visits.length > 0 ? visits[visits.length - 1] : pendingVisit ?? null

  if (entries.length > 0) {
    try {
      const res = await fetch(`${API_BASE}/api/extension/screen-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ entries }),
      })
      if (!res.ok) return // não avança nada — tenta essa janela de novo na próxima
    } catch {
      return
    }
  }

  await chrome.storage.local.set({ lastSync: endTime, pendingVisit: newPendingVisit })
}

chrome.alarms.create("sync", { periodInMinutes: SYNC_PERIOD_MIN })
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "sync") syncScreenTime()
})

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "sync-now") {
    syncScreenTime().then(() => sendResponse({ ok: true }))
    return true
  }
  if (msg?.type === "history-granted") {
    syncScreenTime()
  }
})
