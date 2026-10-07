"use client";

import { ContentOrder, orderByCreated } from "@/lib/content-order";

import { Download, FileText, Plus, X, FolderOpen, ArrowLeft, ExternalLink, Search } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { PdfTute, PdfFolder, googleDriveFileUrl, googleDrivePreviewUrl, validatePdfFolder } from "@/lib/pdfs";
import { demoPdfs, demoPdfFolders } from "@/lib/demo-pdfs";

export default function PdfTutes({ admin, demo, medium, contentOrder }: { contentOrder?: ContentOrder; admin: boolean; demo: boolean; medium: "si" | "en" }) {
  const [query, setQuery] = useState("");
  const [folders, setFolders] = useState<PdfFolder[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [folderOpen, setFolderOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<PdfFolder | null>(null);
  const [editingPdf, setEditingPdf] = useState<PdfTute | null>(null);
  const activeFolder = folders.find((folder) => folder.id === activeId);
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
        let loadedFolders: PdfFolder[];
        if (demo) loadedFolders = await demoPdfFolders();
        else {
          const response = await fetch("/api/pdf-folders", { cache: "no-store" });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          loadedFolders = data.folders;
        }
        let items: PdfTute[];
        if (demo) items = (await demoPdfs("list")) as PdfTute[];
        else {
          const response = await fetch(`/api/pdfs${admin ? "?admin=true" : ""}`, { cache: "no-store" });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          items = data.pdfs;
        }
        if (!cancelled) { setFolders(loadedFolders); setPdfs(items.filter((item) => admin || item.published)); setError(""); }
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

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const value = validatePdfFolder({ name: form.get("name"), grade: form.get("grade"), medium });
      let folder: PdfFolder;
      if (demo) {
        folder = { ...value, id: editingFolder?.id ?? crypto.randomUUID(), created_at: editingFolder?.created_at ?? new Date().toISOString() };
        await demoPdfFolders(folder);
      } else {
        const response = await fetch("/api/pdf-folders", { method: editingFolder ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...value, id: editingFolder?.id }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        folder = data.folder;
      }
      setFolders((items) => [folder, ...items.filter((item) => item.id !== folder.id)]); setFolderOpen(false); setActiveId(folder.id); setQuery(""); setOpen(false);
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    setBusy(true); setError("");
    try {
      if (!activeFolder && !editingPdf) throw new Error("Open a folder before adding a tute.");
      const drive_url = editingPdf && !editingPdf.drive_url ? undefined : googleDriveFileUrl(String(form.get("drive_url")));
      let pdf: PdfTute;
      if (demo) {
        pdf = { ...editingPdf, folder_id: editingPdf?.folder_id ?? activeFolder?.id, id: editingPdf?.id ?? crypto.randomUUID(), title: String(form.get("title")).trim(), description: String(form.get("description")).trim(), filename: editingPdf?.filename ?? "tute.pdf", size: editingPdf?.size ?? 0, ...(drive_url ? { drive_url } : {}), published: form.get("published") === "true", created_at: editingPdf?.created_at ?? new Date().toISOString() };
        await demoPdfs("save", pdf);
      } else {
        const response = await fetch("/api/pdfs", { method: editingPdf ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingPdf?.id, folder_id: activeFolder?.id, title: form.get("title"), description: form.get("description"), drive_url, published: form.get("published") === "true" }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        pdf = data.pdf;
      }
      setPdfs((items) => [pdf, ...items.filter((item) => item.id !== pdf.id)]); formElement.reset(); setOpen(false);
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

  const matches = (value: string) => value.toLowerCase().includes(query.toLowerCase());
  const shown = pdfs.filter((pdf) => (activeId === "unfiled" ? !pdf.folder_id : pdf.folder_id === activeId) && matches(pdf.title + " " + pdf.description));
  const shownFolders = folders.filter((folder) => folder.medium === medium && (matches(folder.name + " " + folder.grade) || pdfs.some((pdf) => pdf.folder_id === folder.id && matches(pdf.title))));
  const unfiled = pdfs.filter((pdf) => !pdf.folder_id);
  return <section className="pdf-tutes">
    <div className="category-title tute-title-bar">
      <h1>O/L Maths Tutes</h1>
    </div>
    {activeId && <div className="tute-folder-summary"><button className="tute-back" aria-label="Back to all tute folders" onClick={() => { setActiveId(null); setQuery(""); }}><ArrowLeft size={18} /><span>Back</span></button><h2>{activeFolder?.name ?? "Unfiled tutes"}</h2>{activeFolder && <span>{/^grade\b/i.test(activeFolder.grade) ? activeFolder.grade : `Grade ${activeFolder.grade}`}</span>}</div>}
    <div className="catalog-toolbar"><h2>{activeId ? "PDF tutes" : "Tute folders"}</h2><div className="catalog-controls">
      {admin && !loading && (!activeId || activeFolder) && <button className="purchase-button add-video-button" onClick={() => { setError(""); setEditingFolder(null); setEditingPdf(null); setFolderOpen(!activeId); setOpen(true); }}><Plus size={18} />{activeId ? "Add tute" : "Create folder"}</button>}
      <label className="lesson-search"><Search size={18} /><input aria-label="Search tutes and folders" placeholder="Search tutes..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    </div></div>
    {!loading && !activeId && <div className="lesson-grid folder-grid tute-grid">{(admin && contentOrder ? orderByCreated(shownFolders, contentOrder) : shownFolders).map((folder) => <article className="lesson-folder-card" key={folder.id}>
      <span className="folder-symbol"><FolderOpen size={32} /></span><h3>{folder.name}</h3><p>Grade: {folder.grade}</p><p className="admin-caption">{pdfs.filter((pdf) => pdf.folder_id === folder.id).length} tutes</p>
      {admin && <button className="secondary-button" disabled={busy} onClick={() => { setEditingFolder(folder); setEditingPdf(null); setFolderOpen(true); setError(""); setOpen(true); }}>Edit</button>}
      <button className="purchase-button" onClick={() => { setActiveId(folder.id); setQuery(""); }}>Open folder</button>
    </article>)}{unfiled.length > 0 && <article className="lesson-folder-card"><span className="folder-symbol"><FolderOpen size={32} /></span><h3>Unfiled tutes</h3><p>Previously added PDFs</p><button className="purchase-button" onClick={() => { setActiveId("unfiled"); setQuery(""); }}>Open folder</button></article>}</div>}
    {error && !open && <div className="admin-message error" role="alert">{error} <button className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Reload PDFs</button></div>}
    {loading ? <p role="status">Loading PDFs…</p> : <div className="lesson-grid video-grid tute-grid">{(admin && contentOrder ? orderByCreated(shown, contentOrder) : shown).map((pdf) => <article className="lesson-folder-card" key={pdf.id}>
      <>{pdf.drive_url ? <iframe className="pdf-preview" src={googleDrivePreviewUrl(pdf.drive_url)} title={`Preview of ${pdf.title}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> : <span className="folder-symbol"><FileText size={32} /></span>}</><h3>{pdf.title}</h3><p className="folder-description">{pdf.description}</p>
      <p className="admin-caption">{pdf.drive_url ? "PDF · Google Drive" : `PDF · ${(pdf.size / 1024 / 1024).toFixed(2)} MB`}</p>
      {admin && <div className="student-access"><span>{pdf.published ? "Enabled for students" : "Disabled for students"}</span><button className="access-switch" role="switch" aria-checked={pdf.published} aria-label={`Student access to ${pdf.title}`} disabled={busy} onClick={() => change(pdf)}><span /></button></div>}
      <div className="card-actions">{admin && <button className="secondary-button" disabled={busy} onClick={() => { setEditingPdf(pdf); setEditingFolder(null); setFolderOpen(false); setError(""); setOpen(true); }}>Edit</button>}{admin && <button className="secondary-button danger-button" disabled={busy} onClick={() => change(pdf, true)}>Delete</button>}{pdf.drive_url ? <a className="purchase-button add-video-button" href={googleDriveFileUrl(pdf.drive_url)} target="_blank" rel="noopener noreferrer"><ExternalLink size={17} /> View</a> : <button className="purchase-button add-video-button" disabled={busy} onClick={() => download(pdf)}><Download size={17} /> Download PDF</button>}</div>
    </article>)}</div>}
    {!loading && !error && (activeId ? shown.length === 0 : shownFolders.length === 0 && unfiled.length === 0) && <p className="admin-caption">{query ? "No matching tutes or folders." : admin ? activeId ? "Add a Google Drive PDF link to this folder." : "Create your first folder with a name and grade." : "Tutes will appear here when available."}</p>}
    <dialog ref={dialog} className="video-editor-dialog" aria-labelledby="pdf-upload-title" onCancel={(event) => { if (busy) event.preventDefault(); else setOpen(false); }}>
      <section className="admin-panel"><div className="editor-heading"><h2 id="pdf-upload-title">{folderOpen ? editingFolder ? "Edit tute folder" : "Create tute folder" : editingPdf ? "Edit PDF tute" : "Add PDF tute"}</h2><button className="close-button" aria-label="Close PDF upload" disabled={busy} onClick={() => setOpen(false)}><X size={22} /></button></div>
        {folderOpen ? <form key={`folder-${editingFolder?.id ?? "new"}-${open}`} className="module-form" onSubmit={createFolder}><fieldset disabled={busy}>
          <label>Folder name<input name="name" defaultValue={editingFolder?.name} required maxLength={200} placeholder="Algebra" /></label>
          <label>Grade<input name="grade" defaultValue={editingFolder?.grade} required maxLength={50} placeholder="Grade 10" /></label>
          {error && <p className="admin-message error" role="alert">{error}</p>}
          <button className="purchase-button" type="submit">{busy ? "Saving…" : editingFolder ? "Save changes" : "Create folder"}</button>
        </fieldset></form> : <form key={`pdf-${editingPdf?.id ?? "new"}-${open}`} className="module-form" onSubmit={upload}><fieldset disabled={busy}>
          <label>Tute name<input name="title" defaultValue={editingPdf?.title} required maxLength={200} placeholder="#tute 01 — Algebra" /></label>
          <label>Description<textarea name="description" defaultValue={editingPdf?.description} rows={3} maxLength={5000} /></label>
          <a href="https://drive.google.com/drive/my-drive" target="_blank" rel="noopener noreferrer" className="secondary-button">Open Google Drive to upload ↗</a>
          {(!editingPdf || editingPdf.drive_url) && <label>Google Drive sharing link<input name="drive_url" defaultValue={editingPdf?.drive_url} type="url" required placeholder="https://drive.google.com/file/d/…/view" /></label>}
          <p className="admin-caption">Upload your PDF to Drive. Set Share → General access to “Anyone with the link” and “Viewer”, so students can preview and view it. Paste the link here.</p>
          <p className="admin-caption">Disabling this listing hides it here; it does not change Google Drive sharing permissions.</p>
          <label className="checkbox-label"><input name="published" defaultChecked={editingPdf?.published} value="true" type="checkbox" /> Enable for students</label>
          {error && <p className="admin-message error" role="alert">{error}</p>}
          <button className="purchase-button" type="submit">{busy ? "Saving…" : editingPdf ? "Save changes" : "Save Drive link"}</button>
        </fieldset></form>}
      </section>
    </dialog>
  </section>;
}
