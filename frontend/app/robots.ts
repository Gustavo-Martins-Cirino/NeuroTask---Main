import type { MetadataRoute } from "next"
import { FECHADO_PARA_ROBOS, SITE_URL } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...FECHADO_PARA_ROBOS] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
