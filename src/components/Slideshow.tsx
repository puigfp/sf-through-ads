"use client";

import { useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ImageEntry } from "@/lib/types";
import { formatFilmDate } from "@/lib/utils";

interface SlideshowProps {
  image: ImageEntry;
  prevImages: ImageEntry[];
  nextImages: ImageEntry[];
}

export function Slideshow({ image, prevImages, nextImages }: SlideshowProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // Get immediate prev/next for navigation
  const prevImage = prevImages[0] ?? null;
  const nextImage = nextImages[0] ?? null;

  // Hidden preload images using Next.js Image components
  // These go through Next.js optimization pipeline unlike browser Image API

  const goToPrev = useCallback(() => {
    if (prevImage) {
      router.push(`/image/${prevImage.id}`);
    }
  }, [prevImage, router]);

  const goToNext = useCallback(() => {
    if (nextImage) {
      router.push(`/image/${nextImage.id}`);
    }
  }, [nextImage, router]);

  const close = useCallback(() => {
    router.push("/");
  }, [router]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToPrev();
      } else if (e.key === "ArrowRight") {
        goToNext();
      } else if (e.key === "Escape") {
        close();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrev, goToNext, close]);


  // Click outside image to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      close();
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[var(--color-slideshow-bg)] flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={close}
        className="absolute top-4 right-4 z-10 p-2 text-white/70 hover:text-white transition-colors"
        aria-label="Close"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Previous button */}
      {prevImage && (
        <button
          onClick={goToPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 text-white/50 hover:text-white transition-colors"
          aria-label="Previous image"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Next button */}
      {nextImage && (
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 text-white/50 hover:text-white transition-colors"
          aria-label="Next image"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Image container */}
      <div className="relative w-full h-full max-w-5xl max-h-[85vh] mx-4 sm:mx-16 flex items-center justify-center">
        <div 
          className="relative h-full"
          style={{ 
            aspectRatio: `${image.width} / ${image.height}`,
            maxHeight: '85vh',
            maxWidth: '100%',
          }}
        >
          <Image
            src={`/images/${image.filename}`}
            alt={image.ai_generated_alt_text}
            fill
            className="object-contain"
            sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1280px) calc(100vw - 8rem), 1024px"
            priority
          />

          {/* Film-style date stamp */}
          <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 font-mono text-[10px] sm:text-xs text-orange-400/70 whitespace-nowrap">
            {formatFilmDate(image.taken_at, image.location, image.timezone)}
          </div>
        </div>
      </div>

      {/* Description below image */}
      {image.description && (
        <div className="absolute bottom-8 left-0 right-0 text-center px-4">
          <p className="text-neutral-300 text-sm sm:text-base max-w-2xl mx-auto animate-fadeIn">
            {image.description}
          </p>
        </div>
      )}

      {/* Navigation dots/counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-neutral-500 text-xs font-mono">
        {image.id}
      </div>

      {/* Hidden preload images - positioned off-screen to avoid layout issues */}
      <div className="absolute -top-full -left-full opacity-0 pointer-events-none">
        {prevImages.map((img) => (
          <div key={`preload-prev-${img.id}`} className="w-96 h-96 relative">
            <Image
              src={`/images/${img.filename}`}
              alt=""
              fill
              priority={false}
              sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1280px) calc(100vw - 8rem), 1024px"
            />
          </div>
        ))}
        {nextImages.map((img) => (
          <div key={`preload-next-${img.id}`} className="w-96 h-96 relative">
            <Image
              src={`/images/${img.filename}`}
              alt=""
              fill
              priority={false}
              sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1280px) calc(100vw - 8rem), 1024px"
            />
          </div>
        ))}
      </div>

      {/* Link prefetch for adjacent pages - Next.js will preload page resources */}
      {prevImage && (
        <Link href={`/image/${prevImage.id}`} prefetch className="hidden">
          <span />
        </Link>
      )}
      {nextImage && (
        <Link href={`/image/${nextImage.id}`} prefetch className="hidden">
          <span />
        </Link>
      )}

    </div>
  );
}
