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

function formatRssTitle(date: Date): string {
  return (
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " at " +
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  );
}

export async function GET() {
  const images = getAllImages();

  const items = images
    .map((img) => {
      const title = formatRssTitle(new Date(img.taken_at));
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

