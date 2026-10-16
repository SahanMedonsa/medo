import type { Metadata } from "next";
import CourseCatalog from "@/components/course-catalog";
import { siteUrl } from "@/lib/seo";

const origin = siteUrl();
export const metadata: Metadata = { ...(origin ? { alternates: { canonical: origin.href }, openGraph: { url: origin.href } } : {}) };

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org", "@type": "WebSite", name: "Sahan Medonsa",
    ...(origin ? { url: origin.href } : {}),
    author: { "@type": "Person", name: "Sahan Medonsa", jobTitle: "IT Lecturer and Software Developer" },
    inLanguage: ["en", "si"],
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} /><CourseCatalog /></>;
}
