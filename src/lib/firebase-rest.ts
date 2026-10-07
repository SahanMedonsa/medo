import { firebaseConfig } from "./firebase-config";

type Value = { stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean; nullValue?: null; timestampValue?: string };
type Document = { name: string; fields?: Record<string, Value> };

export function encodeFields(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key,
    value === null ? { nullValue: null } : typeof value === "boolean" ? { booleanValue: value } :
    typeof value === "number" ? (Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }) : { stringValue: String(value) },
  ]));
}

export function decodeDocument(document: Document) {
  return { ...Object.fromEntries(Object.entries(document.fields ?? {}).map(([key, value]) => [key,
    value.stringValue ?? value.timestampValue ?? value.booleanValue ?? (value.integerValue !== undefined ? Number(value.integerValue) : value.doubleValue ?? null),
  ])), id: document.name.split("/").at(-1) };
}

const base = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;

async function call(url: string, token?: string, init: RequestInit = {}) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(10000) });
}

// Uses end-user Firebase ID tokens, so Firestore rules apply to every database operation.
export async function firebaseRequest(path: string, token?: string, init: RequestInit = {}) {
  const url = new URL(path, "https://local");
  const body = init.body ? JSON.parse(String(init.body)) : {};
  if (url.pathname === "/auth/login") {
    const response = await call(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, undefined, {
      method: "POST", body: JSON.stringify({ ...body, returnSecureToken: true }),
    });
    const data = await response.json();
    if (!response.ok) return Response.json({}, { status: data.error?.message === "TOO_MANY_ATTEMPTS_TRY_LATER" ? 429 : 401 });
    return Response.json({ access_token: data.idToken, expires_in: Number(data.expiresIn) });
  }
  if (url.pathname === "/auth/user") {
    const response = await call(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`, undefined, {
      method: "POST", body: JSON.stringify({ idToken: token }),
    });
    const data = await response.json();
    if (!response.ok || !data.users?.[0] || data.users[0].disabled) return Response.json({}, { status: 401 });
    return Response.json({ id: data.users[0].localId, email: data.users[0].email });
  }
  const collection = url.pathname.split("/")[2];
  if (!["admins", "modules", "lesson_folders", "pdfs", "pdf_folders", "ranking_papers", "ranking_entries", "online_classes"].includes(collection)) throw new Error("Unsupported collection");
  if (collection === "admins") {
    const uid = url.searchParams.get("user_id")?.replace(/^eq\./, "");
    if (!uid || init.method) return Response.json({}, { status: 400 });
    const response = await call(`${base}/admins/${encodeURIComponent(uid)}`, token);
    if (response.status === 404) return Response.json([]);
    if (!response.ok) return response;
    return Response.json([{ user_id: uid }]);
  }
  const id = url.searchParams.get("id")?.replace(/^eq\./, "");
  if (init.method === "POST" || init.method === "PATCH") {
    if (init.method === "PATCH" && !id) return Response.json({}, { status: 400 });
    const documentId = id ?? crypto.randomUUID();
    const fields = init.method === "POST" ? { ...body, created_at: new Date().toISOString() } : body;
    const params = new URLSearchParams({ "currentDocument.exists": init.method === "POST" ? "false" : "true" });
    for (const key of Object.keys(fields)) params.append("updateMask.fieldPaths", key);
    const response = await call(`${base}/${collection}/${documentId}?${params}`, token, {
      method: "PATCH", body: JSON.stringify({ fields: encodeFields(fields) }),
    });
    if (!response.ok) return response;
    return Response.json([decodeDocument(await response.json())]);
  }
  if (init.method === "DELETE") {
    if (!id) return Response.json({}, { status: 400 });
    const response = await call(`${base}/${collection}/${id}`, token, { method: "DELETE" });
    return response.ok ? Response.json([]) : response;
  }
  if (id) {
    const response = await call(`${base}/${collection}/${id}`, token);
    if (response.status === 404) return Response.json([]);
    if (!response.ok) return response;
    const document = decodeDocument(await response.json()) as Record<string, unknown>;
    const category = url.searchParams.get("category")?.replace(/^eq\./, "");
    return Response.json(category && document.category !== category ? [] : [document]);
  }
  const publishedOnly = url.searchParams.get("published") === "eq.true";
  const response = await call(`${base}:runQuery`, token, {
    method: "POST", body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: collection }],
      ...(publishedOnly ? { where: { fieldFilter: { field: { fieldPath: "published" }, op: "EQUAL", value: { booleanValue: true } } } } : {}),
    } }),
  });
  if (!response.ok) return response;
  const rows = await response.json();
  const documents = rows.filter((row: { document?: Document }) => row.document).map((row: { document: Document }) => decodeDocument(row.document));
  documents.sort((a: Record<string, unknown>, b: Record<string, unknown>) => String(b.created_at).localeCompare(String(a.created_at)));
  return Response.json(documents);
}
