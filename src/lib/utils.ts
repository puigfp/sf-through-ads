/**
 * Format date and location for film-style display
 * Format: 2026 01 03 14:32 37.77°N 122.41°W
 */
export function formatFilmDate(
  dateStr: string,
  location?: { lat: number; lng: number } | null
): string {
  const date = new Date(dateStr);

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  let result = `${year} ${month} ${day} ${hours}:${minutes}`;

  if (location) {
    const latDir = location.lat >= 0 ? "N" : "S";
    const lngDir = location.lng >= 0 ? "E" : "W";
    const lat = Math.abs(location.lat).toFixed(2);
    const lng = Math.abs(location.lng).toFixed(2);
    result += ` ${lat}°${latDir} ${lng}°${lngDir}`;
  }

  return result;
}
