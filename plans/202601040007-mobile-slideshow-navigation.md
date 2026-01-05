# Plan: Improve Slideshow Navigation on Mobile

## Problem

The current slideshow navigation on mobile devices is inadequate:
- Navigation arrow buttons are completely hidden (`hidden sm:block`)
- Swipe gestures exist but are undiscoverable
- No visual feedback or progress indicators
- Limited gesture support (only basic swipe)
- No tactile feedback for successful navigation
- Touch targets may be too small for mobile

## Current State Analysis

### Current Mobile Navigation Features
- **Touch/Swipe**: Basic left/right swipe gestures (50px minimum distance)
- **Hidden Arrows**: Previous/next buttons hidden on mobile (`hidden sm:block`)
- **Keyboard**: ← → arrows, Escape (works on mobile keyboards)
- **Backdrop**: Click outside to close
- **Counter**: Subtle ID display at bottom

### Issues Identified
1. **No Visual Navigation Cues**: Users don't know they can swipe
2. **Poor Discoverability**: No hints about swipe functionality
3. **Limited Gestures**: Only basic swipe, no double-tap zoom, no pinch
4. **No Progress Indicator**: Counter is too subtle, no "X of Y" format
5. **No Haptic Feedback**: No tactile confirmation of navigation
6. **Small Touch Targets**: Close button (28x28) may be too small
7. **No Quick Navigation**: Can't jump to specific images
8. **No Loading States**: No feedback during image transitions

## Solution Overview

Implement native-feeling mobile navigation with momentum scrolling and full zoom support:
- **Momentum-based scrolling** with friction and overscroll resistance
- **Full pinch-to-zoom** with two-finger gestures and double-tap zoom
- **Pan support** when zoomed in (constrained to image bounds)
- **Visual drag feedback** showing adjacent images during swipe
- **Smooth animations** using CSS transforms and easing curves
- **Velocity-sensitive navigation** - fast swipes trigger immediately
- **Overscroll bounce** with spring-back animation
- **Enhanced gesture support** (swipe, double-tap, pinch-to-zoom)
- **Haptic feedback** for successful navigation
- **No visual hints** - users discover gestures naturally
- **Improved touch targets** and accessibility
- **Loading states** and smooth transitions

## Implementation Steps

### Phase 1: Visual Navigation Cues

#### Step 1.1: Add Swipe Hint Indicator
Add a subtle "swipe to navigate" hint that fades out after first interaction:
```tsx
// New component: SwipeHint
<div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white/60 text-sm animate-fadeIn pointer-events-none">
  ← Swipe to navigate →
</div>
```

#### Step 1.2: Improve Progress Counter
Replace subtle ID with clear progress indicator:
```tsx
// Instead of just image.id, show "3 / 18"
<div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-mono">
  {currentIndex + 1} / {totalImages}
</div>
```

#### Step 1.3: Add Navigation Dots
Add dot indicators showing current position:
```tsx
<div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1">
  {Array.from({ length: totalImages }, (_, i) => (
    <div
      key={i}
      className={`w-2 h-2 rounded-full transition-colors ${
        i === currentIndex ? 'bg-white' : 'bg-white/40'
      }`}
    />
  ))}
</div>
```

### Phase 2: Enhanced Mobile Gestures

#### Step 2.1: Implement Haptic Feedback
Add vibration feedback for successful navigation:
```typescript
// Add to navigation callbacks
const navigateWithFeedback = (direction: 'prev' | 'next') => {
  if (navigator.vibrate) {
    navigator.vibrate(50); // Short vibration
  }
  // ... existing navigation logic
};
```

#### Step 2.2: Add Double-Tap to Zoom
Implement double-tap gesture for zoom (instead of close):
```typescript
const [lastTapTime, setLastTapTime] = useState(0);
const [lastTapPosition, setLastTapPosition] = useState<{ x: number; y: number } | null>(null);

const handleDoubleTap = useCallback((e: React.TouchEvent) => {
  const now = Date.now();
  const touch = e.changedTouches[0];
  const tapPosition = { x: touch.clientX, y: touch.clientY };

  if (now - lastTapTime < 300 && lastTapPosition) {
    const distance = Math.sqrt(
      Math.pow(tapPosition.x - lastTapPosition.x, 2) +
      Math.pow(tapPosition.y - lastTapPosition.y, 2)
    );

    if (distance < 30) { // Close enough taps
      if (scale > 1) {
        resetZoom();
      } else {
        // Zoom to predefined level centered on tap
        setScale(DOUBLE_TAP_SCALE);
        setIsZoomed(true);
      }
    }
  }

  setLastTapTime(now);
  setLastTapPosition(tapPosition);
}, [scale, resetZoom]);
```

#### Step 2.3: Implement Native-Style Momentum Scrolling
Replace discrete swipe detection with smooth momentum-based navigation:

```typescript
// Track scroll state
const [scrollOffset, setScrollOffset] = useState(0);
const [velocity, setVelocity] = useState(0);
const [isDragging, setIsDragging] = useState(false);
const [lastTouchTime, setLastTouchTime] = useState(0);
const [lastTouchX, setLastTouchX] = useState(0);

// Momentum scrolling constants
const FRICTION = 0.95;
const MIN_VELOCITY = 0.01;
const SWIPE_THRESHOLD = 100; // pixels to trigger navigation
const MAX_OVERSCROLL = 80; // pixels of overscroll allowed

// Animation frame for smooth momentum
const [animationFrame, setAnimationFrame] = useState<number | null>(null);

const animateMomentum = useCallback(() => {
  setScrollOffset(prev => {
    const newOffset = prev + velocity;
    const boundedOffset = Math.max(-MAX_OVERSCROLL, Math.min(MAX_OVERSCROLL, newOffset));

    // Apply friction
    setVelocity(prev => prev * FRICTION);

    // Stop animation when velocity is low enough
    if (Math.abs(velocity) < MIN_VELOCITY) {
      setAnimationFrame(null);
      // Snap back to center if overscrolled
      if (boundedOffset !== 0) {
        setScrollOffset(0); // Spring back animation
      }
      return 0; // Snap to center
    }

    return boundedOffset;
  });

  if (Math.abs(velocity) >= MIN_VELOCITY) {
    setAnimationFrame(requestAnimationFrame(animateMomentum));
  }
}, [velocity]);

const onTouchStart = useCallback((e: React.TouchEvent) => {
  setIsDragging(true);
  setLastTouchX(e.touches[0].clientX);
  setLastTouchTime(Date.now());
  setVelocity(0);

  // Cancel any ongoing momentum animation
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    setAnimationFrame(null);
  }
}, [animationFrame]);

const onTouchMove = useCallback((e: React.TouchEvent) => {
  if (!isDragging) return;

  const currentX = e.touches[0].clientX;
  const deltaX = currentX - lastTouchX;
  const currentTime = Date.now();

  // Calculate velocity (pixels per millisecond)
  const timeDelta = currentTime - lastTouchTime;
  if (timeDelta > 0) {
    const instantVelocity = deltaX / timeDelta;
    setVelocity(instantVelocity);
  }

  // Update scroll offset with resistance at edges
  setScrollOffset(prev => {
    const newOffset = prev + deltaX;
    // Apply resistance when overscrolling
    if (newOffset > MAX_OVERSCROLL) {
      return MAX_OVERSCROLL + (newOffset - MAX_OVERSCROLL) * 0.3;
    } else if (newOffset < -MAX_OVERSCROLL) {
      return -MAX_OVERSCROLL + (newOffset + MAX_OVERSCROLL) * 0.3;
    }
    return newOffset;
  });

  setLastTouchX(currentX);
  setLastTouchTime(currentTime);
}, [isDragging, lastTouchX, lastTouchTime]);

const onTouchEnd = useCallback(() => {
  setIsDragging(false);

  // Determine if we should navigate based on final position and velocity
  const shouldNavigate = Math.abs(scrollOffset) > SWIPE_THRESHOLD ||
                        Math.abs(velocity) > 0.5; // High velocity threshold

  if (shouldNavigate) {
    if (scrollOffset > 0 && prevImage) {
      goToPrev();
    } else if (scrollOffset < 0 && nextImage) {
      goToNext();
    }
  }

  // Start momentum animation if there's remaining velocity
  if (Math.abs(velocity) > MIN_VELOCITY) {
    setAnimationFrame(requestAnimationFrame(animateMomentum));
  } else {
    // Spring back to center
    setScrollOffset(0);
  }
}, [scrollOffset, velocity, prevImage, nextImage, goToPrev, goToNext, animateMomentum]);
```

#### Step 2.4: Add Visual Feedback During Drag
Show scroll progress with transform and opacity changes:

```tsx
{/* Image container with transform for native scroll feel */}
<div className="relative w-full h-full max-w-5xl max-h-[85vh] mx-4 sm:mx-16 flex items-center justify-center overflow-hidden">
  <div
    className="relative h-full transition-transform duration-200 ease-out"
    style={{
      transform: `translateX(${scrollOffset * 0.8}px) scale(${1 - Math.abs(scrollOffset) * 0.001})`,
      transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
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
```

#### Step 2.5: Implement Full Pinch-to-Zoom with Pan Support
Add comprehensive image zooming with two-finger pinch gestures and pan when zoomed:

```typescript
// Zoom and pan state
const [scale, setScale] = useState(1);
const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
const [initialPinchCenter, setInitialPinchCenter] = useState<{ x: number; y: number } | null>(null);
const [initialScale, setInitialScale] = useState(1);
const [isZoomed, setIsZoomed] = useState(false);

// Zoom constraints
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

// Calculate distance between two touch points
const getTouchDistance = (touch1: React.Touch, touch2: React.Touch) => {
  return Math.sqrt(
    Math.pow(touch2.clientX - touch1.clientX, 2) +
    Math.pow(touch2.clientY - touch1.clientY, 2)
  );
};

// Calculate center point between two touch points
const getTouchCenter = (touch1: React.Touch, touch2: React.Touch) => {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2
  };
};

// Reset zoom to fit image
const resetZoom = useCallback(() => {
  setScale(1);
  setPanOffset({ x: 0, y: 0 });
  setIsZoomed(false);
}, []);

// Handle double tap to zoom
const [lastTapTime, setLastTapTime] = useState(0);
const [lastTapPosition, setLastTapPosition] = useState<{ x: number; y: number } | null>(null);

const handleDoubleTap = useCallback((e: React.TouchEvent) => {
  const now = Date.now();
  const touch = e.changedTouches[0];
  const tapPosition = { x: touch.clientX, y: touch.clientY };

  if (now - lastTapTime < 300 && lastTapPosition) {
    const distance = Math.sqrt(
      Math.pow(tapPosition.x - lastTapPosition.x, 2) +
      Math.pow(tapPosition.y - lastTapPosition.y, 2)
    );

    if (distance < 30) { // Close enough taps
      if (scale > 1) {
        resetZoom();
      } else {
        // Zoom to double-tap scale centered on tap point
        setScale(DOUBLE_TAP_SCALE);
        setIsZoomed(true);
        // Center the zoom on the tap point
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
}, [scale, resetZoom]);

// Enhanced touch handlers
const onTouchStart = useCallback((e: React.TouchEvent) => {
  // Handle double tap
  if (e.touches.length === 1) {
    handleDoubleTap(e);
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

    // Cancel momentum scrolling when starting pinch
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      setAnimationFrame(null);
    }
  }

  // Start single touch (for pan or scroll)
  if (e.touches.length === 1) {
    setIsDragging(true);
    setLastTouchX(e.touches[0].clientX);
    setLastTouchY(e.touches[0].clientY);
    setLastTouchTime(Date.now());
    setVelocity(0);
  }
}, [handleDoubleTap, scale, animationFrame]);

const onTouchMove = useCallback((e: React.TouchEvent) => {
  e.preventDefault(); // Prevent default scrolling

  // Handle pinch zoom
  if (e.touches.length === 2 && initialPinchDistance && initialPinchCenter) {
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const currentDistance = getTouchDistance(touch1, touch2);
    const currentCenter = getTouchCenter(touch1, touch2);

    // Calculate new scale
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE,
      initialScale * (currentDistance / initialPinchDistance)
    ));

    // Calculate pan offset to keep pinch center stationary
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

      // Constrain pan to keep image in view
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
    // ... existing momentum scrolling logic
  }
}, [initialPinchDistance, initialPinchCenter, initialScale, scale, isZoomed, isDragging, lastTouchX, lastTouchY, containerRef]);

const onTouchEnd = useCallback((e: React.TouchEvent) => {
  // End pinch gesture
  if (e.touches.length === 0) {
    setInitialPinchDistance(null);
    setInitialPinchCenter(null);
    setInitialScale(scale);
  }

  // End single touch
  if (e.touches.length === 0 && isDragging) {
    setIsDragging(false);

    if (!isZoomed) {
      // Handle momentum scrolling end
      // ... existing momentum logic
    }
  }
}, [scale, isZoomed, isDragging]);
```

#### Step 2.6: Apply Zoom Transforms to Image
Update the image container to apply zoom and pan transforms:

```tsx
<div
  className="relative w-full h-full max-w-5xl max-h-[85vh] mx-4 sm:mx-16 flex items-center justify-center overflow-hidden"
  ref={containerRef}
>
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
    {/* Image content */}
  </div>
</div>
```

#### Step 2.7: Clean Implementation (No Visual Hints)
No zoom UI indicators - users discover pinch-to-zoom and double-tap gestures naturally through interaction.

### Phase 3: Touch Target Improvements

#### Step 3.1: Larger Close Button
Increase close button size for mobile:
```tsx
<button
  className="absolute top-6 right-6 z-10 p-4 text-white/70 hover:text-white transition-colors rounded-full bg-black/20 hover:bg-black/40"
  aria-label="Close"
>
  <svg className="w-8 h-8">...</svg>
</button>
```

#### Step 3.2: Add Mobile Navigation Buttons
Add subtle navigation buttons that appear on touch:
```tsx
// Show buttons briefly on touch, then fade
const [showNavButtons, setShowNavButtons] = useState(false);

const handleTouchStart = () => {
  setShowNavButtons(true);
  clearTimeout(hideTimeout);
};

const handleTouchEnd = () => {
  hideTimeout = setTimeout(() => setShowNavButtons(false), 2000);
};

// Navigation buttons with conditional visibility
{prevImage && (
  <button
    className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 p-4 text-white/50 hover:text-white transition-all duration-300 rounded-full bg-black/20 ${
      showNavButtons ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`}
    onClick={goToPrev}
    aria-label="Previous image"
  >
    <svg className="w-8 h-8">...</svg>
  </button>
)}
```

### Phase 4: Loading States and Transitions

#### Step 4.1: Image Loading States
Add loading indicators during navigation:
```tsx
const [isLoading, setIsLoading] = useState(false);

const goToNext = useCallback(() => {
  setIsLoading(true);
  // ... navigation logic
  // Reset loading after image loads
}, []);

return (
  <>
    {/* Loading overlay */}
    {isLoading && (
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )}
    {/* Existing slideshow content */}
  </>
);
```

#### Step 4.2: Smooth Transitions
Add CSS transitions for navigation:
```tsx
// Add to image container
<div className="transition-opacity duration-200 ease-in-out" style={{ opacity: isLoading ? 0.5 : 1 }}>
  <Image ... />
</div>
```

### Phase 5: Thumbnail Strip (Optional Advanced Feature)

#### Step 5.1: Add Thumbnail Navigation Strip
Implement a swipeable thumbnail strip at bottom:
```tsx
// New component: ThumbnailStrip
<div className="absolute bottom-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-sm">
  <div className="flex gap-2 p-2 overflow-x-auto">
    {adjacentImages.map((img, index) => (
      <button
        key={img.id}
        onClick={() => navigateToImage(img.id)}
        className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 ${
          img.id === currentImage.id ? 'border-white' : 'border-white/30'
        }`}
      >
        <Image src={`/images/${img.thumbnail_filename}`} fill className="object-cover" />
      </button>
    ))}
  </div>
</div>
```

## Technical Considerations

### Performance
- Preload adjacent images (already implemented)
- Use `requestAnimationFrame` for smooth animations
- Debounce touch events to prevent excessive calls

### Accessibility
- Maintain keyboard navigation
- Add proper ARIA labels
- Ensure sufficient color contrast
- Support screen readers

### Browser Support
- Check `navigator.vibrate` availability
- Use touch event fallbacks
- Progressive enhancement approach

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/Slideshow.tsx` | Add swipe hints, progress indicators, enhanced gestures, haptic feedback, loading states |
| `src/lib/types.ts` | Add optional fields for navigation state if needed |
| `src/hooks/useSwipeGesture.ts` | New hook for reusable swipe logic (optional) |

## Estimated Effort

~5-6 hours total:
- Phase 1: Visual cues and progress (45 min)
- Phase 2: Native momentum scrolling + full pinch-to-zoom (2.5 hours - complex physics + gesture handling)
- Phase 3: Touch targets and visual feedback (45 min)
- Phase 4: Loading states and animations (30 min)
- Phase 5: Thumbnail strip (1 hour, optional)

## Success Metrics

- Scrolling feels native with momentum and overscroll bounce
- Pinch-to-zoom works smoothly with natural gesture recognition
- Double-tap zooms to predefined level and pans to tap location
- Pan gestures work fluidly when zoomed, constrained to image bounds
- Visual feedback during drag shows adjacent images smoothly
- Fast swipes trigger navigation immediately, slow drags allow preview
- Spring-back animation feels natural when canceling navigation
- No visual hints - users discover gestures naturally
- No janky animations or stuttering during scroll/zoom
- Touch targets meet accessibility guidelines (44px minimum)
- Haptic feedback provides tactile confirmation of navigation

## Testing Checklist

- [ ] Swipe gestures work reliably on iOS Safari
- [ ] Swipe gestures work on Android Chrome
- [ ] Haptic feedback works on supported devices
- [ ] Double-tap to close works
- [ ] Visual hints fade appropriately
- [ ] Progress indicators update correctly
- [ ] Loading states show during navigation
- [ ] Touch targets are adequately sized
- [ ] Keyboard navigation still works
- [ ] Accessibility features maintained

## Dependencies

No new dependencies required - all features use native browser APIs (TouchEvent, Vibration API, etc.).

## Future Enhancements

- Image zoom with pan gestures
- Pull-to-refresh for latest images
- Swipe-up to share
- Long-press for image info
- Voice navigation ("next photo", "previous photo")
