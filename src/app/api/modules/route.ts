import { ApiError, apiError, backend, configured, demoEnabled, json } from "@/lib/backend";

export async function GET() {
  try {
    if (!configured()) return json({ modules: [], folders: [], demo: demoEnabled() });
    const response = await backend("/data/modules?published=eq.true&select=id,title,description,category,medium,folder_id,video_id,tute_url,published,created_at&order=created_at.desc");
    if (!response.ok) throw new ApiError("Lessons could not be loaded. Please try again shortly.", 503);
    const folderResponse = await backend("/data/lesson_folders?select=*&order=created_at.desc");
    if (!folderResponse.ok) throw new ApiError("Could not load lesson folders. Check that Firestore is enabled and the access rules are published.", 503);
    const folders = await folderResponse.json();
    const hiddenIds = new Set(folders.filter((folder: { category: string; published?: boolean }) => folder.category === "#tute" && folder.published === false).map((folder: { id: string }) => folder.id));
    const modules = await response.json();
    return json({ modules: modules.filter((module: { folder_id?: string }) => !hiddenIds.has(module.folder_id)), folders: folders.filter((folder: { id: string }) => !hiddenIds.has(folder.id)) });
  } catch (error) { return apiError(error); }
}
