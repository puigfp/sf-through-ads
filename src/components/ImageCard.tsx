"use client";

import Image from "next/image";
import Link from "next/link";
import type { ImageEntry } from "@/lib/types";
import { SITE_CONFIG } from "@/lib/config";

interface ImageCardProps {
  image: ImageEntry;
  priority?: boolean;
}

export function ImageCard({ image, priority = false }: ImageCardProps) {
  return (
    <Link
      href={`/image/${image.id}`}
      className="group block relative aspect-square overflow-hidden bg-neutral-100 rounded-sm"
    >
      <Image
        src={`/images/${image.thumbnail_filename}`}
        alt={image.ai_generated_alt_text}
        fill
        sizes={`(max-width: 640px) 50vw, (max-width: 1024px) 33vw, ${SITE_CONFIG.gridThumbnailSize}px`}
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        priority={priority}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
    </Link>
  );
}
