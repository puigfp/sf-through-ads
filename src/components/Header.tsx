"use client";

import Link from "next/link";
import { SITE_CONFIG } from "@/lib/config";

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-[var(--color-background)]/80 backdrop-blur-md border-b border-neutral-200">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <Link href="/" className="inline-block">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 hover:text-neutral-600 transition-colors">
            {SITE_CONFIG.name}
          </h1>
        </Link>
      </div>
    </header>
  );
}

