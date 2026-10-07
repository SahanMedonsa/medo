import { ApiError, apiError, assertSameOrigin, backend, demoEnabled, json, requireAdmin } from "@/lib/backend";
import { validateOnlineClass } from "@/lib/online-classes";

export async function GET() {
  try {
    if (demoEnabled()) return json({ classes: [] });
    const response = await backend("/data/online_classes?order=created_at.desc");
    if (!response.ok) throw new ApiError("Could not load online classes. Publish the updated Firestore rules.", 503);
    return json({ classes: await response.json() });
  } catch (error) { return apiError(error); }
}

async function mutate(request: Request) {
  try {
    assertSameOrigin(request);
    const { token } = await requireAdmin();
    const raw = await request.text();
    if (raw.length > 5000) throw new ApiError("Request is too large.", 413);
    let body, fields;
    try {
      body = JSON.parse(raw);
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid class details.");
      if (request.method !== "DELETE") fields = validateOnlineClass(body);
    } catch (error) { throw new ApiError((error as Error).message); }
    if (request.method !== "POST" && (typeof body.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id))) throw new ApiError("Invalid class ID.");
    const response = await backend(`/data/online_classes${request.method === "POST" ? "" : `?id=eq.${body.id}`}`, token, {
      method: request.method, ...(fields ? { body: JSON.stringify(fields) } : {}),
    });
    if (!response.ok) throw new ApiError("Could not save online classes. Publish the updated Firestore rules.", 502);
    if (request.method === "DELETE") return json({ ok: true });
    return json({ class: (await response.json())[0] });
  } catch (error) { return apiError(error); }
}

export const POST = mutate;
export const PATCH = mutate;
export const DELETE = mutate;
