import { cookies } from "next/headers";
import { ApiError, apiError, assertSameOrigin, backend, json, requireAdmin } from "@/lib/backend";
import { storagePdf } from "@/lib/pdf-storage";
import { maxPdfBytes, validatePdf, googleDriveFileUrl } from "@/lib/pdfs";

function validId(id: unknown): asserts id is string {
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new ApiError("Invalid PDF ID.");
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (id) {
      validId(id);
      const token = (await cookies()).get("admin_session")?.value;
      // First try public access so an expired admin cookie cannot block published downloads.
      let metadata = await backend(`/data/pdfs?id=eq.${id}`);
      if (!metadata.ok && token) metadata = await backend(`/data/pdfs?id=eq.${id}`, token);
      if (!metadata.ok) throw new ApiError("This PDF is unavailable.", 404);
      const documents = await metadata.json();
      if (!documents.length) throw new ApiError("PDF not found.", 404);
      const pdf = documents[0];
      if (pdf.drive_url) return new Response(null, { status: 302, headers: { Location: googleDriveFileUrl(pdf.drive_url), "Cache-Control": "private, no-store" } });
      const response = await storagePdf(id, pdf.published ? undefined : token);
      if (!response.ok) throw new ApiError("Could not download this PDF. Please try again.", 502);
      const name = String(pdf.filename).replace(/[\r\n]/g, "");
      return new Response(response.body, { headers: {
        "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="tute.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      } });
    }
    const token = url.searchParams.get("admin") === "true" ? (await requireAdmin()).token : undefined;
    const response = await backend(`/data/pdfs?${token ? "" : "published=eq.true&"}order=created_at.desc`, token);
    if (!response.ok) throw new ApiError("Could not load PDFs. Check Firebase rules.", 503);
    return json({ pdfs: await response.json() });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { token } = await requireAdmin();
    if (request.headers.get("content-type")?.includes("application/json")) {
      const raw = await request.text();
      if (raw.length > 10000) throw new ApiError("Request is too large.", 413);
      let body;
      try { body = JSON.parse(raw); } catch { throw new ApiError("Invalid request."); }
      if (!body || typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 200 ||
        typeof body.description !== "string" || body.description.length > 5000 || typeof body.published !== "boolean" || typeof body.drive_url !== "string") throw new ApiError("Enter a title, description and Drive link.");
      let drive_url;
      try { drive_url = googleDriveFileUrl(body.drive_url); } catch (error) { throw new ApiError((error as Error).message); }
      const saved = await backend("/data/pdfs", token, { method: "POST", body: JSON.stringify({
        title: body.title.trim(), description: body.description.trim(), drive_url, filename: "tute.pdf", size: 0, published: body.published,
      }) });
      if (!saved.ok) throw new ApiError("Could not save Drive link. Publish the updated Firestore rules.", 502);
      return json({ pdf: (await saved.json())[0] });
    }
    if (Number(request.headers.get("content-length")) > maxPdfBytes + 50000) throw new ApiError("PDF must be 3 MB or smaller.", 413);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError("Choose a PDF file.");
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();
    try { await validatePdf(file, title, description); } catch (error) { throw new ApiError((error as Error).message); }
    const published = form.get("published") === "true";
    const id = crypto.randomUUID();
    const upload = await storagePdf(id, token, "POST", file);
    if (!upload.ok) throw new ApiError("Upload failed. Enable Firebase Storage and publish storage.rules.", 502);
    const saved = await backend(`/data/pdfs?id=eq.${id}`, token, { method: "POST", body: JSON.stringify({ title, description, filename: file.name.slice(0, 200), size: file.size, published }) });
    if (!saved.ok) {
      await storagePdf(id, token, "DELETE").catch(() => undefined);
      throw new ApiError("Could not save PDF details. Check Firestore rules and try again.", 502);
    }
    return json({ pdf: (await saved.json())[0] });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const { token } = await requireAdmin();
    const body = await request.json();
    validId(body.id);
    if (typeof body.published !== "boolean") throw new ApiError("Invalid visibility.");
    const response = await backend(`/data/pdfs?id=eq.${body.id}`, token, { method: "PATCH", body: JSON.stringify({ published: body.published }) });
    if (!response.ok) throw new ApiError("Could not change PDF visibility.", 502);
    return json({ pdf: (await response.json())[0] });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const { token } = await requireAdmin();
    const { id } = await request.json();
    validId(id);
    const hidden = await backend(`/data/pdfs?id=eq.${id}`, token, { method: "PATCH", body: JSON.stringify({ published: false }) });
    if (!hidden.ok) throw new ApiError("Could not disable the PDF before deletion.", 502);
    const documents = await hidden.json();
    if (!documents[0]?.drive_url) {
      const removed = await storagePdf(id, token, "DELETE");
      if (!removed.ok && removed.status !== 404) throw new ApiError("PDF disabled, but the file could not be deleted. Try again.", 502);
    }
    const response = await backend(`/data/pdfs?id=eq.${id}`, token, { method: "DELETE" });
    if (!response.ok) throw new ApiError("File removed. Retry to remove its listing.", 502);
    return json({ ok: true });
  } catch (error) { return apiError(error); }
}
