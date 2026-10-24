"use client";
import { useEffect, useState } from "react";
import { dueTodayCount, FU_EVENT, loadPlans } from "@/lib/store";

export function FollowupBadge({ home }: { home: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const up = () => setN(dueTodayCount(loadPlans()));
    up(); window.addEventListener(FU_EVENT, up); window.addEventListener("storage", up);
    const t = setInterval(up, 60_000);
    return () => { window.removeEventListener(FU_EVENT, up); window.removeEventListener("storage", up); clearInterval(t); };
  }, []);
  return (
    <a href={`${home ? "" : "/"}#followups`} className="nav-fu" aria-label={n ? `Follow-ups, ${n} due today` : "Follow-ups"}>
      Follow-ups{n > 0 && <span className="badge-count" aria-hidden="true">{n}</span>}
    </a>
  );
}
