import type { Metadata } from "next";
import "./globals.css";
import { siteDescription, siteUrl, socialMetadata, structuredSiteData } from "@/lib/seo";

const origin = siteUrl();
export const metadata: Metadata = {
  metadataBase: origin,
  title: { default: "Sahan Medonsa", template: "%s | Sahan Medonsa" },
  description: siteDescription,
  applicationName: "Sahan Medonsa",
  icons: { icon: { url: "/me.png", type: "image/png" }, apple: "/logo.png" },
  authors: [{ name: "Sahan Medonsa" }],
  ...socialMetadata("Sahan Medonsa", siteDescription, "/"),
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredSiteData()).replace(/</g, "\\u003c") }} />{children}</body>
    </html>
  );
}
