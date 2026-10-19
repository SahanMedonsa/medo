import type { Metadata } from "next";
import CourseCatalog from "@/components/course-catalog";
import { siteUrl, siteDescription, socialMetadata } from "@/lib/seo";

const origin = siteUrl();
export const metadata: Metadata = { ...(origin ? { alternates: { canonical: origin.href }, ...socialMetadata("Sahan Medonsa", siteDescription, "/") } : {}) };

export default function Home() { return <CourseCatalog />; }
