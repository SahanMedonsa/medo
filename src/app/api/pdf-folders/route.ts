import { ApiError, apiError, assertSameOrigin, backend, json, requireAdmin } from "@/lib/backend";
import { validatePdfFolder } from "@/lib/pdfs";

export async function GET() {
  try {
    const response = await backend("/data/pdf_folders?order=created_at.desc");
    if (!response.ok) throw new ApiError("Could not load tute folders. Publish the updated Firestore rules.", 503);
    return json({ folders: await response.json() });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { token } = await requireAdmin();
    const raw = await request.text();
    if (raw.length > 2000) throw new ApiError("Request is too large.", 413);
    let folder;
    try { folder = validatePdfFolder(JSON.parse(raw)); } catch (error) { throw new ApiError((error as Error).message); }
    const response = await backend("/data/pdf_folders", token, { method: "POST", body: JSON.stringify(folder) });
    if (!response.ok) throw new ApiError("Could not create folder. Publish the updated Firestore rules.", 502);
    return json({ folder: (await response.json())[0] });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const { token } = await requireAdmin();
    const raw = await request.text();
    if (raw.length > 2000) throw new ApiError("Request is too large.", 413);
    let body, folder;
    try { body = JSON.parse(raw); folder = validatePdfFolder(body); } catch (error) { throw new ApiError((error as Error).message); }
    if (typeof body.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)) throw new ApiError("Invalid folder ID.");
    const response = await backend(`/data/pdf_folders?id=eq.${body.id}`, token, { method: "PATCH", body: JSON.stringify({ name: folder.name, grade: folder.grade }) });
    if (!response.ok) throw new ApiError("Could not update folder. Publish the updated Firestore rules.", 502);
    return json({ folder: (await response.json())[0] });
  } catch (error) { return apiError(error); }
}
