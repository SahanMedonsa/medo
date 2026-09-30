import { firebaseConfig } from "./firebase-config";

const root = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o`;
export function pdfPath(id: string) { return `tute-pdfs/${id}/document.pdf`; }

export async function storagePdf(id: string, token?: string, method = "GET", file?: File) {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Firebase ${token}`);
  let url = `${root}/${encodeURIComponent(pdfPath(id))}${method === "GET" ? "?alt=media" : ""}`;
  let body: Blob | undefined;
  if (file) {
    const boundary = crypto.randomUUID();
    headers.set("X-Goog-Upload-Protocol", "multipart");
    headers.set("Content-Type", `multipart/related; boundary=${boundary}`);
    url = `${root}?name=${encodeURIComponent(pdfPath(id))}`;
    body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${JSON.stringify({ name: pdfPath(id), contentType: "application/pdf", cacheControl: "private, no-store" })}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`,
      file, `\r\n--${boundary}--`,
    ]);
  }
  return fetch(url, { method, headers, body, cache: "no-store", signal: AbortSignal.timeout(30000) });
}
