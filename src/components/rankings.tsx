"use client";

import Image from "next/image";
import kalutaraSchools from "@/lib/kalutara-schools.json";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, Award, Plus, X } from "lucide-react";
import { RankingEntry, RankingPaper, rankStudents, validateRankingEntry, validateRankingPaper } from "@/lib/rankings";

type Data = { papers: RankingPaper[]; entries: RankingEntry[] };
type Editor = { kind: "paper"; item?: RankingPaper } | { kind: "entry"; item?: RankingEntry };
const demoKey = "medonsa-demo-rankings";
function readDemo(): Data { return JSON.parse(localStorage.getItem(demoKey) || '{"papers":[],"entries":[]}'); }

export default function Rankings({ admin, demo }: { admin: boolean; demo: boolean }) {
  const [data, setData] = useState<Data>({ papers: [], entries: [] });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const paper = data.papers.find((item) => item.id === activeId);
  const schoolNames = [...new Set([...kalutaraSchools.map((school) => school.name), ...data.entries.map((entry) => entry.school)])].sort((a, b) => a.localeCompare(b));
  const ranked = rankStudents(data.entries.filter((item) => item.paper_id === activeId));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let result: Data;
        if (demo) result = readDemo();
        else {
          const response = await fetch("/api/rankings", { cache: "no-store" });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error);
          result = body;
        }
        if (!cancelled) { setData(result); setError(""); }
      } catch (error) { if (!cancelled) setError((error as Error).message); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [demo, retry]);

  useEffect(() => {
    if (!editor) { dialog.current?.close(); return; }
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [editor]);

  function edit(value: Editor) { setError(""); setEditor(value); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const value = editor.kind === "paper"
        ? validateRankingPaper({ name: form.get("name"), date: form.get("date") })
        : validateRankingEntry({ paper_id: activeId, name: form.get("name"), school: form.get("school"), medium: form.get("medium"), marks: form.get("marks") === "" ? NaN : Number(form.get("marks")) });
      let item: RankingPaper | RankingEntry;
      if (demo) {
        item = { ...value, id: editor.item?.id ?? crypto.randomUUID(), created_at: editor.item?.created_at ?? new Date().toISOString() } as RankingPaper | RankingEntry;
        const current = readDemo();
        if (editor.kind === "paper") current.papers = [item as RankingPaper, ...current.papers.filter((row) => row.id !== item.id)];
        else current.entries = [item as RankingEntry, ...current.entries.filter((row) => row.id !== item.id)];
        localStorage.setItem(demoKey, JSON.stringify(current));
        setData(current);
      } else {
        const response = await fetch("/api/rankings", { method: editor.item ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...value, kind: editor.kind, id: editor.item?.id }) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        item = body.item;
        setData((current) => editor.kind === "paper"
          ? { ...current, papers: [item as RankingPaper, ...current.papers.filter((row) => row.id !== item.id)] }
          : { ...current, entries: [item as RankingEntry, ...current.entries.filter((row) => row.id !== item.id)] });
      }
      if (editor.kind === "paper") setActiveId(item.id);
      setEditor(null);
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }

  async function remove(entry: RankingEntry) {
    if (!confirm(`Delete the result for ${entry.name}?`)) return;
    setBusy(true); setError("");
    try {
      if (demo) {
        const current = readDemo();
        current.entries = current.entries.filter((item) => item.id !== entry.id);
        localStorage.setItem(demoKey, JSON.stringify(current));
        setData(current);
      } else {
        const response = await fetch("/api/rankings", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: entry.id }) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setData((current) => ({ ...current, entries: current.entries.filter((item) => item.id !== entry.id) }));
      }
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }

  return <section className="rankings">
    {paper && <div className="tute-folder-summary ranking-paper-header"><button className="tute-back" onClick={() => setActiveId(null)}><ArrowLeft size={18} /> Back</button><div className="ranking-paper-title"><h2>{paper.name}</h2><time dateTime={paper.date}>{paper.date}</time></div>{admin && <button className="secondary-button" onClick={() => edit({ kind: "paper", item: paper })}>Edit paper</button>}<Image className="ranking-paper-logo" src="/logo.png" alt="Sahan Medonsa" width={1175} height={344} unoptimized /></div>}
    <div className="catalog-toolbar"><span>{paper ? `${ranked.length} students · Highest marks first` : "Papers and results"}</span>{admin && !loading && <button className="purchase-button add-video-button" onClick={() => edit({ kind: paper ? "entry" : "paper" })}><Plus size={18} />{paper ? "Add student" : "Add paper"}</button>}</div>
    {error && !editor && <p className="admin-message error" role="alert">{error} <button className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Retry</button></p>}
    {loading ? <p role="status">Loading rankings…</p> : paper ? <>
      {ranked.length > 0 && <div className="ranking-podium" aria-label="Top five students">
        {ranked.slice(0, 5).map((entry, index) => <article className={`ranking-student-card ranking-color-${index + 1}`} key={entry.id}>
          <div className="ranking-card-badge"><Award size={22} aria-hidden="true" /><span>Rank {entry.rank}</span></div>
          <h3>{entry.name}</h3><p className="ranking-card-school">{entry.school}</p>
          <span className="ranking-card-medium">{entry.medium === "en" ? "English" : "Sinhala"} medium</span>
          <div className="ranking-card-score"><strong>{entry.marks}</strong><span>marks</span></div>
          {admin && <div className="ranking-actions"><button className="secondary-button" disabled={busy} onClick={() => edit({ kind: "entry", item: entry })}>Edit</button><button className="secondary-button danger-button" disabled={busy} onClick={() => remove(entry)}>Delete</button></div>}
        </article>)}
      </div>}
      {ranked.length > 5 && <div className="ranking-table-scroll"><table className="ranking-table"><caption>Other students · {paper.name} · {paper.date}</caption><thead><tr><th scope="col">Rank</th><th scope="col">Student name</th><th scope="col">School</th><th scope="col">Medium</th><th scope="col">Marks</th>{admin && <th scope="col">Actions</th>}</tr></thead><tbody>{ranked.slice(5).map((entry) => <tr key={entry.id}><td data-label="Rank">{entry.rank}</td><th scope="row">{entry.name}</th><td data-label="School">{entry.school}</td><td data-label="Medium">{entry.medium === "en" ? "English" : "Sinhala"}</td><td data-label="Marks">{entry.marks}</td>{admin && <td><div className="ranking-actions"><button className="secondary-button" disabled={busy} onClick={() => edit({ kind: "entry", item: entry })}>Edit</button><button className="secondary-button danger-button" disabled={busy} onClick={() => remove(entry)}>Delete</button></div></td>}</tr>)}</tbody></table></div>}
      {!ranked.length && <p className="admin-caption">{admin ? "Add the first student’s name, marks, and school." : "Results will appear here when added."}</p>}
    </> : <><div className="lesson-grid folder-grid">{[...data.papers].sort((a, b) => b.date.localeCompare(a.date)).map((item) => <article className="lesson-folder-card" key={item.id}><span className="folder-symbol"><Award size={28} /></span><h2>{item.name}</h2><time dateTime={item.date}>{item.date}</time><p className="admin-caption">{data.entries.filter((entry) => entry.paper_id === item.id).length} students</p><div className="card-actions">{admin && <button className="secondary-button" onClick={() => edit({ kind: "paper", item })}>Edit</button>}<button className="purchase-button" onClick={() => setActiveId(item.id)}>Open paper</button></div></article>)}</div>{!data.papers.length && !error && <p className="admin-caption">{admin ? "Add a paper name and date to get started." : "Paper rankings will appear here when added."}</p>}</>}
    <dialog ref={dialog} className="video-editor-dialog" aria-labelledby="ranking-editor-title" onCancel={(event) => { if (busy) event.preventDefault(); else setEditor(null); }}>
      {editor && <section className="admin-panel"><div className="editor-heading"><h2 id="ranking-editor-title">{editor.item ? "Edit" : "Add"} {editor.kind === "paper" ? "paper" : "student result"}</h2><button className="close-button" aria-label="Close editor" disabled={busy} onClick={() => setEditor(null)}><X size={22} /></button></div>
        <form className="module-form" key={`${editor.kind}-${editor.item?.id ?? "new"}`} onSubmit={save}><fieldset disabled={busy}>
          <label>{editor.kind === "paper" ? "Paper name" : "Student name"}<input name="name" required maxLength={200} defaultValue={editor.item?.name} /></label>
          {editor.kind === "paper" ? <label>Paper date<input name="date" type="date" required defaultValue={editor.item?.date} /></label> : <><label>Marks<input name="marks" type="number" min="0" max="10000" step="any" required defaultValue={editor.item?.marks} /></label><label>Medium<select name="medium" defaultValue={editor.item?.medium ?? "si"}><option value="si">Sinhala</option><option value="en">English</option></select></label><label>School<input name="school" list="kalutara-schools" autoComplete="off" placeholder="Search or type a school name" required maxLength={200} defaultValue={editor.item?.school} /><datalist id="kalutara-schools">{schoolNames.map((name) => <option key={name} value={name} />)}</datalist></label><p className="admin-caption">Search Kalutara government schools or type another school name.</p></>}
          {error && <p className="admin-message error" role="alert">{error}</p>}<button className="purchase-button" type="submit">{busy ? "Saving…" : "Save"}</button>
        </fieldset></form>
      </section>}
    </dialog>
  </section>;
}
