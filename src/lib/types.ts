export interface ImageLocation {
  lat: number;
  lng: number;
}

export interface ImageEntry {
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
