import type { Metadata } from "next";
export const metadata: Metadata = { title: "Admin dashboard", robots: { index: false, follow: false } };
import CourseCatalog from "@/components/course-catalog";

export default function Admin() { return <CourseCatalog mode="admin" />; }
