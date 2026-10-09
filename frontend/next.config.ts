import type { NextConfig } from 'next'

// Cabeçalhos de segurança em toda resposta. Medido em produção antes deles
// (08/10): só vinha o HSTS, que a Vercel manda sozinha.
//
// A CSP aqui é a parte que não restringe script: quem pode pôr o site num
// iframe (ninguém — clickjacking), `<base>` e `<object>`. A CSP completa
// (script-src, connect-src) pede o inventário de hosts do app e fica no ROADMAP.
//
// Permissions-Policy desliga o que o app não usa e deixa o microfone só para o
// próprio site (a conversa por voz). Notificação e área de transferência não
// passam por aqui; autoplay e afins do player do YouTube ficam no padrão.
const CABECALHOS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), payment=(), usb=()' },
]

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: CABECALHOS }]
  },
  // Sem `images.remotePatterns`: nenhuma tela usa `next/image` com foto de fora
  // (as fotos de perfil são <img> comum). Com `hostname: '**'`, o
  // `/_next/image?url=` buscava imagem de QUALQUER site, por conta da cota da
  // Vercel. Se um dia uma tela precisar, liberar só o host dela.
}

export default nextConfig
