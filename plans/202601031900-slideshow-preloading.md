# Plan: Slideshow Image Preloading (Browser API - Did Not Work)

## Problem

When navigating through the slideshow (arrow keys, swipe, or click), there's a noticeable delay before the next image appears. This happens because images are only fetched when the user navigates to them.

## Current Architecture

- Each image has its own route: `/image/[id]`
- Navigation uses `router.push()` (full page navigation)
- Next.js `Image` component with `priority` loads the current image
- `prevImage` and `nextImage` metadata is passed to `Slideshow`, but not used for preloading
- Images are ~200KB-2MB each (full resolution JPEGs)

---

## Part 1: Reduce Image Size

### Change

Update `import-images.ts` to resize main images to **1280px wide** (85% JPEG quality) instead of keeping full resolution.

- `00001.jpg` → 1280px wide, 85% quality (~100-300KB)
- `00001_thumb.jpg` → 1:1 thumbnail (unchanged)

Expected savings: **~70-80%** file size reduction.

### Implementation

1. Modify the image processing in `import-images.ts` to resize to 1280px width
2. Delete existing processed images in `public/images/`
3. Re-run import from `originals/` folder

---

## Part 2: Preload Adjacent Images

### Configuration

```ts
const PRELOAD_DEPTH = 2; // Preload 2 images ahead and behind
```

### Changes Required

**`src/lib/images.ts`** - Update `getAdjacentImages()` to return arrays:

```ts
export function getAdjacentImages(
  id: number,
  depth: number = 2
): { prev: ImageEntry[]; next: ImageEntry[] } {
  const images = getAllImages();
  const index = images.findIndex((img) => img.id === id);

  if (index === -1) {
    return { prev: [], next: [] };
  }

  return {
    prev: images.slice(Math.max(0, index - depth), index).reverse(),
    next: images.slice(index + 1, index + 1 + depth),
  };
}
```

**`src/app/image/[id]/page.tsx`** - Pass arrays to Slideshow

**`src/components/Slideshow.tsx`** - Update props and add hidden preload images:

```tsx
interface SlideshowProps {
  image: ImageEntry;
  prevImages: ImageEntry[];  // Changed from prevImage
  nextImages: ImageEntry[];  // Changed from nextImage
}

// In render, after main image:
{prevImages.map((img) => (
  <Image
    key={img.id}
    src={`/images/${img.filename}`}
    alt=""
    fill
    className="hidden"
    priority={false}
  />
))}
{nextImages.map((img) => (
  <Image
    key={img.id}
    src={`/images/${img.filename}`}
    alt=""
    fill
    className="hidden"
    priority={false}
  />
))}
```

---

## Part 3: Loading Indicator

Add a spinner while the current image loads:

```tsx
const [isLoading, setIsLoading] = useState(true);

// Reset loading state when image changes
useEffect(() => {
  setIsLoading(true);
}, [image.id]);

<Image
  onLoad={() => setIsLoading(false)}
  // ...
/>

{isLoading && (
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
  </div>
)}
```

---

## Implementation Steps

1. [ ] Update `import-images.ts` to resize main images to 1280px wide
2. [ ] Delete `public/images/*` 
3. [ ] Clear `images.yaml`
4. [ ] Re-run `pnpm import-images originals/`
5. [ ] Update `getAdjacentImages()` to return arrays with depth parameter
6. [ ] Update `src/app/image/[id]/page.tsx` to pass prev/next arrays
7. [ ] Update `Slideshow.tsx`:
   - Change props to accept arrays
   - Add hidden preload images
   - Add loading spinner with state reset on image change
   - Update navigation to use first element of arrays

---

## Decisions Made

- **No full-res images**: Main images resized to 1280px (sufficient for slideshow)
- **Fresh import**: Delete existing images and re-run import from originals
- **PRELOAD_DEPTH = 2**: Preload 2 images in each direction
- **Loading spinner**: Show while current image loads

---

## Outcome

**This approach was implemented but did not work effectively in practice.** The browser's `new Image()` API creates HTTP requests that bypass Next.js's image optimization pipeline (WebP conversion, srcset generation, etc.), resulting in cached images that don't match what the Next.js `<Image>` component expects.

**Solution:** Moved to Next.js-specific preloading using hidden `<Image>` components and `<Link prefetch>`. See `202601032346-nextjs-preloading-solutions.md` for the working implementation.
