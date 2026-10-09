import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Sem `images.remotePatterns`: nenhuma tela usa `next/image` com foto de fora
  // (as fotos de perfil são <img> comum). Com `hostname: '**'`, o
  // `/_next/image?url=` buscava imagem de QUALQUER site, por conta da cota da
  // Vercel. Se um dia uma tela precisar, liberar só o host dela.
}

export default nextConfig
