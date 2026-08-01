export const metadata = {
  title: "Privacidade da extensão — NeuroTask",
}

const TRACKED_DOMAINS = [
  "instagram.com", "tiktok.com", "twitter.com / x.com",
  "facebook.com", "reddit.com", "youtube.com", "threads.net",
]

export default function ExtensionPrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-foreground">
      <h1 className="text-2xl font-bold">Política de privacidade — NeuroTask (Tempo de tela)</h1>
      <p className="mt-2 text-sm text-muted-foreground">Última atualização: 2026-07-31</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
        <section>
          <h2 className="text-base font-semibold text-foreground">O que a extensão lê</h2>
          <p className="mt-2">
            A extensão usa a permissão <strong>histórico do navegador</strong> (concedida por
            você, em runtime, com um prompt do próprio Chrome) para encontrar visitas apenas
            aos domínios abaixo:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {TRACKED_DOMAINS.map((d) => (
              <li key={d}><code className="rounded bg-muted px-1 py-0.5">{d}</code></li>
            ))}
          </ul>
          <p className="mt-2">
            Nenhuma URL completa, título de página ou domínio fora dessa lista é lido, guardado
            ou enviado. O histórico não guarda duração de visita — a extensão estima o tempo
            pelo intervalo até a próxima navegação (qualquer domínio), com teto de 30 minutos
            por intervalo.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">O que é enviado e pra onde</h2>
          <p className="mt-2">
            A cada ~10 minutos, a extensão manda pro servidor do NeuroTask (
            <code className="rounded bg-muted px-1 py-0.5">neuro-task-main.vercel.app</code>,
            via HTTPS) apenas totais agregados: <em>domínio + data + segundos estimados</em>.
            Isso fica associado à sua conta do NeuroTask (Supabase, com Row Level Security —
            só você lê os seus próprios dados) e vira o card de tempo de tela no seu dashboard.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">O que a extensão nunca faz</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Não vende nem compartilha dados com terceiros.</li>
            <li>Não lê, modifica ou apaga seu histórico — acesso é só de leitura.</li>
            <li>Não envia conteúdo de página, título ou URL completa — só o domínio.</li>
            <li>Não rastreia nenhum site fora da lista acima.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Permissões usadas</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>history</strong> — ler timestamps de visita aos domínios rastreados (opcional, pedida em runtime).</li>
            <li><strong>storage</strong> — guardar localmente o token de conexão da sua conta e o marcador da última sincronização.</li>
            <li><strong>alarms</strong> — agendar a sincronização periódica (a cada 10 min).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Desconectar e apagar</h2>
          <p className="mt-2">
            Você pode desconectar o dispositivo a qualquer momento pelo popup da extensão
            ("Desconectar deste navegador") ou em Configurações → Extensão do navegador, no
            NeuroTask. Desinstalar a extensão também para o envio de dados. Pra apagar o
            histórico já enviado, escreva pro contato abaixo.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Contato</h2>
          <p className="mt-2">
            Dúvidas sobre esta extensão ou seus dados:{" "}
            <a href="mailto:cirinogustavom@gmail.com" className="text-primary hover:underline">
              cirinogustavom@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}
