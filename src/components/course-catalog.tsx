"use client";

import { adminRequest, readDemo } from "@/lib/demo-store";
import YoutubeThumbnail from "@/components/youtube-thumbnail";
import Image from "next/image";
import Link from "next/link";
import LoginForm from "@/components/login-form";
import FolderEditor from "@/components/folder-editor";
import VideoEditor from "@/components/video-editor";
import { LessonFolder, VideoModule, Medium, contentMedium } from "@/lib/modules";
import { BookOpen, FileClock, FileText, Info, MessageSquare, Search, X, Plus, FolderOpen, ArrowLeft, Award, Video, Phone, Send, ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function YoutubeIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="5" fill="#ff0033" /><path d="m10 8 6 4-6 4z" fill="white" /></svg>;
}
function FacebookIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1877f2" /><path d="M13.5 24V13h3.7l.6-4h-4.3V6.7c0-1.2.4-2 2.1-2H18V1.1C17.6 1 16.2.9 14.6.9c-3.4 0-5.6 2.1-5.6 5.9V9H5.5v4H9v11z" fill="white" /></svg>;
}
function TiktokIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 2c.4 2.8 2 4.5 5 4.8v3.5a9 9 0 0 1-5-1.5V16a6 6 0 1 1-6-6v3.5a2.5 2.5 0 1 0 2.5 2.5V2z" fill="#25f4ee" transform="translate(-.6 .6)" /><path d="M16 2c.4 2.8 2 4.5 5 4.8v3.5a9 9 0 0 1-5-1.5V16a6 6 0 1 1-6-6v3.5a2.5 2.5 0 1 0 2.5 2.5V2z" fill="#fe2c55" transform="translate(.6 0)" /><path d="M16 2c.4 2.8 2 4.5 5 4.8v3.5a9 9 0 0 1-5-1.5V16a6 6 0 1 1-6-6v3.5a2.5 2.5 0 1 0 2.5 2.5V2z" fill="#161823" /></svg>;
}

const categories = [
  { label: "2026 O/L Maths", icon: BookOpen },
  { label: "Grade 10", icon: BookOpen },
  { label: "General maths", icon: BookOpen },
  { label: "AL Video Modules", icon: BookOpen },
  { label: "Tutes", icon: FileText, divider: true },
  { label: "#tute", icon: FileText },
  { label: "A/L Past Papers", icon: FileClock, divider: true },
  { label: "O/L Past Papers", icon: FileClock },
  { label: "About Us", icon: MessageSquare, divider: true },
  { label: "Contact Us", icon: Info },
];

function Brand({ compact = false }: { compact?: boolean }) {
  const [imageMissing, setImageMissing] = useState(false);
  return <span className={`brand ${compact ? "brand-compact" : ""}`}>
    {imageMissing ? <span className="brand-fallback">Sahan Medonsa</span> : <Image src="/logo.png" alt="Sahan Medonsa" width={1175} height={344} unoptimized onError={() => setImageMissing(true)} />}
  </span>;
}

export default function CourseCatalog({ mode = "public" }: { mode?: "public" | "admin" }) {
  const admin = mode === "admin";
  const [medium, setMedium] = useState<Medium>("si");
  const [demo, setDemo] = useState(false);
  const [session, setSession] = useState<{ authenticated: boolean; email?: string } | null>(null);
  const [editor, setEditor] = useState<{ lesson: VideoModule | null } | null>(null);
  const [folders, setFolders] = useState<LessonFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [folderEditor, setFolderEditor] = useState<{ folder: LessonFolder | null } | null>(null);
  const [notice, setNotice] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [category, setCategory] = useState("2026 O/L Maths");
  const [query, setQuery] = useState("");
  const [menuQuery, setMenuQuery] = useState("");
  const [selectedLesson, setSelectedLesson] = useState<VideoModule | null>(null);
  const [lessons, setLessons] = useState<VideoModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(mode === "admin" ? "/api/admin" : "/api/modules", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
    try { const savedMedium = localStorage.getItem("medonsa-medium"); if (savedMedium === "si" || savedMedium === "en") setMedium(savedMedium); } catch {}

        if (!response.ok) throw new Error(data.error);
        if (data.demo) {
          const saved = readDemo();
          setDemo(true);
          setSession({ authenticated: true });
          setLessons(mode === "admin" ? saved.modules : saved.modules.filter((item) => item.published));
          setFolders(saved.folders);
          setLoadError("");
          return;
        }
        if (mode !== "public") setSession(data);
        setLessons(data.modules || []);
        setFolders(data.folders || []);
        setLoadError("");
      })
      .catch((error) => { if (!controller.signal.aborted) setLoadError(error.message || "Could not load lessons."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload, mode]);
  const purchase = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selectedLesson) purchase.current?.showModal();
    else purchase.current?.close();
  }, [selectedLesson]);

  useEffect(() => {
    if (!selectedLesson) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [selectedLesson]);

  function navigate(label: string) {
    setCategory(label);
    setActiveFolderId(null);
    setNotice("");
    setQuery("");
    window.scrollTo({ top: 0 });
  }

  const isTute = category === "#tute";
  const isCourse = !["About Us", "Contact Us"].includes(category);
  const activeFolder = folders.find((folder) => folder.id === activeFolderId) ?? null;
  const shownFolders = folders.filter((folder) => folder.category === category && contentMedium(folder) === medium && (folder.title + folder.description).toLowerCase().includes(query.toLowerCase()));
  const shownLessons = lessons.filter((lesson) => lesson.category === category && contentMedium(lesson) === medium && (isTute || (activeFolder ? lesson.folder_id === activeFolder.id : !lesson.folder_id)) && (lesson.title + lesson.description).toLowerCase().includes(query.toLowerCase()));

  async function signOut() {
    setActionBusy(true);
    try {
      const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
      if (!response.ok) throw new Error("Could not sign out. Try again.");
      setLessons([]); setFolders([]); setActiveFolderId(null); setSelectedLesson(null); setSession({ authenticated: false });
    } catch (error) { setLoadError((error as Error).message); }
    finally { setActionBusy(false); }
  }

  async function toggleStudentAccess(lesson: VideoModule) {
    setActionBusy(true); setLoadError(""); setNotice("");
    try {
      const data = await adminRequest({
        action: "save", id: lesson.id, title: lesson.title, description: lesson.description,
        medium: contentMedium(lesson), category: lesson.category, folder_id: lesson.folder_id ?? null,
        url: `https://www.youtube.com/watch?v=${lesson.video_id}`, published: !lesson.published,
      }, demo);
      setLessons((current) => current.map((item) => item.id === lesson.id ? data.module : item));
      setNotice(data.module.published ? "Video enabled for students." : "Video disabled for students.");
    } catch (error) { setLoadError((error as Error).message); }
    finally { setActionBusy(false); }
  }

  async function deleteLesson(lesson: VideoModule) {
    if (!window.confirm(`Delete “${lesson.title}”? This cannot be undone.`)) return;
    setActionBusy(true); setLoadError("");
    try {
      await adminRequest({ action: "delete", id: lesson.id }, demo);
      setLessons((current) => current.filter((item) => item.id !== lesson.id)); setNotice("Video deleted.");
    } catch (error) { setLoadError((error as Error).message); }
    finally { setActionBusy(false); }
  }

  if (mode !== "public" && session && !session.authenticated) {
    return <LoginForm onSignedIn={async () => {
      const response = await fetch("/api/admin", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSession(data); setLessons(data.modules || []); setFolders(data.folders || []); setLoadError("");
    }} />;
  }
  if (mode !== "public" && !session) return <main className="signin-page"><section className="signin-card"><p role={loadError ? "alert" : "status"}>{loadError || "Loading your dashboard…"}</p>{loadError && <button className="purchase-button" onClick={() => setReload((value) => value + 1)}>Try again</button>}</section></main>;

  return (
    <div className="site">
      <header className="topbar">
        <Brand />
        <div className="catalog-account"><span className="status-badge">{admin ? "Admin dashboard" : "Learning space"}</span><label className="medium-selector"><span>Medium</span><select aria-label="Teaching medium" value={medium} onChange={(event) => {
          const next = event.target.value as Medium;
          setMedium(next); setActiveFolderId(null); setSelectedLesson(null); setQuery(""); setNotice("");
          try { localStorage.setItem("medonsa-medium", next); } catch {}
        }}><option value="si">සිංහල · Sinhala</option><option value="en">English</option></select></label>{session?.email && <span className="account-email">{session.email}</span>}{demo ? <Link className="secondary-button" href={admin ? "/student" : "/admin"}>{admin ? "Student view" : "Admin dashboard"}</Link> : admin && <button className="secondary-button" disabled={actionBusy} onClick={signOut}>Sign out</button>}</div>
      </header>

      <aside id="navigation" className="navigation-drawer" aria-label="Course navigation">
        <div className="drawer-inner">
          <div className="drawer-top"><span>Browse courses</span></div>
          <label className="menu-search"><Search size={24} /><input placeholder="Search..." aria-label="Search menu" value={menuQuery} onChange={(event) => setMenuQuery(event.target.value)} /></label>
          <nav aria-label="Main navigation">
            {categories.filter((item) => item.label.toLowerCase().includes(menuQuery.toLowerCase())).map(({ label, icon: Icon, divider }) => (
              <button key={label} className={`nav-item ${category === label ? "active" : ""} ${divider ? "divider" : ""}`} aria-current={category === label ? "page" : undefined} onClick={() => navigate(label)}><Icon size={37} strokeWidth={1.8} /><span>{label}</span></button>
            ))}
            {!categories.some((item) => item.label.toLowerCase().includes(menuQuery.toLowerCase())) && <p className="menu-empty">No matching sections.</p>}
          </nav>
        </div>
      </aside>

      <main className="main-content">
        <h1 className="category-title">{activeFolder?.title ?? category}</h1>
        {demo && <p className="demo-notice">Frontend demo · No login needed. Changes are saved in this browser only.</p>}
        {notice && <p className="admin-message success" role="status">{notice}</p>}
        {isCourse ? <>
          {activeFolder && <div className="folder-detail"><button className="secondary-button folder-back" onClick={() => { setActiveFolderId(null); setQuery(""); }}><ArrowLeft size={16} /> All lessons · {category}</button><p>{activeFolder.description}</p><div className="folder-stats"><span><Video size={17} /> {lessons.filter((item) => item.folder_id === activeFolder.id && contentMedium(item) === medium).length} {admin ? "videos added" : "videos available"} / {activeFolder.planned_videos} planned</span><span><Award size={17} /> {activeFolder.marks} marks available</span>{admin && <button className="secondary-button" onClick={() => setFolderEditor({ folder: activeFolder })}>Edit folder details</button>}</div></div>}
          <div className="catalog-toolbar"><span>{isTute ? "YouTube videos" : activeFolder ? "Videos in this lesson" : "Lesson folders"} · {category}</span><div className="catalog-controls">{admin && (activeFolder || isTute ? <button className="purchase-button add-video-button" onClick={() => setEditor({ lesson: null })}><Plus size={19} /> Add video</button> : <button className="purchase-button add-video-button" onClick={() => setFolderEditor({ folder: null })}><Plus size={19} /> Add lessons</button>)}<label className="lesson-search"><Search size={18} /><input aria-label="Search lessons" placeholder="Search lessons..." value={query} onChange={(event) => setQuery(event.target.value)} /></label></div></div>
          {!activeFolder && !isTute && <div className="lesson-grid folder-grid">{shownFolders.map((folder) => {
            const count = lessons.filter((lesson) => lesson.folder_id === folder.id && contentMedium(lesson) === medium).length;
            return <article className="lesson-folder-card" key={folder.id}>
              <span className="folder-symbol"><FolderOpen size={33} /></span>
              <h2>{folder.title}</h2><p className="folder-description">{folder.description}</p>
              <div className="folder-stats"><span><Video size={17} /> {count} {admin ? "videos added" : "videos available"} / {folder.planned_videos} planned</span><span><Award size={17} /> {folder.marks} marks available</span></div>
              <div className="card-actions">{admin && <button className="secondary-button" onClick={() => setFolderEditor({ folder })}>Edit details</button>}<button className="purchase-button" onClick={() => { setActiveFolderId(folder.id); setQuery(""); setNotice(""); }}>Open folder</button></div>
            </article>;
          })}</div>}
          {!activeFolder && !isTute && shownLessons.length > 0 && <h2 className="unfiled-heading">Unfiled videos</h2>}
          <div className="lesson-grid video-grid">
            {shownLessons.map((lesson) => <article className="lesson-card video-card" key={lesson.id}>
              <button className="video-thumbnail" onClick={() => setSelectedLesson(lesson)} aria-label={`Watch ${lesson.title}`}><YoutubeThumbnail videoId={lesson.video_id} alt={lesson.title} /><span className="video-play" aria-hidden="true">▶</span></button>
              {admin && <div className="student-access"><span>{lesson.published ? "Enabled for students" : "Disabled for students"}</span><button type="button" className="access-switch" role="switch" aria-checked={lesson.published} aria-label={`Student access to ${lesson.title}`} disabled={actionBusy} onClick={() => toggleStudentAccess(lesson)}><span /></button></div>}
              <h2>{lesson.title}</h2>
              <p className="lesson-description">{lesson.description}</p>
              <div className="card-actions">{admin && <><button className="secondary-button" disabled={actionBusy} onClick={() => setEditor({ lesson })}>Edit</button><button className="secondary-button danger-button" disabled={actionBusy} onClick={() => deleteLesson(lesson)}>Delete</button></>}<button className="purchase-button" onClick={() => setSelectedLesson(lesson)}>{admin ? "Preview" : "Watch lesson"}</button></div>
            </article>)}
          </div>
          {loading && <p role="status">Loading lessons…</p>}
          {loadError && <div className="empty-panel" role="alert"><p>{loadError}</p><button className="purchase-button" onClick={() => { setLoading(true); setLoadError(""); setReload((value) => value + 1); }}>Try again</button></div>}
          {!loading && !loadError && shownLessons.length === 0 && (isTute || activeFolder || shownFolders.length === 0) && <div className="empty-panel"><Search size={32} /><h2>{query ? "No lessons found" : admin ? isTute ? "Add a YouTube video" : activeFolder ? "Add videos to this folder" : "Create your first lesson folder" : activeFolder ? "Videos coming soon" : "Lessons coming soon"}</h2><p>{query ? "Try another lesson name." : admin ? isTute ? "Paste a YouTube link to add a #tute video." : activeFolder ? "Paste a YouTube link to add a video to this lesson." : "Add a title, description, video count, and marks to get started." : "Published lessons will appear here."}</p>{query ? <button className="purchase-button" onClick={() => setQuery("")}>Clear search</button> : admin && <button className="purchase-button add-video-button" onClick={() => activeFolder || isTute ? setEditor({ lesson: null }) : setFolderEditor({ folder: null })}><Plus size={18} /> {activeFolder || isTute ? "Add video" : "Add lessons"}</button>}</div>}
        </> : category === "About Us" ? <section className="about-section" aria-labelledby="about-heading">
          <div className="about-introduction">
            <div className="about-portrait"><Image src="/me.png" alt="Sahan Medonsa, IT lecturer and software developer" width={852} height={998} sizes="(max-width: 900px) 80vw, 35vw" /><span className="about-photo-caption">Your lecturer. A fellow learner.</span></div>
            <div className="about-story">
              <span className="about-eyebrow">MEET THE PERSON BEHIND THE LESSONS</span>
              <h2 id="about-heading">Hi, I’m Sahan.<br /><span>Let’s turn curiosity into skills.</span></h2>
              <p className="about-role">Sahan Medonsa · IT Lecturer &amp; Software Developer</p>
              <p>I’m Sahan Medonsa, an IT lecturer and software developer with a BSc (Hons) in Information Technology. I teach ICT and software skills through practical, easy-to-follow lessons.</p>
              <p>I believe learning makes more sense when you can put it into practice. My approach is to break ideas into manageable steps, make room for questions, and help you build the confidence to try things yourself.</p>
              <div className="about-qualification"><Award size={22} aria-hidden="true" /><span>BSc (Hons) in Information Technology</span></div>
            </div>
          </div>
          <div className="about-purpose">
            <span className="about-eyebrow">A CLASSROOM BEYOND THE CLASSROOM</span>
            <h3>A place to revisit, practise, and explore.</h3>
            <p>I created this website to share learning materials with my students and showcase the projects I’m working on. It brings lessons, video modules, tutes, and past-paper practice into one place, so you can return to a topic whenever you need it.</p>
            <p>Whether you’re revising for an exam, catching up on a lesson, or exploring an interest in technology, you’re welcome here. Browse the published materials freely, without creating an account, and learn at your own pace.</p>
          </div>
          <div className="about-values">
            <article><BookOpen size={25} aria-hidden="true" /><h3>Understand the idea</h3><p>Clear explanations that help you build your understanding, one lesson at a time.</p></article>
            <article><Video size={25} aria-hidden="true" /><h3>Learn at your pace</h3><p>Pause, replay, and revisit lessons. Give yourself the time to make each concept click.</p></article>
            <article><FolderOpen size={25} aria-hidden="true" /><h3>Connect it to practice</h3><p>Explore learning materials and follow my work as I turn software ideas into projects.</p></article>
          </div>
          <div className="about-invitation"><div><h3>Your next lesson starts with a little curiosity.</h3><p>Choose a topic, open a lesson, and take the next step.</p></div><button className="purchase-button" onClick={() => navigate("2026 O/L Maths")}>Explore lessons <span aria-hidden="true">→</span></button></div>
        </section>
          : category === "Contact Us" ? <section className="contact-section" aria-labelledby="contact-heading">
            <div className="contact-intro"><span className="about-eyebrow">LET’S CONNECT</span><h2 id="contact-heading">A question is a great place to start.</h2><p>Need help finding a lesson, have a question about ICT, or want to talk about a project? Get in touch with Sahan Medonsa.</p></div>
            <div className="contact-grid">
              <a className="contact-card" href="tel:+94743874808"><Phone size={27} aria-hidden="true" /><h3>Give me a call</h3><p>Let’s talk about your learning journey.</p><span className="contact-link">074 387 4808 <ArrowUpRight size={18} aria-hidden="true" /></span></a>
              <a className="contact-card contact-whatsapp" href="https://wa.me/94743874808" target="_blank" rel="noopener noreferrer"><MessageSquare size={27} aria-hidden="true" /><h3>WhatsApp</h3><p>Send your question or say hello.</p><span className="contact-link">Chat on WhatsApp <ArrowUpRight size={18} aria-hidden="true" /></span></a>
            </div>
            <div className="contact-social-heading"><h3>Keep in touch, wherever you learn.</h3><p>Find lessons, updates, and more from Sahan Medonsa.</p></div>
            <div className="contact-social-grid">{[
              { name: "YouTube", icon: YoutubeIcon, href: "https://youtube.com/@sahanmedonsa?si=UKqX6NtnP3PdXB7F", description: "Lessons you can watch and revisit." },
              { name: "Facebook", icon: FacebookIcon, href: "https://www.facebook.com/share/191vbSuguk/?mibextid=wwXIfr", description: "Learning updates and conversations." },
              { name: "TikTok", icon: TiktokIcon, href: "https://www.tiktok.com/@sahanmedonsa?_r=1&_t=ZS-99pNk8e5kWu", description: "A little learning in your daily scroll." },
              { name: "Telegram", icon: Send, href: undefined, description: "Stay connected with lesson updates." },
            ].map(({ name, icon: Icon, description, href }) => <div className="contact-social-card" key={name}><Icon aria-hidden="true" /><h4>{name}</h4><p>{description}</p>{href ? <a className="contact-social-link" href={href} target="_blank" rel="noopener noreferrer">Official {name} <ArrowUpRight size={16} aria-hidden="true" /></a> : <span className="contact-pending">Link coming soon</span>}</div>)}</div>
          </section>
          : <section className="empty-panel"><BookOpen size={40} /><h2>{category}</h2><p>Resources for this section will appear here when published.</p></section>}
      </main>
      <footer><Brand compact /> <span>Learn at your own pace.</span>{admin && <Link href="/student">Student dashboard</Link>}</footer>

      {folderEditor && admin && <FolderEditor medium={medium} demo={demo} folder={folderEditor.folder} category={category} onClose={() => setFolderEditor(null)} onSaved={(saved) => {
        setFolders((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
        setMedium(contentMedium(saved)); setFolderEditor(null); setQuery(""); setNotice("Lesson folder saved. Open it to add videos.");
      }} />}
      {editor && admin && <VideoEditor medium={medium} demo={demo} lesson={editor.lesson} category={category} folder={activeFolder} folders={folders} onClose={() => setEditor(null)} onSaved={(saved) => {
        setLessons((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
        setMedium(contentMedium(saved)); setCategory(saved.category); setActiveFolderId(saved.folder_id ?? null); setQuery(""); setEditor(null);
        setNotice(saved.published ? "Video published for students." : "Draft saved. Only admins can see this video.");
      }} />}
      <dialog ref={purchase} className="purchase-dialog video-dialog" onCancel={() => setSelectedLesson(null)} onClose={() => setSelectedLesson(null)} onClick={(event) => { if (event.target === event.currentTarget) setSelectedLesson(null); }} aria-labelledby="purchase-title">
        {selectedLesson && <div className="purchase-content"><button className="close-button dialog-close" aria-label="Close video" onClick={() => setSelectedLesson(null)}><X size={22} /></button><h2 id="purchase-title">{selectedLesson.title}</h2><iframe className="lesson-player" src={`https://www.youtube-nocookie.com/embed/${selectedLesson.video_id}`} title={selectedLesson.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /><p>{selectedLesson.description}</p><a href={`https://www.youtube.com/watch?v=${selectedLesson.video_id}`} target="_blank" rel="noreferrer">Watch on YouTube ↗</a></div>}
      </dialog>
    </div>
  );
}
