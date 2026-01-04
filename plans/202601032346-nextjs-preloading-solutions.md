# Plan: Next.js-Specific Slideshow Preloading Solutions

## Problem Analysis

Current preloading using browser's `new Image()` API doesn't work effectively because:

1. **Next.js Image optimization mismatch**: The browser Image API creates separate HTTP requests that don't benefit from Next.js's image optimization (srcset, sizes, WebP conversion, etc.)

2. **No integration with Next.js cache**: Preloaded images aren't stored in Next.js's optimized image cache

3. **Race conditions**: Browser Image API and Next.js Image component may compete for the same resources

## Current Implementation Issues

Looking at `Slideshow.tsx` lines 31-40:

```tsx
// Preload adjacent images using browser Image API
useEffect(() => {
  const imagesToPreload = [...prevImages, ...nextImages];

  imagesToPreload.forEach((img) => {
    const imgElement = new window.Image();
    imgElement.src = `/images/${img.filename}`;
    console.log(`Preloading: ${img.filename}`);
  });
}, [prevImages, nextImages]);
```

This creates raw `<img>` elements that bypass Next.js's optimization pipeline.

---

## Solution 1: Hidden Next.js Image Components

### Approach

Replace browser Image API with actual Next.js `<Image>` components that are visually hidden but trigger Next.js's optimization pipeline.

### Implementation

**`src/components/Slideshow.tsx`** - Replace browser Image preloading:

```tsx
// Remove browser Image API preloading (lines 31-40)

// Add after the main Image component:
{/* Hidden preload images */}
{prevImages.map((img) => (
  <Image
    key={`preload-prev-${img.id}`}
    src={`/images/${img.filename}`}
    alt=""
    fill
    className="hidden"
    priority={false}
    sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1280px) calc(100vw - 8rem), 1024px"
  />
))}
{nextImages.map((img) => (
  <Image
    key={`preload-next-${img.id}`}
    src={`/images/${img.filename}`}
    alt=""
    fill
    className="hidden"
    priority={false}
    sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1280px) calc(100vw - 8rem), 1024px"
  />
))}
```

### Why This Works

1. **Full Next.js optimization**: Images go through Next.js's image optimization pipeline
2. **Proper caching**: Images are cached in Next.js's optimized cache
3. **Lazy loading integration**: Works with Next.js's lazy loading system
4. **Same sizes/srcset**: Uses identical `sizes` attribute as main image

### Trade-offs

- Slightly more DOM elements (but hidden)
- Uses Next.js Image component overhead for preloaded images
- Still preloads images that may not be viewed

---

## Solution 2: Next.js Link Prefetch

### Approach

Use Next.js `<Link>` components with `prefetch` to preload entire adjacent image pages.

### Implementation

**`src/components/Slideshow.tsx`** - Add prefetch links:

```tsx
import Link from "next/link";

// Add at end of component (before closing div):
{/* Hidden prefetch links for adjacent images */}
{prevImages.slice(0, 1).map((img) => ( // Only prefetch immediate adjacent
  <Link key={`prefetch-prev-${img.id}`} href={`/image/${img.id}`} prefetch>
    <span className="hidden" />
  </Link>
))}
{nextImages.slice(0, 1).map((img) => (
  <Link key={`prefetch-next-${img.id}`} href={`/image/${img.id}`} prefetch>
    <span className="hidden" />
  </Link>
))}
```

### Why This Works

1. **Page-level preloading**: Next.js prefetches the entire page HTML/JS
2. **Automatic optimization**: Next.js decides what to prefetch
3. **Minimal code**: Very simple implementation

### Limitations

- Prefetches pages, not specifically images
- May not preload images if Next.js deems it unnecessary
- Less direct control over image preloading

---

## Solution 3: Hybrid Approach

### Approach

Combine both hidden Image components AND Link prefetch for maximum effectiveness.

### Implementation

Implement both Solution 1 and Solution 2 simultaneously.

---

## Solution 4: React 18 Image Suspense (Future-Proof)

### Approach

Use React 18's Suspense boundaries with image loading, but this requires more architectural changes.

### Implementation

Would require:
- Creating an Image component that throws promises
- Wrapping slideshow in Suspense boundaries
- Managing loading states at the navigation level

This is more complex and may not be worth the effort for this use case.

---

## Recommended Solution

**Start with Solution 1 (Hidden Next.js Image Components)** because:

1. **Direct image preloading**: Specifically targets the images that need preloading
2. **Next.js integration**: Works within Next.js's optimization system
3. **Proven pattern**: Similar to how other Next.js apps handle image preloading
4. **Simple implementation**: Minimal code changes

## Implementation Steps

1. [ ] Remove browser Image API preloading from `Slideshow.tsx`
2. [ ] Add hidden Next.js Image components for adjacent images
3. [ ] Test in browser dev tools to verify preloading works
4. [ ] Monitor network tab to ensure images are preloaded before navigation
5. [ ] If needed, add Link prefetch as backup

## Testing Strategy

- Use Chrome DevTools Network tab
- Navigate through slideshow and observe:
  - Are adjacent images requested immediately when viewing current image?
  - Do cached images load instantly on navigation?
  - What's the cache status (disk/memory cache vs network request)?

## Questions to Answer

1. **Bandwidth vs Performance**: Is the bandwidth cost worth the performance improvement?

2. **Preload Depth**: Should we preload 2 images in each direction, or just 1?

3. **Mobile Considerations**: Does this work well on mobile networks?

4. **Fallback Strategy**: What if preloading fails? Do we still show loading spinner?
