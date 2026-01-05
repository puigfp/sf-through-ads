# Add Import Time to RSS Feeds

## Objective
Modify the RSS feed system to distinguish between image capture time and image import time, and provide an additional feed for chronological ordering by import time.

## Current State Analysis
- RSS feed (`/feed.xml`) currently uses `taken_at` for both title formatting and `pubDate`
- Images are stored with `taken_at` timestamp from EXIF data
- No import timestamp is currently tracked

## Proposed Changes

### 1. Data Schema Updates
- Add `imported_at` field to `ImageEntry` type in `src/lib/types.ts`
- Add `imported_at` field to images in `src/data/images.yaml`
- Update import script to record import timestamps

### 2. RSS Feed Modifications
- **Main feed** (`/feed.xml`):
  - Title: Use `taken_at` (image capture time)
  - pubDate: Use `imported_at` (import time)
  - Ordering: Reverse chronological by `imported_at` (newest imports first)

### 3. Implementation Steps

#### Step 1: Update Type Definitions
- Add `imported_at: string;` to `ImageEntry` interface
- Update import script interface to match

#### Step 2: Update Import Script
- Modify `scripts/import-images.ts` to set `imported_at` to current timestamp when processing new images
- Ensure existing images get `imported_at` set to their `taken_at` for backward compatibility

#### Step 3: Update RSS Feed Logic
- Modify `src/app/feed.xml/route.ts`:
  - Change `pubDate` from `taken_at` to `imported_at`
  - Keep title using `taken_at`

#### Step 4: Update Main Feed
- Modify `src/app/feed.xml/route.ts` to order by `imported_at` descending
- Keep `taken_at` for title, `imported_at` for pubDate

### 4. Benefits
- Single RSS feed shows images in the order they were published to the site
- Titles show when photos were taken (capture time)
- Publication dates reflect when images were added to the site (import time)
- Clear separation between capture time vs. publication time

### 5. Migration Strategy
- Re-import all images to populate `imported_at` fields with current timestamps
- Feed will show chronological publication order

## Files to Modify
- `src/lib/types.ts`
- `scripts/import-images.ts`
- `src/data/images.yaml` (data migration)
- `src/app/feed.xml/route.ts`

## Testing
- Verify /feed.xml orders by import time (newest imports first)
- Verify titles show capture time while pubDate shows import time
- Test with RSS readers to ensure proper chronological ordering

## Implementation Notes
- Initially created separate imported feed, but user requested to overwrite main feed instead
- Removed `/feed/imported.xml` endpoint and consolidated into main `/feed.xml`
- Updated feed description to indicate ordering by import time
- Successfully re-imported all 18 images from scratch with fresh `imported_at` timestamps
- RSS feed now properly orders by import time (newest imports first)
