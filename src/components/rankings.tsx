"use client";

import { ContentOrder, orderByCreated } from "@/lib/content-order";

import Image from "next/image";
import kalutaraSchools from "@/lib/kalutara-schools.json";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, Award, Download, Play, Plus, X } from "lucide-react";
import { RankingEntry, RankingPaper, gradeForMarks, rankStudents, validateRankingEntry, validateRankingPaper } from "@/lib/rankings";

type Data = { papers: RankingPaper[]; entries: RankingEntry[] };
type Editor = { kind: "paper"; item?: RankingPaper } | { kind: "entry"; item?: RankingEntry };
const demoKey = "medonsa-demo-rankings";
function readDemo(): Data { return JSON.parse(localStorage.getItem(demoKey) || '{"papers":[],"entries":[]}'); }

function PasscodeInput() {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  function fill(index: number, value: string) {
    const numbers = value.replace(/[^0-9]/g, "").slice(0, 4);
    if (!numbers) { setDigits((current) => current.map((digit, position) => position === index ? "" : digit)); return; }
    const start = numbers.length === 4 ? 0 : index;
    setDigits((current) => {
      const next = [...current];
      for (let offset = 0; offset < numbers.length && start + offset < 4; offset++) next[start + offset] = numbers[offset];
      return next;
    });
    inputs.current[Math.min(start + numbers.length, 3)]?.focus();
  }
  return <div className="ranking-passcode"><span id="ranking-passcode-label">4-digit passcode</span><input type="hidden" name="passcode" value={digits.join("")} /><div className="ranking-passcode-digits" role="group" aria-labelledby="ranking-passcode-label">{digits.map((digit, index) => <input key={index} ref={(element) => { inputs.current[index] = element; }} type="password" inputMode="numeric" pattern="[0-9]" required aria-label={`Digit ${index + 1} of 4`} autoComplete={index === 0 ? "one-time-code" : "off"} value={digit} onFocus={(event) => event.currentTarget.select()} onChange={(event) => fill(index, event.target.value)} onPaste={(event) => { event.preventDefault(); fill(index, event.clipboardData.getData("text")); }} onKeyDown={(event) => {
    if (event.key === "Backspace" && !digit && index > 0) { event.preventDefault(); setDigits((current) => current.map((value, position) => position === index - 1 ? "" : value)); inputs.current[index - 1]?.focus(); }
    if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); inputs.current[index - 1]?.focus(); }
    if (event.key === "ArrowRight" && index < 3) { event.preventDefault(); inputs.current[index + 1]?.focus(); }
  }} />)}</div></div>;
}

function MarksInput({ initialMarks }: { initialMarks?: number }) {
  const [value, setValue] = useState(initialMarks === undefined ? "" : String(initialMarks));
  const marks = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(marks) && marks >= 0 && marks <= 10000;
  return <><label>Marks<input name="marks" type="number" min="0" max="10000" step="any" required value={value} onChange={(event) => setValue(event.target.value)} /></label><p className="admin-caption" aria-live="polite">Grade: <strong>{valid ? gradeForMarks(marks) : "—"}</strong></p></>;
}

function PaperLinks({ paper }: { paper: RankingPaper }) {
  return <>
    {paper.drive_url && <a className="secondary-button ranking-resource-button" href={paper.drive_url} target="_blank" rel="noopener noreferrer"><Download size={17} aria-hidden="true" /> Download paper</a>}
    {paper.answers_url && <a className="secondary-button ranking-resource-button" href={paper.answers_url} target="_blank" rel="noopener noreferrer"><Play size={17} aria-hidden="true" /> Paper 1 answers</a>}
    {paper.answers_2_url && <a className="secondary-button ranking-resource-button" href={paper.answers_2_url} target="_blank" rel="noopener noreferrer"><Play size={17} aria-hidden="true" /> Paper 2 answers</a>}
  </>;
}

export default function Rankings({ admin, demo, contentOrder }: { contentOrder?: ContentOrder; admin: boolean; demo: boolean }) {
  const [data, setData] = useState<Data>({ papers: [], entries: [] });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [unlockPaper, setUnlockPaper] = useState<RankingPaper | null>(null);
  const unlockDialog = useRef<HTMLDialogElement>(null);
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
          const response = await fetch(`/api/rankings${admin ? "?admin=true" : ""}`, { cache: "no-store" });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error);
          result = body;
        }
        if (!cancelled) { setData(result); setError(""); }
      } catch (error) { if (!cancelled) setError((error as Error).message); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [admin, demo, retry]);

  useEffect(() => {
    if (!editor) { dialog.current?.close(); return; }
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [editor]);

  useEffect(() => {
    if (!unlockPaper) { unlockDialog.current?.close(); return; }
    unlockDialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [unlockPaper]);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!unlockPaper) return;
    const passcode = String(new FormData(event.currentTarget).get("passcode"));
    setBusy(true); setError("");
    try {
      let entries: RankingEntry[];
      if (demo) {
        const codes = JSON.parse(localStorage.getItem(`${demoKey}-passcodes`) || "{}");
        if (!codes[unlockPaper.id]) throw new Error("The administrator has not set a passcode for this paper yet.");
        if (codes[unlockPaper.id] !== passcode) throw new Error("Incorrect passcode. Try again.");
        entries = readDemo().entries.filter((entry) => entry.paper_id === unlockPaper.id);
      } else {
        const response = await fetch("/api/rankings/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paper_id: unlockPaper.id, passcode }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        entries = result.entries;
      }
      setData((current) => ({ ...current, entries: [...current.entries.filter((entry) => entry.paper_id !== unlockPaper.id), ...entries] }));
      setActiveId(unlockPaper.id); setUnlockPaper(null);
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }

  function edit(value: Editor) { setError(""); setEditor(value); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const passcode = editor.kind === "paper" ? String(form.get("passcode") ?? "") : "";
      if (passcode && !/^[0-9]{4}$/.test(passcode)) throw new Error("Enter a 4-digit passcode.");
      const value = editor.kind === "paper"
        ? validateRankingPaper({ name: form.get("name"), date: form.get("date"), drive_url: form.get("drive_url"), answers_url: form.get("answers_url"), answers_2_url: form.get("answers_2_url") })
        : validateRankingEntry({ paper_id: activeId, name: form.get("name"), school: form.get("school"), medium: form.get("medium"), marks: form.get("marks") === "" ? NaN : Number(form.get("marks")) });
      let item: RankingPaper | RankingEntry;
      if (demo) {
        item = { ...value, id: editor.item?.id ?? crypto.randomUUID(), created_at: editor.item?.created_at ?? new Date().toISOString() } as RankingPaper | RankingEntry;
        const current = readDemo();
        if (editor.kind === "paper") current.papers = [item as RankingPaper, ...current.papers.filter((row) => row.id !== item.id)];
        else current.entries = [item as RankingEntry, ...current.entries.filter((row) => row.id !== item.id)];
        localStorage.setItem(demoKey, JSON.stringify(current));
        if (editor.kind === "paper" && passcode) {
          const codes = JSON.parse(localStorage.getItem(`${demoKey}-passcodes`) || "{}");
          codes[item.id] = passcode;
          localStorage.setItem(`${demoKey}-passcodes`, JSON.stringify(codes));
        }
        setData(current);
      } else {
        const response = await fetch("/api/rankings", { method: editor.item ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...value, ...(editor.kind === "paper" ? { passcode } : {}), kind: editor.kind, id: editor.item?.id }) });
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
          <div className="ranking-card-score"><strong>{entry.marks}</strong><span>marks · Grade {gradeForMarks(entry.marks)}</span></div>
          {admin && <div className="ranking-actions"><button className="secondary-button" disabled={busy} onClick={() => edit({ kind: "entry", item: entry })}>Edit</button><button className="secondary-button danger-button" disabled={busy} onClick={() => remove(entry)}>Delete</button></div>}
        </article>)}
      </div>}
      {ranked.length > 5 && <div className="ranking-table-scroll"><table className="ranking-table"><caption>Other students · {paper.name} · {paper.date}</caption><thead><tr><th scope="col">Rank</th><th scope="col">Student name</th><th scope="col">School</th><th scope="col">Medium</th><th scope="col">Marks</th><th scope="col">Grade</th>{admin && <th scope="col">Actions</th>}</tr></thead><tbody>{ranked.slice(5).map((entry) => <tr key={entry.id}><td data-label="Rank">{entry.rank}</td><th scope="row">{entry.name}</th><td data-label="School">{entry.school}</td><td data-label="Medium">{entry.medium === "en" ? "English" : "Sinhala"}</td><td data-label="Marks">{entry.marks}</td><td data-label="Grade">{gradeForMarks(entry.marks)}</td>{admin && <td><div className="ranking-actions"><button className="secondary-button" disabled={busy} onClick={() => edit({ kind: "entry", item: entry })}>Edit</button><button className="secondary-button danger-button" disabled={busy} onClick={() => remove(entry)}>Delete</button></div></td>}</tr>)}</tbody></table></div>}
      {!ranked.length && <p className="admin-caption">{admin ? "Add the first student’s name, marks, and school." : "Results will appear here when added."}</p>}
    </> : <><div className="lesson-grid folder-grid">{(contentOrder ? orderByCreated(data.papers, contentOrder) : [...data.papers].sort((a, b) => b.date.localeCompare(a.date))).map((item) => {
      const students = rankStudents(data.entries.filter((entry) => entry.paper_id === item.id));
      const winners = (admin ? students : []).filter((entry) => entry.rank === 1);
      return <article className="lesson-folder-card ranking-paper-card" key={item.id}>
        <div className="ranking-paper-card-body">
          <div className="ranking-paper-card-details"><span className="folder-symbol"><Award size={28} /></span><h2>{item.name}</h2><time dateTime={item.date}>{item.date}</time><p className="admin-caption">{admin ? `${students.length} students` : "Enter passcode to view results"}</p></div>
          {winners.length > 0 && <aside className="ranking-paper-winners" aria-label="First-ranked students">
            <span className="ranking-paper-winner-label"><Award size={16} aria-hidden="true" /> Rank 1</span>
            {winners.map((winner) => <div className="ranking-paper-winner" key={winner.id}><h3>{winner.name}</h3><strong>{winner.marks} <span>marks · Grade {gradeForMarks(winner.marks)}</span></strong><p>{winner.school}</p></div>)}
          </aside>}
        </div>
        <div className="card-actions"><PaperLinks paper={item} />{admin && <button className="secondary-button" onClick={() => edit({ kind: "paper", item })}>Edit</button>}<button className="purchase-button" disabled={busy} onClick={() => { if (admin) setActiveId(item.id); else { setError(""); setUnlockPaper(item); } }}>Open paper</button></div>
      </article>;
    })}</div>{!data.papers.length && !error && <p className="admin-caption">{admin ? "Add a paper name and date to get started." : "Paper rankings will appear here when added."}</p>}</>}
    <dialog ref={unlockDialog} className="video-editor-dialog" aria-labelledby="ranking-unlock-title" onCancel={(event) => { if (busy) event.preventDefault(); else setUnlockPaper(null); }}>
      {unlockPaper && <section className="admin-panel"><div className="editor-heading"><h2 id="ranking-unlock-title">Open {unlockPaper.name}</h2><button className="close-button" aria-label="Close passcode prompt" disabled={busy} onClick={() => setUnlockPaper(null)}><X size={22} /></button></div><form key={unlockPaper.id} className="module-form" onSubmit={unlock}><fieldset disabled={busy}><PasscodeInput />{error && <p role="alert">{error}</p>}<button className="purchase-button" type="submit">{busy ? "Checking…" : "Open results"}</button></fieldset></form></section>}
    </dialog>
    <dialog ref={dialog} className="video-editor-dialog" aria-labelledby="ranking-editor-title" onCancel={(event) => { if (busy) event.preventDefault(); else setEditor(null); }}>
      {editor && <section className="admin-panel"><div className="editor-heading"><h2 id="ranking-editor-title">{editor.item ? "Edit" : "Add"} {editor.kind === "paper" ? "paper" : "student result"}</h2><button className="close-button" aria-label="Close editor" disabled={busy} onClick={() => setEditor(null)}><X size={22} /></button></div>
        <form className="module-form" key={`${editor.kind}-${editor.item?.id ?? "new"}`} onSubmit={save}><fieldset disabled={busy}>
          <label>{editor.kind === "paper" ? "Paper name" : "Student name"}<input name="name" required maxLength={200} defaultValue={editor.item?.name} /></label>
          {editor.kind === "paper" ? <><label>4-digit student passcode<input name="passcode" type="password" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} required={!editor.item} autoComplete="new-password" placeholder={editor.item ? "Leave blank to keep the current code" : "e.g. 0123"} /></label><p className="admin-caption">Students need this code to open results. Paper and answers links remain available on the card. Existing papers need a code set before students can open them.</p><label>Paper date<input name="date" type="date" required defaultValue={editor.item?.date} /></label><label>Google Drive paper link<input name="drive_url" type="url" maxLength={2000} placeholder="https://drive.google.com/file/d/…/view" defaultValue={editor.item?.drive_url ?? ""} /></label><p className="admin-caption">Optional. Set the file’s Google Drive access to “Anyone with the link” so students can open and download it.</p><label>Paper 1 answers · YouTube link<input name="answers_url" type="url" maxLength={2000} placeholder="https://www.youtube.com/watch?v=…" defaultValue={editor.item?.answers_url ?? ""} /></label><label>Paper 2 answers · YouTube link<input name="answers_2_url" type="url" maxLength={2000} placeholder="https://www.youtube.com/watch?v=…" defaultValue={editor.item?.answers_2_url ?? ""} /></label><p className="admin-caption">Optional. Use a public or unlisted video. Clear either link to remove its student button.</p></> : <><MarksInput initialMarks={editor.item?.marks} /><label>Medium<select name="medium" defaultValue={editor.item?.medium ?? "si"}><option value="si">Sinhala</option><option value="en">English</option></select></label><label>School<input name="school" list="kalutara-schools" autoComplete="off" placeholder="Search or type a school name" required maxLength={200} defaultValue={editor.item?.school} /><datalist id="kalutara-schools">{schoolNames.map((name) => <option key={name} value={name} />)}</datalist></label><p className="admin-caption">Search Kalutara government schools or type another school name.</p></>}
          {error && <p className="admin-message error" role="alert">{error}</p>}<button className="purchase-button" type="submit">{busy ? "Saving…" : "Save"}</button>
        </fieldset></form>
      </section>}
    </dialog>
  </section>;
}
