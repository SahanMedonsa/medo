"use client";

import { useEffect, useRef, useState } from "react";
import { ContentOrder } from "@/lib/content-order";

export function useDisplayOrder(scope: string) {
  const [saved, setSaved] = useState<{ scope: string; order: ContentOrder } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const currentScope = useRef(scope);
  useEffect(() => {
    currentScope.current = scope;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/catalog-settings?scope=${encodeURIComponent(scope)}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        const value = data.demo ? localStorage.getItem(`medonsa-content-order-${scope}`) ?? localStorage.getItem("medonsa-content-order") : data.contentOrder;
        if (!controller.signal.aborted) { setSaved({ scope, order: value === "oldest" ? "oldest" : "newest" }); setError(""); }
      } catch (error) { if (!controller.signal.aborted) setError((error as Error).message); }
    }
    void load();
    const refresh = () => { if (!document.hidden) void load(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); window.removeEventListener("storage", refresh); };
  }, [scope]);

  async function save(order: ContentOrder, demo: boolean) {
    setBusy(true); setError(""); setNotice("");
    try {
      if (demo) localStorage.setItem(`medonsa-content-order-${scope}`, order);
      else {
        const response = await fetch("/api/catalog-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope, contentOrder: order }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
      }
      if (currentScope.current === scope) { setSaved({ scope, order }); setNotice("Display order saved for students."); }
    } catch (error) { if (currentScope.current === scope) setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return { order: saved?.scope === scope ? saved.order : "newest" as ContentOrder, loaded: saved?.scope === scope, busy, error, notice, save };
}

export default function DisplayOrder({ setting, demo, label = "Student display order" }: { label?: string; setting: ReturnType<typeof useDisplayOrder>; demo: boolean }) {
  return <><div className="admin-content-order"><label>{label}<select aria-label={`${label} by added date`} value={setting.order} disabled={setting.busy || !setting.loaded} onChange={(event) => void setting.save(event.target.value as ContentOrder, demo)}><option value="oldest">First added first</option><option value="newest">First added last</option></select></label></div>{setting.error && <p role="alert">{setting.error}</p>}{setting.notice && <p role="status">{setting.notice}</p>}</>;
}
