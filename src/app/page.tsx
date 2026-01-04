import { Header } from "@/components/Header";
import { ImageGrid } from "@/components/ImageGrid";
import { getAllImages } from "@/lib/images";

export default function Home() {
  const images = getAllImages();

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-6xl mx-auto px-2 sm:px-4 py-4">
        <ImageGrid images={images} />
      </main>
    </div>
  );
}
