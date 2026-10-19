import { randomBytes, scryptSync } from "node:crypto";
import { ApiError, apiError, assertSameOrigin, backend, json, requireAdmin } from "@/lib/backend";
import { rankingId, validateRankingEntry, validateRankingPaper } from "@/lib/rankings";

export async function GET(request?: Request) {
  try {
    const admin = request && new URL(request.url).searchParams.get("admin") === "true";
    const token = admin ? (await requireAdmin()).token : undefined;
    const papers = await backend("/data/ranking_papers", token);
    if (!papers.ok) throw new ApiError("Could not load rankings. Publish the updated Firestore rules.", 503);
    let entries = [];
    if (admin) {
      const response = await backend("/data/ranking_entries", token);
      if (!response.ok) throw new ApiError("Could not load student results.", 503);
      entries = await response.json();
    }
    return json({ papers: await papers.json(), entries });
  } catch (error) { return apiError(error); }
}
async function save(request: Request, method: "POST" | "PATCH") {
  try {
    assertSameOrigin(request);
    const { token } = await requireAdmin();
    const raw = await request.text();
    if (raw.length > 3000) throw new ApiError("Request is too large.", 413);
    let body, value;
    try {
      body = JSON.parse(raw);
      if (!body || !["paper", "entry"].includes(body.kind)) throw new Error("Choose a paper or student result.");
      if (method === "PATCH") rankingId(body.id);
      if (body.kind === "paper" && body.passcode !== undefined && body.passcode !== "" && (typeof body.passcode !== "string" || !/^[0-9]{4}$/.test(body.passcode))) throw new Error("Enter a 4-digit passcode.");
      value = body.kind === "paper" ? validateRankingPaper(body) : validateRankingEntry(body);
    } catch (error) { throw new ApiError((error as Error).message); }
    if (body.kind === "entry") {
      const parent = await backend(`/data/ranking_papers?id=eq.${body.paper_id}`, token);
      if (!parent.ok) throw new ApiError("Could not check the paper.", 503);
      if (!(await parent.json()).length) throw new ApiError("Choose an existing paper.");
    }
    const collection = body.kind === "paper" ? "ranking_papers" : "ranking_entries";
    const response = await backend(`/data/${collection}${method === "PATCH" ? `?id=eq.${body.id}` : ""}`, token, { method, body: JSON.stringify(value) });
    if (!response.ok) throw new ApiError("Could not save ranking. Check Firestore rules and try again.", 502);
    const item = (await response.json())[0];
    if (body.kind === "paper" && body.passcode) {
      const salt = randomBytes(16).toString("hex");
      const hash = scryptSync(body.passcode, salt, 32).toString("hex");
      const access = await backend(`/data/ranking_access?id=eq.${item.id}`, token, { method: "PUT", body: JSON.stringify({ salt, hash }) });
      if (!access.ok) throw new ApiError("Paper saved, but its passcode could not be saved. Publish the updated rules and edit the paper to set its passcode.", 502);
    }
    return json({ item });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) { return save(request, "POST"); }
export async function PATCH(request: Request) { return save(request, "PATCH"); }

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const { token } = await requireAdmin();
    const raw = await request.text();
    if (raw.length > 1000) throw new ApiError("Request is too large.", 413);
    let body;
    try { body = JSON.parse(raw); rankingId(body?.id); } catch { throw new ApiError("Invalid ranking ID."); }
    const response = await backend(`/data/ranking_entries?id=eq.${body.id}`, token, { method: "DELETE" });
    if (!response.ok) throw new ApiError("Could not delete this result. Check Firestore rules and try again.", 502);
    return json({ ok: true });
  } catch (error) { return apiError(error); }
}
