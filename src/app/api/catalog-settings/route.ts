import { ApiError, apiError, assertSameOrigin, backend, demoEnabled, json, requireAdmin } from "@/lib/backend";

function settingsId(value: unknown) {
  if (value === undefined || value === null) return "display";
  if (typeof value !== "string" || !/^display(?:_[a-zA-Z0-9_-]{1,180})?$/.test(value)) throw new ApiError("Invalid display order scope.");
  return value;
}

export async function GET(request?: Request) {
  try {
    const id = settingsId(request ? new URL(request.url).searchParams.get("scope") : undefined);
    if (demoEnabled()) return json({ contentOrder: "newest", demo: true });
    const response = await backend(`/data/catalog_settings?id=eq.${id}`);
    if (!response.ok) throw new ApiError("Could not load the student display order. Check that the Firestore rules are published.", 503);
    let settings = await response.json();
    if (!settings.length && id !== "display") {
      const fallback = await backend("/data/catalog_settings?id=eq.display");
      if (!fallback.ok) throw new ApiError("Could not load the default display order.", 503);
      settings = await fallback.json();
    }
    return json({ contentOrder: settings[0]?.content_order === "oldest" ? "oldest" : "newest" });
  } catch (error) { return apiError(error); }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const { token } = await requireAdmin();
    const raw = await request.text();
    if (raw.length > 1000) throw new ApiError("Request is too large.", 413);
    let body;
    try { body = JSON.parse(raw); } catch { throw new ApiError("Invalid request."); }
    if (!body || !["oldest", "newest"].includes(body.contentOrder)) throw new ApiError("Choose a valid display order.");
    const id = settingsId(body.scope);
    const response = await backend(`/data/catalog_settings?id=eq.${id}`, token, {
      method: "PUT", body: JSON.stringify({ content_order: body.contentOrder }),
    });
    if (!response.ok) throw new ApiError("Could not save the student display order. Check that the Firestore rules are published.", 503);
    return json({ contentOrder: body.contentOrder });
  } catch (error) { return apiError(error); }
}
