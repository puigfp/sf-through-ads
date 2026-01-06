import { SITE_CONFIG } from "@/lib/config";
import { getAllImages } from "@/lib/images";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatRssTitle(date: Date, timezone: string): string {
  return (
    "Taken on " +
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: timezone,
    }) +
    " at " +
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    })
  );
}

export async function GET() {
  const images = getAllImages();

  // Sort by imported_at descending (newest imports first)
  const sortedImages = [...images].sort(
    (a, b) => new Date(b.imported_at).getTime() - new Date(a.imported_at).getTime()
  );

  const items = sortedImages
    .map((img) => {
      const title = formatRssTitle(new Date(img.taken_at), img.timezone);
      const description = img.description
        ? `<img src="${SITE_CONFIG.url}/images/${img.filename}" /><p>${escapeXml(img.description)}</p>`
        : `<img src="${SITE_CONFIG.url}/images/${img.filename}" />`;

      return `
    <item>
      <title>${escapeXml(title)}</title>
      <link>${SITE_CONFIG.url}/image/${img.id}</link>
      <description><![CDATA[${description}]]></description>
      <pubDate>${new Date(img.taken_at).toUTCString()}</pubDate>
      <guid isPermaLink="true">${SITE_CONFIG.url}/image/${img.id}</guid>
    </item>`;
    })
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_CONFIG.name)}</title>
    <link>${SITE_CONFIG.url}</link>
    <description>${escapeXml(SITE_CONFIG.description)}</description>
    <atom:link href="${SITE_CONFIG.url}/feed.xml" rel="self" type="application/rss+xml"/>${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

