"use client";

import { Download, FileText, Plus, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { PdfTute, googleDriveFileUrl } from "@/lib/pdfs";
import { demoPdfs } from "@/lib/demo-pdfs";

export default function PdfTutes({ admin, demo, query }: { admin: boolean; demo: boolean; query: string }) {
  const [pdfs, setPdfs] = useState<PdfTute[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let items: PdfTute[];
        if (demo) items = (await demoPdfs("list")) as PdfTute[];
        else {
          const response = await fetch(`/api/pdfs${admin ? "?admin=true" : ""}`, { cache: "no-store" });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          items = data.pdfs;
        }
        if (!cancelled) { setPdfs(items.filter((item) => admin || item.published)); setError(""); }
      } catch (error) { if (!cancelled) setError((error as Error).message); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [admin, demo, retry]);

  useEffect(() => {
    if (open) dialog.current?.showModal(); else dialog.current?.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    setBusy(true); setError("");
    try {
      const drive_url = googleDriveFileUrl(String(form.get("drive_url")));
      let pdf: PdfTute;
      if (demo) {
        pdf = { id: crypto.randomUUID(), title: String(form.get("title")).trim(), description: String(form.get("description")).trim(), filename: "tute.pdf", size: 0, drive_url, published: form.get("published") === "true", created_at: new Date().toISOString() };
        await demoPdfs("save", pdf);
      } else {
        const response = await fetch("/api/pdfs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.get("title"), description: form.get("description"), drive_url, published: form.get("published") === "true" }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        pdf = data.pdf;
      }
      setPdfs((items) => [pdf, ...items]); formElement.reset(); setOpen(false);
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }

  async function change(pdf: PdfTute, remove = false) {
    if (remove && !confirm(pdf.drive_url ? `Remove “${pdf.title}” from this website? The file stays in Google Drive.` : `Delete “${pdf.title}” and its PDF file?`)) return;
    setBusy(true); setError("");
    try {
      if (demo) {
        if (remove) await demoPdfs("delete", pdf.id);
        else {
          const saved = await demoPdfs("get", pdf.id);
          if (!saved || Array.isArray(saved)) throw new Error("PDF not found.");
          await demoPdfs("save", { ...saved, published: !pdf.published });
        }
      } else {
        const response = await fetch("/api/pdfs", { method: remove ? "DELETE" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: pdf.id, published: !pdf.published }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
      }
      setPdfs((items) => remove ? items.filter((item) => item.id !== pdf.id) : items.map((item) => item.id === pdf.id ? { ...item, published: !item.published } : item));
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }

  async function download(pdf: PdfTute) {
    setBusy(true); setError("");
    try {
      let blob: Blob;
      if (demo) {
        const saved = await demoPdfs("get", pdf.id);
        if (!saved || Array.isArray(saved) || !saved.file) throw new Error("PDF file not found in this browser.");
        blob = saved.file;
      } else {
        const response = await fetch(`/api/pdfs?id=${pdf.id}`);
        if (!response.ok) { const data = await response.json(); throw new Error(data.error); }
        blob = await response.blob();
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = pdf.filename;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }

  const shown = pdfs.filter((pdf) => (pdf.title + pdf.description).toLowerCase().includes(query.toLowerCase()));
  return <section className="pdf-tutes">
    <div className="catalog-toolbar"><h2>PDF tutes</h2>{admin && <button className="purchase-button add-video-button" onClick={() => { setError(""); setOpen(true); }}><Plus size={18} /> Add PDF</button>}</div>
    {error && !open && <div className="admin-message error" role="alert">{error} <button className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Reload PDFs</button></div>}
    {loading ? <p role="status">Loading PDFs…</p> : <div className="lesson-grid video-grid">{shown.map((pdf) => <article className="lesson-folder-card" key={pdf.id}>
      <span className="folder-symbol"><FileText size={32} /></span><h3>{pdf.title}</h3><p className="folder-description">{pdf.description}</p>
      <p className="admin-caption">{pdf.drive_url ? "PDF · Google Drive" : `PDF · ${(pdf.size / 1024 / 1024).toFixed(2)} MB`}</p>
      {admin && <div className="student-access"><span>{pdf.published ? "Enabled for students" : "Disabled for students"}</span><button className="access-switch" role="switch" aria-checked={pdf.published} aria-label={`Student access to ${pdf.title}`} disabled={busy} onClick={() => change(pdf)}><span /></button></div>}
      <div className="card-actions">{admin && <button className="secondary-button danger-button" disabled={busy} onClick={() => change(pdf, true)}>Delete</button>}{pdf.drive_url ? <a className="purchase-button add-video-button" href={googleDriveFileUrl(pdf.drive_url)} target="_blank" rel="noopener noreferrer"><Download size={17} /> Open in Drive to download</a> : <button className="purchase-button add-video-button" disabled={busy} onClick={() => download(pdf)}><Download size={17} /> Download PDF</button>}</div>
    </article>)}</div>}
    {!loading && !error && shown.length === 0 && <p className="admin-caption">{query ? "No matching PDFs." : admin ? "Add a Google Drive PDF link for students." : "PDF tutes will appear here when published."}</p>}
    <dialog ref={dialog} className="video-editor-dialog" aria-labelledby="pdf-upload-title" onCancel={(event) => { if (busy) event.preventDefault(); else setOpen(false); }}>
      <section className="admin-panel"><div className="editor-heading"><h2 id="pdf-upload-title">Add PDF tute</h2><button className="close-button" aria-label="Close PDF upload" disabled={busy} onClick={() => setOpen(false)}><X size={22} /></button></div>
        <form className="module-form" onSubmit={upload}><fieldset disabled={busy}>
          <label>Title<input name="title" required maxLength={200} placeholder="#tute 01 — Algebra" /></label>
          <label>Description<textarea name="description" rows={3} maxLength={5000} /></label>
          <a href="https://drive.google.com/drive/my-drive" target="_blank" rel="noopener noreferrer" className="secondary-button">Open Google Drive to upload ↗</a>
          <label>Google Drive sharing link<input name="drive_url" type="url" required placeholder="https://drive.google.com/file/d/…/view" /></label>
          <p className="admin-caption">Upload your PDF to Drive. Set Share → General access to “Anyone with the link” and “Viewer”, and allow downloads. Paste the link here.</p>
          <p className="admin-caption">Disabling this listing hides it here; it does not change Google Drive sharing permissions.</p>
          <label className="checkbox-label"><input name="published" value="true" type="checkbox" /> Enable download for students</label>
          {error && <p className="admin-message error" role="alert">{error}</p>}
          <button className="purchase-button" type="submit">{busy ? "Saving…" : "Save Drive link"}</button>
        </fieldset></form>
      </section>
    </dialog>
  </section>;
}
