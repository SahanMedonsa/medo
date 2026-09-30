export const maxPdfBytes = 3 * 1024 * 1024;
export type PdfTute = { drive_url?: string; id: string; title: string; description: string; filename: string; size: number; published: boolean; created_at: string };

export async function validatePdf(file: File, title: string, description: string) {
  if (!title.trim() || title.trim().length > 200) throw new Error("Enter a title of 1–200 characters.");
  if (description.length > 5000) throw new Error("Description is too long.");
  if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) throw new Error("Choose a PDF file.");
  if (file.size === 0 || file.size > maxPdfBytes) throw new Error("Choose a PDF up to 3 MB.");
  if (await file.slice(0, 5).text() !== "%PDF-") throw new Error("This file is not a valid PDF.");
}

export function googleDriveFileUrl(input: string): string {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("Paste a Google Drive file sharing link."); }
  if (url.protocol !== "https:" || url.hostname !== "drive.google.com" || url.username || url.password || url.port) throw new Error("Use an https://drive.google.com file link.");
  const match = url.pathname.match(/^\/file\/d\/([a-zA-Z0-9_-]+)(?:\/view|\/preview)?\/?$/);
  const id = match?.[1] ?? (["/open", "/uc"].includes(url.pathname) ? url.searchParams.get("id") : null);
  if (!id || !/^[a-zA-Z0-9_-]{10,200}$/.test(id)) throw new Error("Use a file link, not a folder link.");
  const result = new URL(`https://drive.google.com/file/d/${id}/view`);
  const resourceKey = url.searchParams.get("resourcekey");
  if (resourceKey) {
    if (!/^[a-zA-Z0-9_-]{1,200}$/.test(resourceKey)) throw new Error("Invalid Drive resource key.");
    result.searchParams.set("resourcekey", resourceKey);
  }
  return result.toString();
}
