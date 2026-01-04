"use client";

import { useEffect, useCallback, useState, useRef } from "react";
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

  // Scroll and momentum state
  const [scrollOffset, setScrollOffset] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastTouchTime, setLastTouchTime] = useState(0);
  const [lastTouchX, setLastTouchX] = useState(0);
  const [lastTouchY, setLastTouchY] = useState(0);
  const [animationFrame, setAnimationFrame] = useState<number | null>(null);

  // Zoom and pan state
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialPinchCenter, setInitialPinchCenter] = useState<{ x: number; y: number } | null>(null);
  const [initialScale, setInitialScale] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);

  // Double tap state
  const [lastTapTime, setLastTapTime] = useState(0);
  const [lastTapPosition, setLastTapPosition] = useState<{ x: number; y: number } | null>(null);

  // Constants
  const FRICTION = 0.95;
  const MIN_VELOCITY = 0.01;
  const SWIPE_THRESHOLD = 100;
  const MAX_OVERSCROLL = 80;
  const MIN_SCALE = 1;
  const MAX_SCALE = 4;
  const DOUBLE_TAP_SCALE = 2.5;

  // Helper functions
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch) => {
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const getTouchCenter = (touch1: React.Touch, touch2: React.Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  const resetZoom = useCallback(() => {
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsZoomed(false);
  }, []);

  // Momentum animation
  const animateMomentum = useCallback(() => {
    setScrollOffset(prev => {
      const newOffset = prev + velocity;
      const boundedOffset = Math.max(-MAX_OVERSCROLL, Math.min(MAX_OVERSCROLL, newOffset));

      setVelocity(prev => prev * FRICTION);

      if (Math.abs(velocity) < MIN_VELOCITY) {
        setAnimationFrame(null);
        if (boundedOffset !== 0) {
          setScrollOffset(0);
        }
        return 0;
      }

      return boundedOffset;
    });

    if (Math.abs(velocity) >= MIN_VELOCITY) {
      setAnimationFrame(requestAnimationFrame(animateMomentum));
    }
  }, [velocity]);

  // Get immediate prev/next for navigation
  const prevImage = prevImages[0] ?? null;
  const nextImage = nextImages[0] ?? null;

  // Hidden preload images using Next.js Image components
  // These go through Next.js optimization pipeline unlike browser Image API

  const goToPrev = useCallback(() => {
    if (prevImage) {
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      router.push(`/image/${prevImage.id}`);
    }
  }, [prevImage, router]);

  const goToNext = useCallback(() => {
    if (nextImage) {
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
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

  // Touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Handle double tap for zoom
    if (e.touches.length === 1) {
      const now = Date.now();
      const touch = e.changedTouches[0];
      const tapPosition = { x: touch.clientX, y: touch.clientY };

      if (now - lastTapTime < 300 && lastTapPosition) {
        const distance = Math.sqrt(
          Math.pow(tapPosition.x - lastTapPosition.x, 2) +
          Math.pow(tapPosition.y - lastTapPosition.y, 2)
        );

        if (distance < 30) {
          if (scale > 1) {
            resetZoom();
          } else {
            setScale(DOUBLE_TAP_SCALE);
            setIsZoomed(true);
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (containerRect) {
              setPanOffset({
                x: (containerRect.width / 2 - tapPosition.x) * (DOUBLE_TAP_SCALE - 1),
                y: (containerRect.height / 2 - tapPosition.y) * (DOUBLE_TAP_SCALE - 1)
              });
            }
          }
        }
      }

      setLastTapTime(now);
      setLastTapPosition(tapPosition);
    }

    // Start pinch gesture
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = getTouchDistance(touch1, touch2);
      const center = getTouchCenter(touch1, touch2);

      setInitialPinchDistance(distance);
      setInitialPinchCenter(center);
      setInitialScale(scale);

      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        setAnimationFrame(null);
      }
    }

    // Start single touch
    if (e.touches.length === 1) {
      setIsDragging(true);
      setLastTouchX(e.touches[0].clientX);
      setLastTouchY(e.touches[0].clientY);
      setLastTouchTime(Date.now());
      setVelocity(0);
    }
  }, [scale, resetZoom, lastTapTime, lastTapPosition, animationFrame, getTouchDistance, getTouchCenter]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();

    // Handle pinch zoom
    if (e.touches.length === 2 && initialPinchDistance && initialPinchCenter) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = getTouchDistance(touch1, touch2);
      const currentCenter = getTouchCenter(touch1, touch2);

      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE,
        initialScale * (currentDistance / initialPinchDistance)
      ));

      const scaleDiff = newScale - scale;
      const panAdjustment = {
        x: (initialPinchCenter.x - currentCenter.x) * scaleDiff,
        y: (initialPinchCenter.y - currentCenter.y) * scaleDiff
      };

      setScale(newScale);
      setPanOffset(prev => ({
        x: prev.x + panAdjustment.x,
        y: prev.y + panAdjustment.y
      }));
      setIsZoomed(newScale > 1);

      return;
    }

    // Handle pan when zoomed
    if (e.touches.length === 1 && isZoomed && isDragging) {
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - lastTouchX;
      const deltaY = currentY - lastTouchY;

      setPanOffset(prev => {
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return prev;

        const imageRect = {
          width: containerRect.width * scale,
          height: containerRect.height * scale
        };

        let newX = prev.x + deltaX;
        let newY = prev.y + deltaY;

        const maxPanX = (imageRect.width - containerRect.width) / 2;
        const maxPanY = (imageRect.height - containerRect.height) / 2;

        newX = Math.max(-maxPanX, Math.min(maxPanX, newX));
        newY = Math.max(-maxPanY, Math.min(maxPanY, newY));

        return { x: newX, y: newY };
      });

      setLastTouchX(currentX);
      setLastTouchY(currentY);
      return;
    }

    // Handle momentum scrolling when not zoomed
    if (e.touches.length === 1 && !isZoomed && isDragging) {
      const currentX = e.touches[0].clientX;
      const currentTime = Date.now();

      const deltaX = currentX - lastTouchX;
      if (currentTime - lastTouchTime > 0) {
        const instantVelocity = deltaX / (currentTime - lastTouchTime);
        setVelocity(instantVelocity);
      }

      setScrollOffset(prev => {
        const newOffset = prev + deltaX;
        if (newOffset > MAX_OVERSCROLL) {
          return MAX_OVERSCROLL + (newOffset - MAX_OVERSCROLL) * 0.3;
        } else if (newOffset < -MAX_OVERSCROLL) {
          return -MAX_OVERSCROLL + (newOffset + MAX_OVERSCROLL) * 0.3;
        }
        return newOffset;
      });

      setLastTouchX(currentX);
      setLastTouchTime(currentTime);
    }
  }, [initialPinchDistance, initialPinchCenter, initialScale, scale, isZoomed, isDragging, lastTouchX, lastTouchY, lastTouchTime, getTouchDistance, getTouchCenter]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setInitialPinchDistance(null);
      setInitialPinchCenter(null);
      setInitialScale(scale);
    }

    if (e.touches.length === 0 && isDragging) {
      setIsDragging(false);

      if (!isZoomed) {
        const shouldNavigate = Math.abs(scrollOffset) > SWIPE_THRESHOLD ||
                              Math.abs(velocity) > 0.5;

        if (shouldNavigate) {
          if (scrollOffset > 0 && prevImage) {
            goToPrev();
          } else if (scrollOffset < 0 && nextImage) {
            goToNext();
          }
        }

        if (Math.abs(velocity) > MIN_VELOCITY) {
          setAnimationFrame(requestAnimationFrame(animateMomentum));
        } else {
          setScrollOffset(0);
        }
      }
    }
  }, [scale, isZoomed, isDragging, scrollOffset, velocity, prevImage, nextImage, goToPrev, goToNext, animateMomentum]);

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
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
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
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 text-white/50 hover:text-white transition-colors hidden sm:block"
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
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 text-white/50 hover:text-white transition-colors hidden sm:block"
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
      <div className="relative w-full h-full max-w-5xl max-h-[85vh] mx-4 sm:mx-16 flex items-center justify-center overflow-hidden">
        <div
          className="relative h-full transition-transform duration-200 ease-out"
          style={{
            transform: `
              translateX(${scrollOffset * 0.8}px)
              scale(${scale})
              translate(${panOffset.x / scale}px, ${panOffset.y / scale}px)
            `,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            cursor: isZoomed ? 'grab' : 'default'
          }}
        >
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

        {/* Adjacent image previews during drag */}
        {isDragging && scrollOffset > 20 && prevImage && (
          <div
            className="absolute left-0 top-0 h-full w-full opacity-50 pointer-events-none"
            style={{ transform: `translateX(${scrollOffset * 0.8 - 100}%)` }}
          >
            <div className="relative h-full" style={{ aspectRatio: `${prevImage.width} / ${prevImage.height}` }}>
              <Image
                src={`/images/${prevImage.filename}`}
                alt=""
                fill
                className="object-contain"
              />
            </div>
          </div>
        )}

        {isDragging && scrollOffset < -20 && nextImage && (
          <div
            className="absolute right-0 top-0 h-full w-full opacity-50 pointer-events-none"
            style={{ transform: `translateX(${scrollOffset * 0.8 + 100}%)` }}
          >
            <div className="relative h-full" style={{ aspectRatio: `${nextImage.width} / ${nextImage.height}` }}>
              <Image
                src={`/images/${nextImage.filename}`}
                alt=""
                fill
                className="object-contain"
              />
            </div>
          </div>
        )}
      </div>

      {/* Description below image */}
      {image.description && (
        <div className="absolute bottom-8 left-0 right-0 text-center px-4">
          <p className="text-neutral-300 text-sm sm:text-base max-w-2xl mx-auto animate-fadeIn">
            {image.description}
          </p>
        </div>
      )}


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
