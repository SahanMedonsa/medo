"use client";

import { ContentOrder, orderByCreated } from "@/lib/content-order";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Plus, Search, Video, X } from "lucide-react";
import { Medium } from "@/lib/modules";
import { OnlineClass, validateOnlineClass } from "@/lib/online-classes";

const demoKey = "medonsa-demo-online-classes";
export default function OnlineClasses({ admin, demo, section, medium, contentOrder }: { contentOrder?: ContentOrder; admin: boolean; demo: boolean; section: "ol" | "al"; medium: Medium }) {
  const [classes, setClasses] = useState<OnlineClass[]>([]);
  const [editor, setEditor] = useState<{ item?: OnlineClass } | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        let items: OnlineClass[];
        if (demo) items = JSON.parse(localStorage.getItem(demoKey) || "[]");
        else {
          const response = await fetch("/api/online-classes", { cache: "no-store", signal: controller.signal });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          items = data.classes;
        }
        if (!controller.signal.aborted) { setClasses(items); setError(""); }
      } catch (error) { if (!controller.signal.aborted) setError((error as Error).message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [demo, retry]);
  useEffect(() => {
    if (!editor) { dialog.current?.close(); return; }
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [editor]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(""); setNotice("");
    try {
      const fields = validateOnlineClass({ title: form.get("title"), zoom_url: form.get("zoom_url"), section, medium });
      let item: OnlineClass;
      if (demo) item = { ...fields, id: editor.item?.id ?? crypto.randomUUID(), created_at: editor.item?.created_at ?? new Date().toISOString() };
      else {
        const response = await fetch("/api/online-classes", { method: editor.item ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fields, id: editor.item?.id }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        item = data.class;
      }
      const next = [item, ...classes.filter((value) => value.id !== item.id)];
      if (demo) localStorage.setItem(demoKey, JSON.stringify(next));
      setClasses(next); setEditor(null); setQuery(""); setNotice("Online class saved. Students can now join using the button.");
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  async function remove(item: OnlineClass) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (!demo) {
        const response = await fetch("/api/online-classes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
      }
      const next = classes.filter((value) => value.id !== item.id);
      if (demo) localStorage.setItem(demoKey, JSON.stringify(next));
      setClasses(next); setNotice("Online class deleted.");
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  const shown = classes.filter((item) => item.section === section && item.medium === medium && item.title.toLowerCase().includes(query.trim().toLowerCase()));
  return <section>
    <div className="catalog-toolbar"><span>{section === "ol" ? "O/L" : "A/L"} live classes on Zoom</span><div className="catalog-controls">
      {admin && <button className="purchase-button add-video-button" disabled={loading || busy} onClick={() => { setError(""); setEditor({}); }}><Plus size={19} /> Create online class</button>}
      <label className="lesson-search"><Search size={18} /><input aria-label="Search online classes" placeholder="Search classes..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    </div></div>
    {notice && <p className="admin-message success" role="status">{notice}</p>}
    {error && !editor && <div className="empty-panel" role="alert"><p>{error}</p><button className="secondary-button" onClick={() => { setLoading(true); setRetry((value) => value + 1); }}>Try again</button></div>}
    {loading ? <p role="status">Loading online classes…</p> : <div className="lesson-grid online-class-grid">
      {(admin && contentOrder ? orderByCreated(shown, contentOrder) : shown).map((item) => <article className="lesson-card online-class-card" key={item.id}>
        <div className="online-class-icon"><Video size={32} aria-hidden="true" /><span>LIVE ON ZOOM</span></div>
        <h2>{item.title}</h2><p className="lesson-description">Join your teacher and classmates online.</p>
        <div className="card-actions">{admin && <><button className="secondary-button" disabled={busy} onClick={() => { setError(""); setEditor({ item }); }}>Edit</button><button className="secondary-button danger-button" disabled={busy} onClick={() => remove(item)}>Delete</button></>}
          <a className="purchase-button" href={item.zoom_url} target="_blank" rel="noopener noreferrer">Join Zoom class ↗</a>
        </div>
      </article>)}
    </div>}
    {!loading && !error && !shown.length && <div className="empty-panel"><Video size={32} /><h2>{query ? "No classes found" : "Online classes coming soon"}</h2><p>{query ? "Try another class title." : admin ? "Create a class with a title and Zoom meeting link." : "Your teacher’s online classes will appear here."}</p></div>}
    <dialog ref={dialog} className="video-editor-dialog" aria-labelledby="online-class-title" onCancel={(event) => { if (busy) event.preventDefault(); else setEditor(null); }} onClick={(event) => { if (event.target === event.currentTarget && !busy) setEditor(null); }}>
      {editor && <section className="admin-panel"><div className="editor-heading"><h2 id="online-class-title">{editor.item ? "Edit online class" : "Create online class"}</h2><button className="close-button" disabled={busy} aria-label="Close class form" onClick={() => setEditor(null)}><X size={22} /></button></div>
        <p className="admin-caption">This class will appear in {section === "ol" ? "O/L" : "A/L"} · {medium === "si" ? "Sinhala" : "English"} medium.</p>
        <form className="module-form" onSubmit={save}><fieldset disabled={busy}>
          <label>Class title<input name="title" autoFocus required maxLength={200} defaultValue={editor.item?.title} placeholder="e.g. Algebra live class" /></label>
          <label>Zoom meeting link<input name="zoom_url" type="url" required maxLength={2000} defaultValue={editor.item?.zoom_url} placeholder="https://us02web.zoom.us/j/..." /></label>
          {error && <p className="admin-message error" role="alert">{error}</p>}
          <div className="admin-actions"><button className="purchase-button">{busy ? "Saving…" : editor.item ? "Save changes" : "Create class"}</button><button type="button" className="secondary-button" onClick={() => setEditor(null)}>Cancel</button></div>
        </fieldset></form>
      </section>}
    </dialog>
  </section>;
}
