import "server-only";
import * as fs from "fs";
import * as path from "path";
import YAML from "yaml";
import type { ImageEntry } from "./types";

export type { ImageEntry, ImageLocation } from "./types";

interface ImagesYaml {
  images: ImageEntry[];
}

function loadImagesYaml(): ImageEntry[] {
  const yamlPath = path.join(process.cwd(), "src/data/images.yaml");

  if (!fs.existsSync(yamlPath)) {
    return [];
  }

  const content = fs.readFileSync(yamlPath, "utf-8");
  const parsed = YAML.parse(content) as ImagesYaml;

  return parsed?.images || [];
}

/**
 * Get all images sorted by taken_at descending (newest first)
 */
export function getAllImages(): ImageEntry[] {
  const images = loadImagesYaml();
  // Already sorted in YAML, but ensure order
  return [...images].sort(
    (a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime()
  );
}

/**
 * Get a single image by ID
 */
export function getImageById(id: number): ImageEntry | null {
  const images = loadImagesYaml();
  return images.find((img) => img.id === id) || null;
}

/**
 * Get adjacent images for navigation (previous and next)
 */
export function getAdjacentImages(
  id: number
): { prev: ImageEntry | null; next: ImageEntry | null } {
  const images = getAllImages();
  const index = images.findIndex((img) => img.id === id);

  if (index === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: index > 0 ? images[index - 1] : null,
    next: index < images.length - 1 ? images[index + 1] : null,
  };
}
