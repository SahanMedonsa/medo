import type { MetadataRoute } from "next";
import { publicSections, siteUrl } from "@/lib/seo";
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteUrl();
  if (!origin) return [];
  return ["/", ...publicSections.map((section) => `/learn/${section.slug}`)].map((path) => ({ url: new URL(path, origin).href }));
}
