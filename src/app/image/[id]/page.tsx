import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Slideshow } from "@/components/Slideshow";
import { getImageById, getAdjacentImages, getAllImages } from "@/lib/images";
import { SITE_CONFIG } from "@/lib/config";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const imageId = parseInt(id, 10);
  const image = getImageById(imageId);

  if (!image) {
    return {
      title: "Image Not Found",
    };
  }

  const desc = image.description || image.ai_generated_alt_text;

  return {
    title: SITE_CONFIG.name,
    description: desc,
    openGraph: {
      title: SITE_CONFIG.name,
      description: desc,
      images: [`${SITE_CONFIG.url}/images/${image.filename}`],
      url: `${SITE_CONFIG.url}/image/${image.id}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export function generateStaticParams() {
  const images = getAllImages();
  return images.map((img) => ({
    id: String(img.id),
  }));
}

export default async function ImagePage({ params }: PageProps) {
  const { id } = await params;
  const imageId = parseInt(id, 10);

  if (isNaN(imageId)) {
    notFound();
  }

  const image = getImageById(imageId);

  if (!image) {
    notFound();
  }

  const { prev, next } = getAdjacentImages(imageId);

  return <Slideshow image={image} prevImage={prev} nextImage={next} />;
}

