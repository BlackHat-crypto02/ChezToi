"use client";

import { useRef, useState, type PointerEvent } from "react";

/// Visionneuse 360° légère : l'image équirectangulaire défile à l'infini
/// quand on la fait glisser (rotation horizontale), molette pour zoomer.
export default function VisionneusePanorama({ src, titre }: { src: string; titre: string }) {
  const [decalage, setDecalage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const depart = useRef<{ x: number; decalage: number } | null>(null);

  function surAppui(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    depart.current = { x: e.clientX, decalage };
  }

  function surMouvement(e: PointerEvent<HTMLDivElement>) {
    if (!depart.current) return;
    setDecalage(depart.current.decalage + (e.clientX - depart.current.x));
  }

  return (
    <div
      role="img"
      aria-label={`Vue 360° : ${titre}`}
      onPointerDown={surAppui}
      onPointerMove={surMouvement}
      onPointerUp={() => (depart.current = null)}
      onPointerCancel={() => (depart.current = null)}
      onWheel={(e) => setZoom((z) => Math.min(2.5, Math.max(1, z - e.deltaY * 0.001)))}
      className="h-[60vh] min-h-80 w-full cursor-grab touch-none select-none rounded-2xl bg-gray-900 active:cursor-grabbing"
      style={{
        backgroundImage: `url("${src}")`,
        backgroundRepeat: "repeat-x",
        backgroundSize: `auto ${zoom * 100}%`,
        backgroundPosition: `${decalage}px center`,
      }}
    />
  );
}
