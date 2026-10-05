import Link from "next/link";
import { serverFetch } from "@/lib/server-api";
import type { CategoryPublic } from "@/lib/types";

export default async function HomePage() {
  const categories = await serverFetch<CategoryPublic[]>("/public/categories");

  if (categories.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-muted">
        No categories yet — check back soon!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:gap-4 sm:p-6 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/categories/${category.id}`}
          className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
        >
          <div className="aspect-square w-full bg-zinc-100">
            {category.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary external S3/CloudFront media URLs
              <img
                src={category.thumbnailUrl}
                alt={category.name}
                className="h-full w-full object-cover transition-transform group-active:scale-95"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl">🖼️</div>
            )}
          </div>
          <p className="truncate px-3 py-2 text-sm font-medium">{category.name}</p>
        </Link>
      ))}
    </div>
  );
}
