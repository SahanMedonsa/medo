import type { Metadata } from "next";
import { siteUrl } from "@/lib/seo";
const origin = siteUrl();
export const metadata: Metadata = { ...(origin ? { alternates: { canonical: origin.href } } : {}) };
import CourseCatalog from "@/components/course-catalog";

export default function Student() { return <CourseCatalog />; }
