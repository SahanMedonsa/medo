import { Medium } from "./modules";

export type OnlineClass = {
  id: string;
  title: string;
  zoom_url: string;
  section: "ol" | "al";
  medium: Medium;
  created_at: string;
};

export function validateOnlineClass(input: Record<string, unknown>): Omit<OnlineClass, "id" | "created_at"> {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title || title.length > 200) throw new Error("Enter a title of 1–200 characters.");
  const zoom_url = typeof input.zoom_url === "string" ? input.zoom_url.trim() : "";
  let url: URL;
  try { url = new URL(zoom_url); } catch { throw new Error("Enter a valid HTTPS Zoom meeting link."); }
  if (zoom_url.length > 2000 || url.protocol !== "https:" || url.username || url.password || url.port ||
    !/^(?:[a-z0-9-]+\.)*zoom\.(?:us|com)$/.test(url.hostname) || !/^\/(?:j|my|w)\/.+/.test(url.pathname)) {
    throw new Error("Enter a valid HTTPS Zoom meeting link.");
  }
  if (input.section !== "ol" && input.section !== "al") throw new Error("Choose O/L or A/L.");
  if (input.medium !== "si" && input.medium !== "en") throw new Error("Choose Sinhala or English medium.");
  return { title, zoom_url, section: input.section, medium: input.medium };
}
