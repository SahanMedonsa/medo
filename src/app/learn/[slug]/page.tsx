import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CourseCatalog from "@/components/course-catalog";
import { publicSections, siteUrl, socialMetadata } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() { return publicSections.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const section = publicSections.find((item) => item.slug === slug);
  if (!section) notFound();
  const origin = siteUrl();
  const url = origin ? new URL(`/learn/${slug}`, origin).href : undefined;
  return {
    title: section.title, description: section.description,
    ...(url ? { alternates: { canonical: url } } : {}),
    ...socialMetadata(`${section.title} | Sahan Medonsa`, section.description, `/learn/${slug}`),
  };
}
export default async function SectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const section = publicSections.find((item) => item.slug === slug);
  if (!section) notFound();
  const origin = siteUrl()!;
  const breadcrumbs = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Sahan Medonsa", item: origin.href },
      { "@type": "ListItem", position: 2, name: section.title, item: new URL(`/learn/${slug}`, origin).href },
    ],
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c") }} /><CourseCatalog key={section.slug} initialCategory={section.category} /></>;
}
