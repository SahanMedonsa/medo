import type { Metadata } from "next";
import "./globals.css";
import { siteDescription, siteUrl } from "@/lib/seo";

const origin = siteUrl();
export const metadata: Metadata = {
  metadataBase: origin,
  title: { default: "Sahan Medonsa", template: "%s | Sahan Medonsa" },
  description: siteDescription,
  applicationName: "Sahan Medonsa",
  authors: [{ name: "Sahan Medonsa" }],
  openGraph: {
    type: "website", siteName: "Sahan Medonsa", title: "Sahan Medonsa", description: siteDescription,
    ...(origin ? { images: [{ url: "/logo.png", width: 1175, height: 344, alt: "Sahan Medonsa" }] } : {}),
  },
  twitter: { card: "summary_large_image", title: "Sahan Medonsa", description: siteDescription, ...(origin ? { images: ["/logo.png"] } : {}) },
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
