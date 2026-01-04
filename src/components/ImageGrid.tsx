"use client";

import Image from "next/image";
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

  // Preload the next batch of images that will become visible
  const preloadItems = hasMore
    ? images.slice(visibleItems.length, visibleItems.length + SITE_CONFIG.gridBatchSize)
    : [];

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

      {/* Hidden preload images for upcoming batch - positioned off-screen */}
      {preloadItems.length > 0 && (
        <div className="absolute -top-full -left-full opacity-0 pointer-events-none">
          {preloadItems.map((image) => (
            <div key={`preload-grid-${image.id}`} className="w-0 h-0 relative">
              <Image
                src={`/images/${image.thumbnail_filename}`}
                alt=""
                fill
                priority={false}
                sizes={`(max-width: 640px) 50vw, (max-width: 1024px) 33vw, ${SITE_CONFIG.gridThumbnailSize}px`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
