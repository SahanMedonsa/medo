"use client";

import { categoryLabel } from "@/lib/modules";

import { adminRequest } from "@/lib/demo-store";
import YoutubeThumbnail from "@/components/youtube-thumbnail";
import { X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { moduleCategories, Medium, contentMedium, LessonFolder, VideoModule, youtubeId } from "@/lib/modules";

export default function VideoEditor({ lesson, category, medium, folder, folders, demo = false, onClose, onSaved }: {
  medium: Medium; demo?: boolean; lesson: VideoModule | null; category: string; folder: LessonFolder | null; folders: LessonFolder[]; onClose: () => void; onSaved: (lesson: VideoModule) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState({
    medium: lesson ? contentMedium(lesson) : folder ? contentMedium(folder) : medium,
    folder_id: lesson?.folder_id ?? folder?.id ?? null,
    url: lesson ? `https://www.youtube.com/watch?v=${lesson.video_id}` : "",
    title: lesson?.title ?? "", description: lesson?.description ?? "", category: lesson?.category ?? category, published: lesson?.published ?? false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const id = youtubeId(form.url);

  useEffect(() => {
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  async function preview() {
    setBusy(true); setError(""); setNotice("");
    try {
      const data = await adminRequest({ action: "preview", url: form.url }, demo);
      setForm((current) => ({ ...current, title: data.title }));
      setNotice("Title and thumbnail loaded. Check your details before saving.");
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const data = await adminRequest({ action: "save", id: lesson?.id, ...form }, demo);
      onSaved(data.module);
    } catch (error) { setError((error as Error).message); setBusy(false); }
  }

  return <dialog ref={dialog} className="video-editor-dialog" aria-labelledby="video-editor-title" onCancel={(event) => { if (busy) event.preventDefault(); else onClose(); }} onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className="admin-panel video-editor-panel">
      <div className="editor-heading"><div><span className="admin-eyebrow">{categoryLabel(form.category)}</span><h2 id="video-editor-title">{lesson ? "Edit video" : "Add video"}</h2></div><button className="close-button" aria-label="Close video editor" disabled={busy} onClick={onClose}><X size={23} /></button></div>
      <p className="admin-caption">Paste a YouTube link to preview your lesson.</p>
      <form className="module-form" onSubmit={save}><fieldset disabled={busy}>
        <label>YouTube link<input autoFocus type="url" value={form.url} required placeholder="https://www.youtube.com/watch?v=..." onChange={(event) => { setForm({ ...form, url: event.target.value }); setNotice(""); }} /></label>
        <button type="button" className="secondary-button" disabled={!id} onClick={preview}>{busy ? "Please wait…" : "Get title & preview"}</button>
        {id && <div className="editor-preview-card"><YoutubeThumbnail videoId={id} alt="Video thumbnail preview" /><div><span className="status-badge">{form.published ? "Ready to publish" : "Draft"}</span><h3>{form.title || "Your video title"}</h3><p>{categoryLabel(form.category)}</p></div></div>}
        {error && <p className="admin-message error" role="alert">{error}</p>}
        {notice && <p className="admin-message success" role="status">{notice}</p>}
        <label>Teaching medium<select value={form.medium} onChange={(event) => setForm({ ...form, medium: event.target.value as Medium, folder_id: null })}><option value="si">සිංහල · Sinhala medium</option><option value="en">English medium</option></select></label>
        <p className="admin-caption">Use a video, title, and description in the selected medium. Only folders in that medium are shown.</p>
        <label>Video title<input value={form.title} required maxLength={200} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
        <label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value, folder_id: null })}>{moduleCategories.map((item) => <option key={item} value={item}>{categoryLabel(item)}</option>)}</select></label>
        {form.category !== "#tute" && <label>Lesson folder<select value={form.folder_id ?? ""} onChange={(event) => setForm({ ...form, folder_id: event.target.value || null })}><option value="">Unfiled videos</option>{folders.filter((item) => item.category === form.category && contentMedium(item) === form.medium).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
        <label>Description<textarea rows={3} value={form.description} maxLength={5000} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Add lesson details in Sinhala or English" /></label>
        <label className="checkbox-label"><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} /> Publish for students</label>
        <p className="admin-caption">Drafts are visible only to admins. Published videos appear in the lesson library.</p>
        <div className="admin-actions"><button type="submit" className="purchase-button">{busy ? "Please wait…" : form.published ? "Save & publish" : "Save draft"}</button><button type="button" className="secondary-button" onClick={onClose}>Cancel</button></div>
      </fieldset></form>
    </section>
  </dialog>;
}
