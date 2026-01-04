/**
 * Format date and location for film-style display
 * Format: 2026 01 03 14:32 37.77°N 122.41°W
 * 
 * Time is displayed in the timezone of the photo location.
 */
export function formatFilmDate(
  dateStr: string,
  location: { lat: number; lng: number },
  timezone: string
): string {
  const date = new Date(dateStr);

  // Use Intl.DateTimeFormat for timezone-aware formatting
  const formatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value || "";

  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hours = getPart("hour");
  const minutes = getPart("minute");

  let result = `${year} ${month} ${day} ${hours}:${minutes}`;

  const latDir = location.lat >= 0 ? "N" : "S";
  const lngDir = location.lng >= 0 ? "E" : "W";
  const lat = Math.abs(location.lat).toFixed(2);
  const lng = Math.abs(location.lng).toFixed(2);
  result += ` ${lat}°${latDir} ${lng}°${lngDir}`;

  return result;
}
