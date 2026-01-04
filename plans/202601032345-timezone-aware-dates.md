# Plan: Display Times in Location's Timezone

## Problem

Currently, times are displayed based on where the code runs (browser/server timezone), not where the photo was taken. Since all photos are taken in San Francisco, times should display in Pacific Time based on the GPS coordinates.

## Current State

**Where times are displayed:**

1. **Slideshow film-style date stamp** (`src/lib/utils.ts` → `formatFilmDate`)
   - Format: `2026 01 03 14:32 37.77°N 122.41°W`
   - Uses `new Date(dateStr).getHours()` etc. which returns browser's local time
   
2. **RSS feed** (`src/app/feed.xml/route.ts`)
   - Title: Uses `toLocaleDateString`/`toLocaleTimeString` (server's timezone)
   - pubDate: Uses `toUTCString()` (correct per RSS spec, keep as-is)

**Data available:**
- `taken_at`: UTC timestamp string (e.g., `2026-01-03T19:19:31.000Z`)
- `location`: GPS coordinates (`{ lat: 37.77, lng: -122.40 }`)

## Solution

### Approach: Compute timezone at import time, format at render time

1. **At import time**: Use GPS coordinates to determine IANA timezone (e.g., `America/Los_Angeles`)
2. **Store**: Add `timezone` field to image manifest
3. **At render time**: Use `Intl.DateTimeFormat` with the stored timezone

This is ideal for a static site—computation happens once during import.

### Implementation Steps

#### Step 1: Add timezone lookup to import script

Install `geo-tz` package (contains timezone boundary data, works offline):

```bash
pnpm add geo-tz
```

Update `scripts/import-images.ts` to:
- Import geo-tz
- After extracting GPS coordinates, call `geoTz.find(lat, lng)` to get timezone
- Store timezone in the image entry

#### Step 2: Update type definitions

Update `ImageEntry` in `src/lib/types.ts`:
- Make `location` required (non-nullable)
- Add required `timezone` field

```typescript
export interface ImageEntry {
  // ... existing fields
  location: ImageLocation;  // Now required (was nullable)
  timezone: string;         // IANA timezone, e.g., "America/Los_Angeles"
}
```

#### Step 3: Update formatFilmDate utility

Modify `src/lib/utils.ts` to accept timezone and use `Intl.DateTimeFormat`:

```typescript
export function formatFilmDate(
  dateStr: string,
  location: { lat: number; lng: number },
  timezone: string
): string {
  const date = new Date(dateStr);
  
  // Use Intl.DateTimeFormat for timezone-aware formatting
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone
  });
  
  const parts = formatter.formatToParts(date);
  // ... format as "2026 01 03 14:32"
  
  // ... rest of location formatting
}
```

#### Step 4: Update Slideshow component

Pass timezone to `formatFilmDate`:

```tsx
{formatFilmDate(image.taken_at, image.location, image.timezone)}
```

#### Step 5: Update RSS feed

Update `formatRssTitle` to accept and use timezone for human-readable title.
Keep `pubDate` as UTC (per RSS spec).

#### Step 6: Re-import all images

Delete `src/data/images.yaml` and run import script on `originals/` folder to regenerate with timezone field.

## Decisions

1. **Backfill strategy**: Rerun import script from scratch on all originals
2. **Missing GPS**: Crash the import script if an image has no GPS coordinates
3. **RSS feed**: Human-readable title should use photo's local timezone

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | Add `geo-tz` dependency |
| `scripts/import-images.ts` | Add timezone lookup, crash on missing GPS |
| `src/lib/types.ts` | Make `location` required, add `timezone` field |
| `src/data/images.yaml` | Delete and regenerate via import |
| `src/lib/utils.ts` | Update `formatFilmDate` for timezone-aware formatting |
| `src/components/Slideshow.tsx` | Pass timezone to formatter |
| `src/app/feed.xml/route.ts` | Update title formatting with timezone |

## Estimated Effort

~45 minutes

