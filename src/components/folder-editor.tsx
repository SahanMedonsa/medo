"use client";

import { adminRequest } from "@/lib/demo-store";
import { X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { LessonFolder, Medium, contentMedium } from "@/lib/modules";

export default function FolderEditor({ folder, category, medium, demo = false, onClose, onSaved }: {
  medium: Medium; demo?: boolean; folder: LessonFolder | null; category: string; onClose: () => void; onSaved: (folder: LessonFolder) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const result = await adminRequest({ action: "save_folder", medium: folder ? contentMedium(folder) : data.get("medium"), id: folder?.id, title: data.get("title"), description: data.get("description"), category: folder?.category ?? category, planned_videos: Number(data.get("planned_videos")), marks: Number(data.get("marks")) }, demo);
      onSaved(result.folder);
    } catch (error) { setError((error as Error).message); setBusy(false); }
  }

  return <dialog ref={dialog} className="video-editor-dialog" aria-labelledby="folder-title" onCancel={(event) => { if (busy) event.preventDefault(); else onClose(); }} onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className="admin-panel">
      <div className="editor-heading"><div><span className="admin-eyebrow">{category}</span><h2 id="folder-title">{folder ? "Edit lesson folder" : "Add lessons"}</h2></div><button className="close-button" aria-label="Close folder form" disabled={busy} onClick={onClose}><X size={22} /></button></div>
      <p className="admin-caption">Create a folder for a topic, then add your videos inside.</p>
      <form className="module-form" onSubmit={save}><fieldset disabled={busy}>
        <label>Teaching medium<select name="medium" defaultValue={folder ? contentMedium(folder) : medium} disabled={!!folder}><option value="si">සිංහල · Sinhala medium</option><option value="en">English medium</option></select></label>
        <p className="admin-caption">Write the title and description in this medium. A folder’s medium is fixed after creation; create a separate folder for the other medium.</p>
        <label>Folder title<input name="title" autoFocus required maxLength={200} defaultValue={folder?.title} placeholder="e.g. Algebra — Equations" /></label>
        <label>Description<textarea name="description" required maxLength={5000} rows={4} defaultValue={folder?.description} placeholder="Explain what students will learn in this lesson." /></label>
        <div className="folder-form-numbers">
          <label>Planned number of videos<input name="planned_videos" type="number" min={1} max={10000} step={1} required defaultValue={folder?.planned_videos} placeholder="e.g. 8" /></label>
          <label>Marks available<input name="marks" type="number" min={0} max={1000} step={1} required defaultValue={folder?.marks} placeholder="e.g. 20" /></label>
        </div>
        <p className="admin-caption">The folder will show your planned video count, how many videos have been added, and the marks available.</p>
        {error && <p className="admin-message error" role="alert">{error}</p>}
        <div className="admin-actions"><button className="purchase-button">{busy ? "Saving…" : folder ? "Save changes" : "Create folder"}</button><button type="button" className="secondary-button" onClick={onClose}>Cancel</button></div>
      </fieldset></form>
    </section>
  </dialog>;
}
