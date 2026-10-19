import { scryptSync, timingSafeEqual } from "node:crypto";
import { ApiError, apiError, assertSameOrigin, backend, json } from "@/lib/backend";
import { rankingId } from "@/lib/rankings";

const attempts = new Map<string, { count: number; until: number }>();
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const raw = await request.text();
    if (raw.length > 1000) throw new ApiError("Request is too large.", 413);
    let body;
    try { body = JSON.parse(raw); rankingId(body?.paper_id); } catch { throw new ApiError("Invalid paper."); }
    if (typeof body.passcode !== "string" || !/^[0-9]{4}$/.test(body.passcode)) throw new ApiError("Enter the 4-digit passcode.");
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
    const key = `${body.paper_id}:${request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"}`;
    const limit = attempts.get(key) ?? { count: 0, until: now + 60000 };
    if (limit.count >= 10) throw new ApiError("Too many attempts. Wait a minute and try again.", 429);
    limit.count++; attempts.set(key, limit);
    let response: Response;
    try { response = await backend(`/data/ranking_access?id=eq.${body.paper_id}`); }
    catch (error) { throw new ApiError((error as Error).message, 503); }
    if (response.status === 404) throw new ApiError("The administrator has not set a passcode for this paper yet.", 403);
    if (!response.ok) throw new ApiError("Could not verify the passcode.", 503);
    const rows = await response.json();
    if (!rows.length) throw new ApiError("The administrator has not set a code for this paper yet.", 403);
    const { salt, hash } = rows[0];
    if (typeof salt !== "string" || typeof hash !== "string" || !/^[0-9a-f]{64}$/.test(hash)) throw new ApiError("Paper access is not configured correctly.", 503);
    if (!timingSafeEqual(scryptSync(body.passcode, salt, 32), Buffer.from(hash, "hex"))) throw new ApiError("Incorrect passcode. Try again.", 403);
    const entries = await backend("/data/ranking_entries");
    if (!entries.ok) throw new ApiError("Could not load results. Publish the updated Firestore rules.", 503);
    return json({ entries: (await entries.json()).filter((entry: { paper_id: string }) => entry.paper_id === body.paper_id) });
  } catch (error) { return apiError(error); }
}
