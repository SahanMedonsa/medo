import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sahan Medonsa | Online Courses",
  description: "Explore A/L and O/L courses, monthly lessons, video modules, tutes and past papers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
