"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { ExternalLink, X, Play } from "lucide-react";

const noticeKey = "medonsa-youtube-notice-seen";

export default function SubscribeNotice() {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    try { if (sessionStorage.getItem(noticeKey)) return; } catch {}
    element.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const restore = () => { document.body.style.overflow = previous; };
    element.addEventListener("close", restore);
    return () => { element.removeEventListener("close", restore); element.close(); restore(); };
  }, []);

  function dismiss() {
    try { sessionStorage.setItem(noticeKey, "true"); } catch {}
    dialog.current?.close();
  }

  return <dialog ref={dialog} className="subscribe-notice" aria-labelledby="subscribe-notice-title" aria-describedby="subscribe-notice-description" onCancel={(event) => { event.preventDefault(); dismiss(); }} onClick={(event) => { if (event.target === event.currentTarget) dismiss(); }}>
    <section className="subscribe-notice-content">
      <button className="close-button subscribe-notice-close" aria-label="Close subscription notice" onClick={dismiss}><X size={22} /></button>
      <Image src="/logo.png" alt="Sahan Medonsa" width={1006} height={284} className="subscribe-notice-logo" unoptimized />
      <span className="subscribe-notice-icon"><Play size={34} aria-hidden="true" /></span>
      <h2 id="subscribe-notice-title">Keep learning on YouTube</h2>
      <p id="subscribe-notice-description">Subscribe to Sahan Medonsa for new lessons, paper discussions, and study tips.</p>
      <a className="subscribe-notice-button" href="https://www.youtube.com/@sahanmedonsa?sub_confirmation=1" target="_blank" rel="noopener noreferrer" onClick={dismiss}><Play size={21} aria-hidden="true" /> Subscribe on YouTube <ExternalLink size={16} aria-hidden="true" /></a>
    </section>
  </dialog>;
}
