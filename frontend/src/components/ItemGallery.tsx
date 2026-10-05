"use client";

import { useState } from "react";
import type { ItemMediaPublic } from "@/lib/types";

export default function ItemGallery({ media, itemName }: { media: ItemMediaPublic[]; itemName: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = media[activeIndex];

  if (media.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center bg-zinc-100 text-5xl">🖼️</div>
    );
  }

  return (
    <div>
      <div className="aspect-square w-full bg-zinc-100">
        {active.type === "VIDEO" ? (
          <video key={active.id} src={active.url} controls className="h-full w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary external S3/CloudFront media URLs
          <img key={active.id} src={active.url} alt={itemName} className="h-full w-full object-cover" />
        )}
      </div>
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-3">
          {media.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${
                i === activeIndex ? "border-accent" : "border-transparent"
              }`}
              aria-label={`View media ${i + 1}`}
            >
              {m.type === "VIDEO" ? (
                <div className="flex h-full w-full items-center justify-center bg-zinc-200 text-lg">▶️</div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- thumbnail strip
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
