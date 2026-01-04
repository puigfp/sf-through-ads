"use client";

import { ImageCard } from "./ImageCard";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { SITE_CONFIG } from "@/lib/config";
import type { ImageEntry } from "@/lib/types";

interface ImageGridProps {
  images: ImageEntry[];
}

export function ImageGrid({ images }: ImageGridProps) {
  const { visibleItems, hasMore, sentinelRef } = useInfiniteScroll({
    items: images,
    batchSize: SITE_CONFIG.gridBatchSize,
  });

  if (images.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-neutral-500 text-lg">No images yet.</p>
        <p className="text-neutral-400 mt-2">
          Run{" "}
          <code className="font-mono bg-neutral-100 px-2 py-1 rounded">
            pnpm import-images
          </code>{" "}
          to add some.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 sm:gap-2">
        {visibleItems.map((image, index) => (
          <div
            key={image.id}
            className="animate-fadeIn"
            style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
          >
            <ImageCard image={image} priority={index < 8} />
          </div>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
