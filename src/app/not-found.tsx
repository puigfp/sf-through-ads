import Link from "next/link";
import { SITE_CONFIG } from "@/lib/config";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-neutral-300 mb-4">404</h1>
        <h2 className="text-xl font-medium text-neutral-600 mb-2">
          Image Not Found
        </h2>
        <p className="text-neutral-500 mb-6">
          The image you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors"
        >
          Back to {SITE_CONFIG.name}
        </Link>
      </div>
    </div>
  );
}

