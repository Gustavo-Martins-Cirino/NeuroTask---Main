const API_BASE = "https://neuro-task-main.vercel.app"

const stepPermission = document.getElementById("step-permission")
const stepConnect = document.getElementById("step-connect")
const stepConnected = document.getElementById("step-connected")
const connectHint = document.getElementById("connect-hint")
const permissionBtn = document.getElementById("permission-btn")
const connectBtn = document.getElementById("connect-btn")
const retryBtn = document.getElementById("retry-btn")
const syncBtn = document.getElementById("sync-btn")
const unpairBtn = document.getElementById("unpair-btn")
const statusEl = document.getElementById("status")

async function hasHistoryPermission() {
  return chrome.permissions.contains({ permissions: ["history"] })
}

async function render() {
  statusEl.textContent = ""
  const { token, pendingState } = await chrome.storage.local.get(["token", "pendingState"])
  const hasHistory = await hasHistoryPermission()

  stepPermission.style.display = !hasHistory ? "block" : "none"
  stepConnect.style.display = hasHistory && !token ? "block" : "none"
  stepConnected.style.display = token ? "block" : "none"

  if (hasHistory && !token) {
    retryBtn.style.display = pendingState ? "block" : "none"
    connectHint.textContent = pendingState
      ? "Autorize na aba que abrimos e volte aqui."
      : "Conecte à sua conta do NeuroTask pra os dados aparecerem no seu dashboard."
  }
}

permissionBtn.addEventListener("click", async () => {
  permissionBtn.disabled = true
  const granted = await chrome.permissions.request({ permissions: ["history"] })
  permissionBtn.disabled = false
  if (!granted) {
    statusEl.textContent = "Sem essa permissão não dá pra estimar o tempo de tela."
    return
  }
  chrome.runtime.sendMessage({ type: "history-granted" })
  await render()
})

async function tryExchange(state) {
  const res = await fetch(`${API_BASE}/api/extension/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: state }),
  })
  if (!res.ok) return false
  const { token } = await res.json()
  await chrome.storage.local.set({ token })
  await chrome.storage.local.remove("pendingState")
  chrome.runtime.sendMessage({ type: "sync-now" })
  return true
}

connectBtn.addEventListener("click", async () => {
  const state = crypto.randomUUID()
  await chrome.storage.local.set({ pendingState: state })
  chrome.tabs.create({ url: `${API_BASE}/extension/connect?state=${state}` })
  await render()
})

retryBtn.addEventListener("click", async () => {
  const { pendingState } = await chrome.storage.local.get("pendingState")
  if (!pendingState) return
  retryBtn.disabled = true
  statusEl.textContent = ""
  const ok = await tryExchange(pendingState)
  retryBtn.disabled = false
  if (!ok) {
    statusEl.textContent = "Ainda não autorizado (ou o link expirou). Autorize na aba aberta e tente de novo."
    return
  }
  await render()
})

syncBtn.addEventListener("click", async () => {
  syncBtn.disabled = true
  statusEl.textContent = "Sincronizando..."
  chrome.runtime.sendMessage({ type: "sync-now" }, () => {
    syncBtn.disabled = false
    statusEl.textContent = "Sincronizado."
    setTimeout(() => { statusEl.textContent = "" }, 2000)
  })
})

unpairBtn.addEventListener("click", async () => {
  await chrome.storage.local.remove(["token", "pendingState", "lastSync", "pendingVisit"])
  await render()
})

render()
