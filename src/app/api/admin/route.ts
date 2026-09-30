import { cookies } from "next/headers";
import { ApiError, apiError, assertSameOrigin, backend, configured, demoEnabled, json, requireAdmin, verifyAdmin } from "@/lib/backend";
import { validateModule, validateFolder, youtubeId, contentMedium } from "@/lib/modules";

export async function GET() {
  try {
    if (!configured()) return json({ configured: false, authenticated: false, demo: demoEnabled() });
    const { token, user } = await requireAdmin();
    const response = await backend("/data/modules?select=*&order=created_at.desc", token);
    if (!response.ok) throw new ApiError("Could not load lessons. Check your database setup.", 503);
    const folderResponse = await backend("/data/lesson_folders?select=*&order=created_at.desc", token);
    if (!folderResponse.ok) throw new ApiError("Could not load lesson folders. Check that Firestore is enabled and the access rules are published.", 503);
    return json({ configured: true, authenticated: true, email: user.email, modules: await response.json(), folders: await folderResponse.json() });
  } catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status)) return json({ configured: true, authenticated: false });
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const raw = await request.text();
    if (raw.length > 20000) throw new ApiError("Request is too large.", 413);
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw); } catch { throw new ApiError("Invalid request."); }
    if (!body || Array.isArray(body) || typeof body !== "object") throw new ApiError("Invalid request.");
    if (body.action === "login") {
      const username = typeof body.username === "string" ? body.username.trim() : typeof body.email === "string" ? body.email.trim() : "";
      if (!username || username.length > 254 || typeof body.password !== "string" || !body.password || body.password.length > 1000) throw new ApiError("Enter your username and password.");
      // A configured username is an alias only; Firebase still verifies the password and admin membership.
      const aliasMatches = process.env.ADMIN_USERNAME && username.toLowerCase() === process.env.ADMIN_USERNAME.toLowerCase();
      const email = aliasMatches ? process.env.ADMIN_EMAIL : username;
      if (!email || !email.includes("@")) throw new ApiError("Sign-in failed. Check your username and password.", 401);
      const response = await backend("/auth/login", undefined, {
        method: "POST", body: JSON.stringify({ email, password: body.password }),
      });
      if (!response.ok) throw new ApiError(response.status === 429 ? "Too many sign-in attempts. Please try again later." : "Sign-in failed. Check your username and password.", response.status === 429 ? 429 : 401);
      const session = await response.json();
      await verifyAdmin(session.access_token);
      (await cookies()).set("admin_session", session.access_token, {
        httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/",
        maxAge: Math.min(session.expires_in, 3600),
      });
      return json({ ok: true });
    }
    if (body.action === "logout") {
      const cookieStore = await cookies();
      cookieStore.delete("admin_session");
      return json({ ok: true });
    }
    const { token } = body.action === "preview" && demoEnabled() ? { token: undefined } : await requireAdmin();
    if (body.action === "preview") {
      const id = typeof body.url === "string" ? youtubeId(body.url) : null;
      if (!id) throw new ApiError("Enter a valid YouTube video link.");
      const url = `https://www.youtube.com/watch?v=${id}`;
      let response: Response;
      try {
        response = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(8000), redirect: "error", cache: "no-store" });
      } catch { throw new ApiError("YouTube could not be reached. Try again or enter the title yourself.", 502); }
      if (!response.ok) throw new ApiError("YouTube could not read this video. Check that it is public or unlisted, or enter the title yourself.", 422);
      const metadata = await response.json();
      if (typeof metadata.title !== "string") throw new ApiError("The video title was unavailable. Enter it yourself.", 422);
      return json({ title: metadata.title.slice(0, 200), video_id: id });
    }
    if (body.action === "save_folder") {
      let folder;
      try { folder = validateFolder(body); } catch (error) { throw new ApiError((error as Error).message); }
      if (body.id !== undefined && (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id))) throw new ApiError("Invalid folder ID.");
      if (body.id) {
        const existing = await backend(`/data/lesson_folders?id=eq.${body.id}`, token);
        if (!existing.ok) throw new ApiError("Could not verify the folder.", 503);
        const folders = await existing.json();
        if (!folders.length) throw new ApiError("Folder not found.", 404);
        if (contentMedium(folders[0]) !== folder.medium) throw new ApiError("A folder’s medium cannot change. Create a separate folder for the other medium.");
      }
      // Category is fixed after creation so existing videos cannot become detached.
      const payload = body.id ? { medium: folder.medium, title: folder.title, description: folder.description, planned_videos: folder.planned_videos, marks: folder.marks } : folder;
      const response = await backend(`/data/lesson_folders${body.id ? `?id=eq.${body.id}` : ""}`, token, {
        method: body.id ? "PATCH" : "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload),
      });
      if (!response.ok) throw new ApiError("Could not save this folder. Check the database setup and try again.", 502);
      const saved = await response.json();
      if (!saved.length) throw new ApiError("Folder not found. Refresh the page.", 404);
      return json({ folder: saved[0] });
    }
    if (body.action === "save") {
      let lesson;
      try { lesson = validateModule(body); } catch (error) { throw new ApiError((error as Error).message); }
      if (lesson.folder_id) {
        const folderResponse = await backend(`/data/lesson_folders?id=eq.${lesson.folder_id}&category=eq.${encodeURIComponent(lesson.category)}&select=id,medium`, token);
        if (!folderResponse.ok) throw new ApiError("Could not verify lesson folder.", 503);
        const matchingFolders = await folderResponse.json();
        if (!matchingFolders.length) throw new ApiError("This folder does not exist in the selected category.");
        if (contentMedium(matchingFolders[0]) !== lesson.medium) throw new ApiError("Choose a folder in the same teaching medium as the video.");
      }
      const id = body.id;
      if (id !== undefined && (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))) throw new ApiError("Invalid lesson ID.");
      const response = await backend(`/data/modules${id ? `?id=eq.${id}` : ""}`, token, {
        method: id ? "PATCH" : "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(lesson),
      });
      if (!response.ok) {
        if (response.status === 403) throw new ApiError("Firebase blocked this save. Publish the latest firestore.rules from this project in Firebase Console → Firestore Database → Rules, then try again.", 403);
        if (response.status === 401) throw new ApiError("Your session has expired. Please sign in again before saving.", 401);
        if (response.status === 404) throw new ApiError("This lesson no longer exists. Refresh the list.", 404);
        throw new ApiError("The lesson could not be saved. Please try again.", 502);
      }
      const saved = await response.json();
      if (!saved.length) throw new ApiError("This lesson no longer exists. Refresh the list.", 404);
      return json({ module: saved[0] });
    }
    if (body.action === "delete") {
      if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) throw new ApiError("Invalid lesson ID.");
      const response = await backend(`/data/modules?id=eq.${body.id}`, token, { method: "DELETE", headers: { Prefer: "return=representation" } });
      if (!response.ok) throw new ApiError("The lesson could not be deleted.", 502);
      return json({ ok: true });
    }
    throw new ApiError("Unknown action.");
  } catch (error) { return apiError(error); }
}
