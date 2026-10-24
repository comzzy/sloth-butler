"use client";
import { useEffect, useRef, type ReactNode } from "react";

export function Tilt({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let rx = 0, ry = 0, tx = 0, ty = 0, raf = 0, input = false;
    const set = (x: number, y: number) => { tx = x; ty = y; input = true; };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      set(((e.clientY - r.top) / r.height - 0.5) * -10, ((e.clientX - r.left) / r.width - 0.5) * 14);
    };
    const onLeave = () => { tx = 0; ty = 0; input = false; };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      set(Math.max(-8, Math.min(8, (e.beta - 40) * -0.25)), Math.max(-10, Math.min(10, e.gamma * 0.35)));
    };
    const loop = (t: number) => {
      const coarse = !matchMedia("(pointer:fine)").matches;
      if (!input && coarse) { tx = Math.sin(t / 3200) * 3; ty = Math.sin(t / 4100) * 6; }
      rx += (tx - rx) * 0.05; ry += (ty - ry) * 0.05;
      el.style.setProperty("--rx", rx.toFixed(2) + "deg");
      el.style.setProperty("--ry", ry.toFixed(2) + "deg");
      raf = requestAnimationFrame(loop);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    window.addEventListener("deviceorientation", onTilt);
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave); window.removeEventListener("deviceorientation", onTilt); };
  }, []);
  return <div ref={ref} className="head head-3d">{children}</div>;
}
