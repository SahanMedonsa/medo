import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function source(path, replacements = {}) {
  let input = await readFile(new URL(path, import.meta.url), "utf8");
  for (const [from, to] of Object.entries(replacements)) input = input.replaceAll(from, to);
  return "data:text/javascript;base64," + Buffer.from(ts.transpileModule(input, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64");
}
const configUrl = await source("../src/lib/firebase-config.ts");
const restUrl = await source("../src/lib/firebase-rest.ts", { '"./firebase-config"': JSON.stringify(configUrl) });
const modulesUrl = await source("../src/lib/modules.ts");
const cookieUrl = "data:text/javascript," + encodeURIComponent("export async function cookies() { return globalThis.testCookies; }");
const backendUrl = await source("../src/lib/backend.ts", { '"next/headers"': JSON.stringify(cookieUrl), '"./firebase-rest"': JSON.stringify(restUrl) });
const substitutions = { '"next/headers"': JSON.stringify(cookieUrl), '"@/lib/backend"': JSON.stringify(backendUrl), '"@/lib/modules"': JSON.stringify(modulesUrl) };
const admin = await import(await source("../src/app/api/admin/route.ts", substitutions));
const catalogUrl = await source("../src/app/api/modules/route.ts", substitutions);
const catalog = await import(catalogUrl);
const student = await import(await source("../src/app/api/student/route.ts", { '"../modules/route"': JSON.stringify(catalogUrl) }));
const { youtubeId, validateModule, validateFolder, contentMedium } = await import(modulesUrl);
const { firebaseRequest, encodeFields, decodeDocument } = await import(restUrl);
const id = "dQw4w9WgXcQ";
const uuid = "12345678-1234-1234-1234-123456789012";
const valid = { title: "Algebra", description: "Lesson", url: "https://youtu.be/" + id, category: "2026 O/L Maths", published: false, folder_id: null };
const post = (body, origin = "http://localhost:3000") => new Request("http://localhost:3000/api/admin", { method: "POST", headers: { Origin: origin }, body: JSON.stringify(body) });

test("YouTube formats and folder input validation", () => {
  for (const url of ["https://youtu.be/" + id, "https://www.youtube.com/watch?v=" + id, "https://youtube.com/shorts/" + id]) assert.equal(youtubeId(url), id);
  for (const url of ["https://youtube.com.evil.test/watch?v=" + id, "javascript:alert(1)", "https://youtu.be/no", "https://user:pass@youtube.com/watch?v=" + id]) assert.equal(youtubeId(url), null);
  assert.equal(validateModule(valid).published, false);
  assert.throws(() => validateModule({ ...valid, folder_id: "bad" }));
  const folder = { title: "Algebra", description: "Practice", category: valid.category, marks: 20, planned_videos: 5 };
  assert.equal(validateFolder(folder).marks, 20);
  for (const change of [{ marks: -1 }, { planned_videos: 0 }, { description: "" }, { planned_videos: 1.5 }]) assert.throws(() => validateFolder({ ...folder, ...change }));
});

test("Firestore fields preserve false, zero, null and Sinhala", () => {
  const fields = encodeFields({ title: "ගණිතය", marks: 0, published: false, folder_id: null });
  assert.deepEqual(decodeDocument({ name: "projects/medonsa/databases/(default)/documents/modules/test", fields }), { id: "test", title: "ගණිතය", marks: 0, published: false, folder_id: null });
});

test("Firebase authentication, admin authorization, queries and mutations", async (t) => {
  const original = globalThis.fetch;
  const oldDemo = process.env.LOCAL_DEMO;
  process.env.LOCAL_DEMO = "false";
  const jar = new Map();
  globalThis.testCookies = { get: (name) => jar.has(name) ? { value: jar.get(name) } : undefined, set: (name, value, options) => { assert.equal(options.httpOnly, true); jar.set(name, value); }, delete: (name) => jar.delete(name) };
  t.after(() => { globalThis.fetch = original; delete globalThis.testCookies; if (oldDemo === undefined) delete process.env.LOCAL_DEMO; else process.env.LOCAL_DEMO = oldDemo; });
  let isAdmin = false;
  let writes = 0;
  globalThis.fetch = async (url, options) => {
    const address = String(url);
    const body = options.body ? JSON.parse(options.body) : {};
    if (address.includes("accounts:signInWithPassword")) {
      assert.equal(body.returnSecureToken, true);
      return Response.json({ idToken: "firebase-token", expiresIn: "3600" });
    }
    if (address.includes("accounts:lookup")) {
      assert.equal(body.idToken, "firebase-token");
      return Response.json({ users: [{ localId: "user123", email: "user@example.com" }] });
    }
    if (address.includes("/admins/user123")) return isAdmin ? Response.json({ name: "admins/user123", fields: {} }) : new Response(null, { status: 404 });
    if (address.includes(":runQuery")) {
      if (body.structuredQuery.from[0].collectionId === "modules" && !isAdmin) assert.equal(body.structuredQuery.where.fieldFilter.value.booleanValue, true);
      return Response.json([]);
    }
    if (options.method === "PATCH") {
      writes++;
      assert.equal(options.headers.get("Authorization"), "Bearer firebase-token");
      assert.ok(address.includes("updateMask.fieldPaths="));
      if (address.includes("currentDocument.exists=false")) assert.ok(body.fields.created_at);
      else assert.ok(address.includes("currentDocument.exists=true"));
      return Response.json({ name: "modules/" + uuid, fields: body.fields });
    }
    if (options.method === "DELETE") return new Response(null, { status: 204 });
    throw new Error("Unexpected Firebase request");
  };
  for (const action of ["save", "save_folder", "delete", "preview"]) {
    assert.equal((await admin.POST(post({ action, ...valid }))).status, 401);
    assert.equal((await admin.POST(post({ action, ...valid }, "https://evil.test"))).status, 403);
  }
  assert.equal((await admin.POST(post({ action: "login", email: "user@example.com", password: "test" }))).status, 403);
  assert.equal(jar.has("admin_session"), false);
  assert.equal((await admin.POST(post({ action: "save", ...valid }))).status, 401);
  assert.deepEqual(await (await student.GET()).json(), { modules: [], folders: [] });
  assert.equal(student.POST, undefined);
  assert.deepEqual(await (await catalog.GET()).json(), { modules: [], folders: [] });
  isAdmin = true;
  assert.equal((await admin.POST(post({ action: "login", email: "user@example.com", password: "test" }))).status, 200);
  assert.equal((await admin.POST(post({ action: "save", ...valid }))).status, 200);
  assert.equal((await admin.POST(post({ action: "save", ...valid, id: uuid, published: true }))).status, 200);
  assert.equal((await admin.POST(post({ action: "save_folder", title: "Topic", description: "Practice", category: valid.category, marks: 10, planned_videos: 3 }))).status, 200);
  const tute = await admin.POST(post({ action: "save", ...valid, category: "#tute", title: "නිකමට බලන්න Tute #01", description: "" }));
  assert.equal(tute.status, 200);
  const savedTute = (await tute.json()).module;
  assert.equal(savedTute.category, "#tute");
  assert.equal(savedTute.folder_id, null);
  assert.equal(savedTute.published, false);
  assert.equal(writes, 4);
  const successfulFetch = globalThis.fetch;
  for (const status of [401, 403]) {
    globalThis.fetch = async (url, options) => options.method === "PATCH"
      ? new Response(null, { status }) : successfulFetch(url, options);
    const failedSave = await admin.POST(post({ action: "save", ...valid, category: "#tute" }));
    assert.equal(failedSave.status, status);
    assert.match((await failedSave.json()).error, status === 403 ? /firestore.rules/ : /sign in again/);
  }
  globalThis.fetch = successfulFetch;
  assert.equal(jar.has("admin_session"), true);
  globalThis.fetch = async () => Response.json({ error: { message: "INVALID_LOGIN_CREDENTIALS" } }, { status: 400 });
  assert.equal((await firebaseRequest("/auth/login", undefined, { method: "POST", body: JSON.stringify({ email: "a@b.com", password: "bad" }) })).status, 401);
});

test("Demo remains explicit, browser-only and disabled in production", async (t) => {
  const oldEnv = process.env.NODE_ENV, oldDemo = process.env.LOCAL_DEMO;
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const memory = new Map();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) } });
  t.after(() => {
    if (oldStorage) Object.defineProperty(globalThis, "localStorage", oldStorage); else delete globalThis.localStorage;
    if (oldEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldEnv;
    if (oldDemo === undefined) delete process.env.LOCAL_DEMO; else process.env.LOCAL_DEMO = oldDemo;
  });
  const { demoEnabled } = await import(backendUrl);
  process.env.NODE_ENV = "development"; process.env.LOCAL_DEMO = "true"; assert.equal(demoEnabled(), true);
  process.env.NODE_ENV = "production"; assert.equal(demoEnabled(), false);
  const { saveDemo, readDemo } = await import(await source("../src/lib/demo-store.ts", { '"./modules"': JSON.stringify(modulesUrl) }));
  const { folder } = saveDemo({ action: "save_folder", title: "Topic", description: "Notes", category: valid.category, marks: 10, planned_videos: 3 });
  const { module: video } = saveDemo({ action: "save", ...valid, folder_id: folder.id });
  assert.equal(readDemo().modules[0].folder_id, folder.id);
  saveDemo({ action: "delete", id: video.id });
  assert.equal(readDemo().modules.length, 0);
});

test("PDF validation accepts PDFs and rejects renamed files, empty titles and oversized files", async () => {
  const { validatePdf, maxPdfBytes } = await import(await source("../src/lib/pdfs.ts"));
  await validatePdf(new File(["%PDF-1.7\ncontent"], "tute.pdf", { type: "application/pdf" }), "#tute", "Notes");
  await assert.rejects(validatePdf(new File(["not a pdf"], "renamed.pdf", { type: "application/pdf" }), "Tute", ""));
  await assert.rejects(validatePdf(new File(["%PDF-1.7"], "notes.txt"), "Tute", ""));
  await assert.rejects(validatePdf(new File(["%PDF-1.7"], "tute.pdf"), "", ""));
  await assert.rejects(validatePdf(new File([new Uint8Array(maxPdfBytes + 1)], "large.pdf"), "Tute", ""));
});

test("PDF upload/delete/toggle require admin and download does not expose draft files", async (t) => {
  const original = globalThis.fetch;
  const jar = new Map();
  globalThis.testCookies = { get: (name) => jar.has(name) ? { value: jar.get(name) } : undefined };
  t.after(() => { globalThis.fetch = original; delete globalThis.testCookies; });
  const pdfUrl = await source("../src/lib/pdfs.ts");
  const storageUrl = await source("../src/lib/pdf-storage.ts", { '"./firebase-config"': JSON.stringify(configUrl) });
  const routes = await import(await source("../src/app/api/pdfs/route.ts", { ...substitutions, '"@/lib/pdf-storage"': JSON.stringify(storageUrl), '"@/lib/pdfs"': JSON.stringify(pdfUrl) }));
  globalThis.fetch = async () => { throw new Error("No remote access expected"); };
  for (const method of ["POST", "PATCH", "DELETE"]) {
    const request = new Request("http://localhost:3000/api/pdfs", { method, headers: { Origin: "http://localhost:3000" }, body: "{}" });
    assert.equal((await routes[method](request)).status, 401);
  }
  assert.equal((await routes.GET(new Request("http://localhost:3000/api/pdfs?admin=true"))).status, 401);
  assert.equal((await routes.GET(new Request("http://localhost:3000/api/pdfs?id=bad"))).status, 400);
  globalThis.fetch = async () => new Response(null, { status: 403 });
  assert.equal((await routes.GET(new Request("http://localhost:3000/api/pdfs?id=" + uuid))).status, 404);
  globalThis.fetch = async (url) => {
    if (String(url).includes("firestore.googleapis.com")) return Response.json({ name: "pdfs/" + uuid, fields: encodeFields({ filename: "tute.pdf", published: true }) });
    assert.ok(String(url).includes("?alt=media"));
    return new Response("%PDF-1.7");
  };
  const download = await routes.GET(new Request("http://localhost:3000/api/pdfs?id=" + uuid));
  assert.equal(download.status, 200);
  assert.equal(download.headers.get("Content-Type"), "application/pdf");
  assert.ok(download.headers.get("Content-Disposition").startsWith("attachment;"));
  assert.equal(await download.text(), "%PDF-1.7");
});

test("Drive links normalize file URLs and preserve resource keys without allowing foreign hosts", async () => {
  const { googleDriveFileUrl } = await import(await source("../src/lib/pdfs.ts"));
  const id = "abcdefghijklmnop123";
  assert.equal(googleDriveFileUrl(`https://drive.google.com/file/d/${id}/view?usp=sharing&resourcekey=0-abc`), `https://drive.google.com/file/d/${id}/view?resourcekey=0-abc`);
  assert.equal(googleDriveFileUrl(`https://drive.google.com/open?id=${id}`), `https://drive.google.com/file/d/${id}/view`);
  for (const link of [`https://drive.google.com.evil.test/file/d/${id}/view`, "javascript:alert(1)", `https://drive.google.com/drive/folders/${id}`, `https://user:pass@drive.google.com/file/d/${id}/view`]) assert.throws(() => googleDriveFileUrl(link));
});

test("Drive listings save metadata and delete without touching Google Drive or Firebase Storage", async (t) => {
  const original = globalThis.fetch;
  globalThis.testCookies = { get: () => ({ value: "admin-token" }) };
  t.after(() => { globalThis.fetch = original; delete globalThis.testCookies; });
  const pdfUrl = await source("../src/lib/pdfs.ts");
  const storageUrl = await source("../src/lib/pdf-storage.ts", { '"./firebase-config"': JSON.stringify(configUrl) });
  const routes = await import(await source("../src/app/api/pdfs/route.ts", { ...substitutions, '"@/lib/pdf-storage"': JSON.stringify(storageUrl), '"@/lib/pdfs"': JSON.stringify(pdfUrl) }));
  const drive_url = "https://drive.google.com/file/d/abcdefghijklmnop123/view";
  globalThis.fetch = async (url, options) => {
    assert.ok(!String(url).includes("firebasestorage.googleapis.com"));
    const body = options.body ? JSON.parse(options.body) : {};
    if (String(url).includes("accounts:lookup")) return Response.json({ users: [{ localId: "admin-id", email: "admin@example.com" }] });
    if (String(url).includes("/admins/")) return Response.json({ name: "admins/admin-id", fields: {} });
    if (options.method === "DELETE") return new Response(null, { status: 204 });
    return Response.json({ name: "pdfs/" + uuid, fields: { ...encodeFields({ drive_url, title: "Tute", filename: "tute.pdf", size: 0 }), ...body.fields } });
  };
  const request = (method, body) => new Request("http://localhost:3000/api/pdfs", { method, headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const response = await routes.POST(request("POST", { title: "Tute", description: "", drive_url, published: true }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).pdf.drive_url, drive_url);
  assert.equal((await routes.DELETE(request("DELETE", { id: uuid }))).status, 200);
});


test("Teaching medium validates input and defaults legacy content to Sinhala", () => {
  assert.equal(contentMedium({}), "si");
  assert.equal(validateModule(valid).medium, "si");
  assert.equal(validateModule({ ...valid, medium: "en" }).medium, "en");
  const folder = { title: "English algebra", description: "Practice", category: valid.category, marks: 10, planned_videos: 3 };
  assert.equal(validateFolder(folder).medium, "si");
  assert.equal(validateFolder({ ...folder, medium: "en" }).medium, "en");
  for (const medium of ["ta", "English", "", null, 1]) {
    assert.throws(() => validateModule({ ...valid, medium }));
    assert.throws(() => validateFolder({ ...folder, medium }));
  }
});

test("API rejects videos assigned to a folder in another medium", async (t) => {
  const original = globalThis.fetch;
  globalThis.testCookies = { get: () => ({ value: "admin-token" }) };
  t.after(() => { globalThis.fetch = original; delete globalThis.testCookies; });
  let folderMedium = "si";
  let writes = 0;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes("accounts:lookup")) return Response.json({ users: [{ localId: "admin-id", email: "admin@example.com" }] });
    if (String(url).includes("/admins/")) return Response.json({ name: "admins/admin-id", fields: {} });
    if (options.method === "PATCH") {
      writes++;
      return Response.json({ name: "modules/" + uuid, fields: JSON.parse(options.body).fields });
    }
    return Response.json({ name: "lesson_folders/" + uuid, fields: encodeFields({ category: valid.category, medium: folderMedium }) });
  };
  const save = () => admin.POST(post({ action: "save", ...valid, medium: "en", folder_id: uuid }));
  assert.equal((await save()).status, 400);
  assert.equal(writes, 0);
  folderMedium = "en";
  const response = await save();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).module.medium, "en");
  assert.equal(writes, 1);
  const changeFolder = await admin.POST(post({ action: "save_folder", id: uuid, title: "Topic", description: "Notes", category: valid.category, medium: "si", planned_videos: 3, marks: 10 }));
  assert.equal(changeFolder.status, 400);
  assert.equal(writes, 1);
});
