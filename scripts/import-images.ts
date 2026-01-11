#!/usr/bin/env tsx
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { execSync } from "child_process";
import sharp from "sharp";
import exifr from "exifr";
import YAML from "yaml";
import OpenAI from "openai";
import { find as findTimezone } from "geo-tz";

// Configuration
const PUBLIC_IMAGES_DIR = path.join(process.cwd(), "public/images");
const ORIGINALS_DIR = path.join(process.cwd(), "originals");
const IMAGES_YAML_PATH = path.join(process.cwd(), "src/data/images.yaml");
const ALT_TEXT_CACHE_DIR = path.join(process.cwd(), ".cache/alt-text");
const SUPPORTED_EXTENSIONS = [".heic", ".jpg", ".jpeg"];

// Ensure cache directory exists
if (!fs.existsSync(ALT_TEXT_CACHE_DIR)) {
  fs.mkdirSync(ALT_TEXT_CACHE_DIR, { recursive: true });
}

interface ImageLocation {
  lat: number;
  lng: number;
}

interface ImageEntry {
  id: number;
  filename: string;
  thumbnail_filename: string;
  original_path: string;
  original_hash: string;
  taken_at: string;
  imported_at: string;
  width: number;
  height: number;
  location: ImageLocation;
  timezone: string;
  ai_generated_alt_text: string;
  description: string;
  tags: string[];
}

interface ImagesYaml {
  images: ImageEntry[];
}

// Initialize OpenAI client
const openai = new OpenAI();

async function computeFileHash(filePath: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  return `sha256:${hash}`;
}

/**
 * Convert DMS (degrees, minutes, seconds) to decimal degrees
 */
function dmsToDecimal(dmsString: string): number {
  // Handle both formats: "37,48,17.44" (DMS) and "37.8043" (decimal)
  if (dmsString.includes(',')) {
    // DMS format: degrees,minutes,seconds
    const parts = dmsString.split(',').map(p => parseFloat(p.trim()));
    if (parts.length === 3) {
      const [degrees, minutes, seconds] = parts;
      return degrees + (minutes / 60) + (seconds / 3600);
    }
  }
  // Decimal format or fallback
  return parseFloat(dmsString);
}

/**
 * Extract EXIF from HEIC using macOS mdls command
 */
function extractHeicExifViaMdls(filePath: string): {
  takenAt: Date | null;
  location: ImageLocation | null;
} {
  try {
    const output = execSync(
      `mdls -name kMDItemContentCreationDate -name kMDItemLatitude -name kMDItemLongitude "${filePath}"`,
      { encoding: "utf-8" }
    );

    let takenAt: Date | null = null;
    let location: ImageLocation | null = null;

    const dateMatch = output.match(/kMDItemContentCreationDate\s*=\s*(.+)/);
    if (dateMatch && !dateMatch[1].includes("null")) {
      takenAt = new Date(dateMatch[1].trim());
    }

    const latMatch = output.match(/kMDItemLatitude\s*=\s*([^\s]+)/);
    const lngMatch = output.match(/kMDItemLongitude\s*=\s*([^\s]+)/);
    if (latMatch && lngMatch) {
      location = {
        lat: dmsToDecimal(latMatch[1]),
        lng: dmsToDecimal(lngMatch[1]),
      };
    }

    return { takenAt, location };
  } catch {
    return { takenAt: null, location: null };
  }
}

async function extractExifData(
  filePath: string,
  convertedJpegPath?: string
): Promise<{
  takenAt: Date;
  location: ImageLocation;
  timezone: string;
  width: number;
  height: number;
}> {
  const ext = path.extname(filePath).toLowerCase();
  let takenAt: Date | null = null;
  let location: ImageLocation | null = null;
  let width = 0;
  let height = 0;

  // For HEIC files, try mdls first (macOS native, very reliable)
  if (ext === ".heic") {
    const mdlsData = extractHeicExifViaMdls(filePath);
    takenAt = mdlsData.takenAt;
    location = mdlsData.location;
  }

  // Try exifr on original file or converted JPEG
  const exifSource = convertedJpegPath || filePath;
  try {
    const exif = await exifr.parse(exifSource, {
      pick: [
        "DateTimeOriginal",
        "CreateDate",
        "GPSLatitude",
        "GPSLongitude",
        "ImageWidth",
        "ImageHeight",
        "ExifImageWidth",
        "ExifImageHeight",
      ],
    });

    // Use exifr date if we don't have one from mdls
    if (!takenAt) {
      if (exif?.DateTimeOriginal) {
        takenAt = new Date(exif.DateTimeOriginal);
      } else if (exif?.CreateDate) {
        takenAt = new Date(exif.CreateDate);
      }
    }

    // Use exifr location if we don't have one from mdls
    if (!location && exif?.latitude && exif?.longitude) {
      location = {
        lat: exif.latitude,
        lng: exif.longitude,
      };
    }

    width = exif?.ExifImageWidth || exif?.ImageWidth || 0;
    height = exif?.ExifImageHeight || exif?.ImageHeight || 0;
  } catch (error) {
    // exifr failed, continue with what we have
  }

  // Final fallback for date
  if (!takenAt) {
    console.warn(`  ⚠ No EXIF date found, using file modification time`);
    const stats = fs.statSync(filePath);
    takenAt = stats.mtime;
  }

  // GPS location is required
  if (!location) {
    throw new Error(`No GPS coordinates found in ${path.basename(filePath)}`);
  }

  // Lookup timezone from GPS coordinates
  const timezones = findTimezone(location.lat, location.lng);
  if (timezones.length === 0) {
    throw new Error(`Could not determine timezone for coordinates ${location.lat}, ${location.lng}`);
  }
  const timezone = timezones[0];

  return { takenAt, location, timezone, width, height };
}

/**
 * Convert HEIC to JPEG using macOS sips command (has native HEIC support)
 */
function convertHeicToJpeg(inputPath: string, outputPath: string): void {
  execSync(`sips -s format jpeg "${inputPath}" --out "${outputPath}"`, {
    stdio: "pipe",
  });
}

function getCachedAltText(hash: string): string | null {
  const cacheFile = path.join(ALT_TEXT_CACHE_DIR, `${hash.replace(":", "_")}.txt`);
  if (fs.existsSync(cacheFile)) {
    return fs.readFileSync(cacheFile, "utf-8");
  }
  return null;
}

function setCachedAltText(hash: string, altText: string): void {
  const cacheFile = path.join(ALT_TEXT_CACHE_DIR, `${hash.replace(":", "_")}.txt`);
  fs.writeFileSync(cacheFile, altText, "utf-8");
}

async function generateAltText(imageBuffer: Buffer, hash: string): Promise<string> {
  // Check cache first
  const cached = getCachedAltText(hash);
  if (cached) {
    console.log(`  ✓ Alt (cached): ${cached.substring(0, 50)}...`);
    return cached;
  }

  console.log(`  🤖 Generating alt text...`);
  try {
    const base64Image = imageBuffer.toString("base64");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `This is a photo of an advertisement or billboard in San Francisco.

Write a 1-2 sentence alt text description that:
- Describes what the advertisement says or shows
- Mentions the brand/company name if visible
- Notes any distinctive visual elements

Return JSON: {"alt_text": "..."}`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content);
    const altText = parsed.alt_text || "An advertisement from San Francisco.";
    
    // Cache the result
    setCachedAltText(hash, altText);
    console.log(`  ✓ Alt: ${altText.substring(0, 50)}...`);
    
    return altText;
  } catch (error) {
    console.warn(`  ⚠ Alt text generation failed: ${error}`);
    return "An advertisement from San Francisco.";
  }
}


async function processImage(
  sourcePath: string,
  id: number,
  existingHashes: Set<string>
): Promise<ImageEntry | null> {
  const filename = path.basename(sourcePath);
  const ext = path.extname(sourcePath).toLowerCase();
  console.log(`Processing: ${filename}`);

  // Compute hash for deduplication
  const hash = await computeFileHash(sourcePath);
  if (existingHashes.has(hash)) {
    console.log(`  ⏭ Skipping (already imported)`);
    return null;
  }

  // Convert to JPEG first (needed for EXIF fallback on HEIC)
  let imageBuffer: Buffer;
  const tempJpegPath = path.join(
    PUBLIC_IMAGES_DIR,
    `temp_${Date.now()}.jpg`
  );

  try {
    if (ext === ".heic") {
      // Use sips on macOS for HEIC conversion
      console.log(`  🔄 Converting HEIC to JPEG...`);
      convertHeicToJpeg(sourcePath, tempJpegPath);
      imageBuffer = fs.readFileSync(tempJpegPath);
    } else {
      // Read JPEG directly
      imageBuffer = fs.readFileSync(sourcePath);
    }

    // Extract EXIF data (from original HEIC via mdls, or converted JPEG as fallback)
    const exifData = await extractExifData(
      sourcePath,
      ext === ".heic" ? tempJpegPath : undefined
    );

    // Auto-rotate and get accurate dimensions
    imageBuffer = await sharp(imageBuffer)
      .rotate() // Auto-rotate based on EXIF
      .jpeg({ quality: 95 })
      .toBuffer();

    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width!;
    const height = metadata.height!;

    console.log(`  📐 Dimensions: ${width}x${height}`);
    console.log(`  🌍 Location: ${exifData.location.lat.toFixed(4)}, ${exifData.location.lng.toFixed(4)} (${exifData.timezone})`);

    // Generate alt text with AI (cached by hash)
    const altText = await generateAltText(imageBuffer, hash);

    // Generate filenames
    const paddedId = String(id).padStart(5, "0");
    const fullFilename = `${paddedId}.jpg`;
    const thumbFilename = `${paddedId}_thumb.jpg`;

    // Save full image (original aspect ratio)
    const fullPath = path.join(PUBLIC_IMAGES_DIR, fullFilename);
    await sharp(imageBuffer).jpeg({ quality: 90 }).toFile(fullPath);
    console.log(`  💾 Saved: ${fullFilename}`);

    // Save square-cropped thumbnail (center crop)
    const size = Math.min(width, height);
    const cropX = Math.floor((width - size) / 2);
    const cropY = Math.floor((height - size) / 2);
    const thumbPath = path.join(PUBLIC_IMAGES_DIR, thumbFilename);
    await sharp(imageBuffer)
      .extract({ left: cropX, top: cropY, width: size, height: size })
      .jpeg({ quality: 85 })
      .toFile(thumbPath);
    console.log(`  💾 Saved: ${thumbFilename}`);

    // Copy original to originals folder (if not already there)
    const originalDest = path.join(ORIGINALS_DIR, filename);
    if (path.resolve(sourcePath) !== path.resolve(originalDest)) {
      fs.copyFileSync(sourcePath, originalDest);
      console.log(`  📁 Archived original`);
    }

    // Create entry
    const entry: ImageEntry = {
      id,
      filename: fullFilename,
      thumbnail_filename: thumbFilename,
      original_path: filename,
      original_hash: hash,
      taken_at: exifData.takenAt.toISOString(),
      imported_at: new Date().toISOString(),
      width,
      height,
      location: exifData.location,
      timezone: exifData.timezone,
      ai_generated_alt_text: altText,
      description: "",
      tags: [],
    };

    return entry;
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempJpegPath)) {
      fs.unlinkSync(tempJpegPath);
    }
  }
}

async function loadImagesYaml(): Promise<ImagesYaml> {
  if (!fs.existsSync(IMAGES_YAML_PATH)) {
    return { images: [] };
  }

  const content = fs.readFileSync(IMAGES_YAML_PATH, "utf-8");
  const parsed = YAML.parse(content) as ImagesYaml;
  return parsed || { images: [] };
}

function saveImagesYaml(data: ImagesYaml): void {
  // Sort by taken_at descending (newest first)
  data.images.sort(
    (a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime()
  );

  const yamlContent = YAML.stringify(data, {
    lineWidth: 0,
  });
  fs.writeFileSync(IMAGES_YAML_PATH, yamlContent);
}

function scanSourceFolder(sourceFolder: string): string[] {
  const files: string[] = [];

  const entries = fs.readdirSync(sourceFolder, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        files.push(path.join(sourceFolder, entry.name));
      }
    }
  }

  return files.sort();
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: pnpm import-images <source-folder>");
    process.exit(1);
  }

  const sourceFolder = path.resolve(args[0]);
  if (!fs.existsSync(sourceFolder)) {
    console.error(`Source folder not found: ${sourceFolder}`);
    process.exit(1);
  }

  // Ensure output directories exist
  fs.mkdirSync(PUBLIC_IMAGES_DIR, { recursive: true });
  fs.mkdirSync(ORIGINALS_DIR, { recursive: true });

  // Load existing data
  const data = await loadImagesYaml();
  const existingHashes = new Set(data.images.map((img) => img.original_hash));
  const maxId = data.images.reduce((max, img) => Math.max(max, img.id), 0);

  console.log(`Found ${data.images.length} existing images`);
  console.log(`Next ID: ${maxId + 1}\n`);

  // Scan source folder
  const sourceFiles = scanSourceFolder(sourceFolder);
  console.log(`Found ${sourceFiles.length} images to process\n`);

  let nextId = maxId + 1;
  let imported = 0;
  let skipped = 0;

  for (const filePath of sourceFiles) {
    try {
      const entry = await processImage(filePath, nextId, existingHashes);
      if (entry) {
        data.images.push(entry);
        existingHashes.add(entry.original_hash);
        nextId++;
        imported++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`  ❌ Failed to process: ${error}`);
      skipped++;
    }
    console.log();
  }

  // Save updated YAML
  saveImagesYaml(data);

  console.log("═".repeat(50));
  console.log(`✓ Imported: ${imported}`);
  console.log(`⏭ Skipped: ${skipped}`);
  console.log(`📊 Total images: ${data.images.length}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
