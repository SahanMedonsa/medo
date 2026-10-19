export const siteDescription = "Learn with Sahan Medonsa. Explore O/L maths lessons, Sinhala and English medium tutes, past papers, A/L learning resources and online classes.";

export function siteUrl(): URL | undefined {
  const value = process.env.NEXT_PUBLIC_SITE_URL || "https://sahanmedonsa.lk";
  if (!value) return undefined;
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("NEXT_PUBLIC_SITE_URL must be the website origin, for example https://your-domain.com");
  return url;
}

export const publicSections = [
  { slug: "ol-maths-2026", category: "2026 O/L Maths", title: "2026 O/L Maths", description: "Explore 2026 O/L maths lesson folders and published video lessons with Sahan Medonsa in Sinhala and English medium." },
  { slug: "grade-10", category: "Grade 10", title: "Grade 10 Maths", description: "Browse Grade 10 maths lesson folders and video lessons with Sahan Medonsa. Choose Sinhala or English medium to find your learning materials." },
  { slug: "tute-videos", category: "#tute", title: "#tute Videos", description: "Watch #tute maths video lessons with Sahan Medonsa and open the accompanying Google Drive tutes where available." },
  { slug: "maths-tutes", category: "Tutes", title: "O/L Maths Tutes", description: "Browse O/L maths tute folders by grade and medium. Open published PDF learning materials and Google Drive tutes." },
  { slug: "ol-past-papers", category: "O/L Past Papers", title: "O/L Maths Past Papers", description: "Find published O/L maths past-paper learning resources and video lessons with Sahan Medonsa for your revision." },
  { slug: "rankings", category: "Ranking", title: "Paper Rankings and Results", description: "View paper rankings and student marks, with paper download links and YouTube answers where available." },
  { slug: "ol-online-classes", category: "O/L Online Classes", title: "O/L Online Classes", description: "Find published O/L online class links from Sahan Medonsa. Choose your teaching medium and open the class you want to join." },
  { slug: "al-theory", category: "AL Video Modules", title: "2028 A/L Theory", description: "Explore 2028 A/L theory lesson folders and published video modules with Sahan Medonsa. Revisit lessons at your own pace." },
  { slug: "al-past-papers", category: "A/L Past Papers", title: "A/L Past Papers", description: "Browse published A/L past-paper learning resources and video lessons with Sahan Medonsa." },
  { slug: "al-online-classes", category: "A/L Online Classes", title: "A/L Online Classes", description: "Find published A/L online class links from Sahan Medonsa in Sinhala and English medium." },
  { slug: "about", category: "About Us", title: "About Sahan Medonsa", description: "Meet Sahan Medonsa, an IT lecturer and software developer with a BSc (Hons) in Information Technology, sharing lessons and practical learning resources." },
  { slug: "contact", category: "Contact Us", title: "Contact Sahan Medonsa", description: "Contact Sahan Medonsa by phone or WhatsApp for questions about lessons, learning materials and projects." },
];

export function socialMetadata(title: string, description: string, path: string) {
  const origin = siteUrl()!;
  const image = new URL("/logo.png", origin).href;
  return {
    openGraph: {
      type: "website" as const, siteName: "Sahan Medonsa", title, description,
      url: new URL(path, origin).href,
      images: [{ url: image, width: 1175, height: 344, alt: "Sahan Medonsa" }],
    },
    twitter: { card: "summary_large_image" as const, title, description, images: [image] },
  };
}

export function structuredSiteData() {
  const origin = siteUrl()!;
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": new URL("/#website", origin).href, name: "Sahan Medonsa", url: origin.href,
        description: siteDescription, inLanguage: ["en", "si"], publisher: { "@id": new URL("/#person", origin).href } },
      { "@type": "Person", "@id": new URL("/#person", origin).href, name: "Sahan Medonsa", url: new URL("/learn/about", origin).href,
        jobTitle: "IT Lecturer and Software Developer", image: new URL("/me.png", origin).href,
        sameAs: ["https://youtube.com/@sahanmedonsa", "https://www.tiktok.com/@sahanmedonsa"] },
    ],
  };
}
