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
 * Get all images sorted by id descending (newest first)
 */
export function getAllImages(): ImageEntry[] {
  const images = loadImagesYaml();
  // Sort by id descending (newest images first)
  return [...images].sort((a, b) => b.id - a.id);
}

/**
 * Get a single image by ID
 */
export function getImageById(id: number): ImageEntry | null {
  const images = loadImagesYaml();
  return images.find((img) => img.id === id) || null;
}

/**
 * Get adjacent images for navigation and preloading
 * @param id - Current image ID
 * @param depth - Number of images to fetch in each direction (default: 2)
 * @returns Arrays of previous and next images (closest first)
 */
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
    // Slice previous images and reverse so closest is first
    prev: images.slice(Math.max(0, index - depth), index).reverse(),
    next: images.slice(index + 1, index + 1 + depth),
  };
}
