import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CourseCatalog from "@/components/course-catalog";
import { publicSections, siteUrl } from "@/lib/seo";

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
    openGraph: { title: `${section.title} | Sahan Medonsa`, description: section.description, ...(url ? { url } : {}) },
    twitter: { title: `${section.title} | Sahan Medonsa`, description: section.description },
  };
}
export default async function SectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const section = publicSections.find((item) => item.slug === slug);
  if (!section) notFound();
  return <CourseCatalog key={section.slug} initialCategory={section.category} />;
}
