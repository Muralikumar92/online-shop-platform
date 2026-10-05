import Link from "next/link";
import { serverFetch } from "@/lib/server-api";
import type { CategoryPublic, ItemPublic } from "@/lib/types";
import ItemCard from "@/components/ItemCard";

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [categories, items] = await Promise.all([
    serverFetch<CategoryPublic[]>("/public/categories"),
    serverFetch<ItemPublic[]>(`/public/categories/${id}/items`),
  ]);
  const category = categories.find((c) => String(c.id) === id);

  return (
    <div>
      <div className="flex items-center gap-2 p-4 pb-2">
        <Link href="/" className="text-muted" aria-label="Back to categories">
          ←
        </Link>
        <h1 className="text-lg font-semibold">{category?.name ?? "Category"}</h1>
      </div>
      {items.length === 0 ? (
        <div className="flex h-full items-center justify-center px-6 py-16 text-center text-muted">
          No items in this category yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4 pt-2 sm:grid-cols-3 sm:gap-4 sm:p-6 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
