// Feed de calendário assinável — helpers puros. O I/O (buscar/criar o token no
// Supabase) mora no componente components/calendar-feed.tsx.

// Monta a URL que o Google/Outlook assinam. O sufixo .ics é cosmético (a rota
// aceita com ou sem), mas alguns apps confiam mais numa URL "de calendário".
export function feedUrl(token: string, origin: string): string {
  return `${origin.replace(/\/+$/, "")}/api/calendar/${token}.ics`
}

// Token secreto: 128 bits em hex (32 chars) — inadivinhável na prática. É o
// segredo que protege o feed, então vem do CSPRNG do ambiente.
export function newFeedToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}
