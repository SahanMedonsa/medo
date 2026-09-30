import { LessonFolder, VideoModule, contentMedium, validateFolder, validateModule } from "./modules";

const key = "sahan-medonsa-frontend-demo-v1";
type DemoData = { modules: VideoModule[]; folders: LessonFolder[] };

export function readDemo(): DemoData {
  const raw = localStorage.getItem(key);
  if (!raw) return { modules: [], folders: [] };
  const data = JSON.parse(raw);
  if (!Array.isArray(data.modules) || !Array.isArray(data.folders)) throw new Error("Demo data could not be loaded.");
  return data;
}

export function saveDemo(body: Record<string, unknown>) {
  const data = readDemo();
  if (body.action === "save_folder") {
    const fields = validateFolder(body);
    const previous = data.folders.find((item) => item.id === body.id);
    if (previous && contentMedium(previous) !== fields.medium) throw new Error("A folder’s medium cannot change. Create a separate folder for the other medium.");
    const folder = { ...fields, id: previous?.id ?? crypto.randomUUID(), created_at: previous?.created_at ?? new Date().toISOString() };
    data.folders = [folder, ...data.folders.filter((item) => item.id !== folder.id)];
    localStorage.setItem(key, JSON.stringify(data));
    return { folder };
  }
  if (body.action === "save") {
    const fields = validateModule(body);
    if (fields.folder_id && !data.folders.some((folder) => folder.id === fields.folder_id && folder.category === fields.category && contentMedium(folder) === fields.medium)) throw new Error("Choose a folder in this category and teaching medium.");
    const previous = data.modules.find((item) => item.id === body.id);
    const video = { ...fields, id: previous?.id ?? crypto.randomUUID(), created_at: previous?.created_at ?? new Date().toISOString() };
    data.modules = [video, ...data.modules.filter((item) => item.id !== video.id)];
    localStorage.setItem(key, JSON.stringify(data));
    return { module: video };
  }
  if (body.action === "delete") {
    data.modules = data.modules.filter((item) => item.id !== body.id);
    localStorage.setItem(key, JSON.stringify(data));
    return { ok: true };
  }
  throw new Error("Unsupported demo action.");
}

export async function adminRequest(body: Record<string, unknown>, demo = false) {
  if (demo && body.action !== "preview") return saveDemo(body);
  const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Please try again.");
  return result;
}
