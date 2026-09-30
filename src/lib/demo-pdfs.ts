import { PdfTute, PdfFolder } from "./pdfs";

type StoredPdf = PdfTute & { file?: Blob };

async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("medonsa-demo-pdfs", 2);
    request.onupgradeneeded = () => {
      for (const name of ["pdfs", "folders"]) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Browser storage is unavailable."));
  });
}

export async function demoPdfs(action: "list" | "save" | "get" | "delete", value?: StoredPdf | string): Promise<StoredPdf[] | StoredPdf | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("pdfs", action === "list" || action === "get" ? "readonly" : "readwrite");
    const store = transaction.objectStore("pdfs");
    const request = action === "list" ? store.getAll() : action === "get" ? store.get(value as string) : action === "save" ? store.put(value) : store.delete(value as string);
    transaction.oncomplete = () => { db.close(); resolve(action === "save" || action === "delete" ? undefined : request.result); };
    transaction.onerror = () => { db.close(); reject(new Error("Could not save PDF in this browser. Storage may be full.")); };
    transaction.onabort = () => { db.close(); reject(new Error("Browser storage operation was cancelled.")); };
  });
}

export async function demoPdfFolders(value?: PdfFolder): Promise<PdfFolder[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("folders", value ? "readwrite" : "readonly");
    const store = transaction.objectStore("folders");
    if (value) store.put(value);
    const request = store.getAll();
    transaction.oncomplete = () => { db.close(); resolve(request.result); };
    transaction.onerror = transaction.onabort = () => { db.close(); reject(new Error("Could not save or load folders in this browser.")); };
  });
}
