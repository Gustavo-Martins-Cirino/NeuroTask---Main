import type { MetadataRoute } from "next"
import { PAGINAS_INDEXAVEIS, SITE_URL } from "@/lib/site"

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGINAS_INDEXAVEIS.map((pagina) => ({
    url: pagina === "/" ? SITE_URL : `${SITE_URL}${pagina}`,
    changeFrequency: "monthly",
    priority: pagina === "/" ? 1 : 0.5,
  }))
}
