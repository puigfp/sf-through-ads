"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseInfiniteScrollOptions<T> {
  items: T[];
  batchSize: number;
}

interface UseInfiniteScrollResult<T> {
  visibleItems: T[];
  hasMore: boolean;
  loadMore: () => void;
  sentinelRef: (node: HTMLDivElement | null) => void;
}

export function useInfiniteScroll<T>({
  items,
  batchSize,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollResult<T> {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
  }, [batchSize, items.length]);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasMore) {
            loadMore();
          }
        },
        { rootMargin: "200px" }
      );

      observerRef.current.observe(node);
    },
    [hasMore, loadMore]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { visibleItems, hasMore, loadMore, sentinelRef };
}

