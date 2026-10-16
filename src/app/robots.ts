import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";
export default function robots(): MetadataRoute.Robots {
  const origin = siteUrl();
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/"] }, ...(origin ? { sitemap: new URL("/sitemap.xml", origin).href } : {}) };
}
