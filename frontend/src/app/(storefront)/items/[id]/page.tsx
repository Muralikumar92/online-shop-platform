import Link from "next/link";
import { serverFetch } from "@/lib/server-api";
import type { ItemPublic } from "@/lib/types";
import { formatPaise } from "@/lib/types";
import ItemGallery from "@/components/ItemGallery";
import AddToCartForm from "@/components/AddToCartForm";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await serverFetch<ItemPublic>(`/public/items/${id}`);
  const hasDiscount = item.discountPercentage > 0;

  return (
    <div className="pb-6 md:pb-10">
      <div className="flex items-center gap-2 p-4 pb-2">
        <Link href={`/categories/${item.categoryId}`} className="text-muted" aria-label="Back">
          ←
        </Link>
      </div>
      <div className="md:flex md:items-start md:gap-8 md:px-4">
        {/* Moderate, fixed-width gallery on desktop - keeps image quality (no
            upscaling/stretching across the full page width) and lets the
            details column sit alongside it without scrolling. */}
        <div className="md:w-[420px] md:shrink-0 md:overflow-hidden md:rounded-2xl">
          <ItemGallery media={item.media} itemName={item.name} />
        </div>
        <div className="space-y-3 p-4 md:flex-1 md:p-0">
          <h1 className="text-xl font-semibold">{item.name}</h1>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{formatPaise(item.effectivePriceInPaise)}</span>
            {hasDiscount && (
              <>
                <span className="text-sm text-muted line-through">{formatPaise(item.priceInPaise)}</span>
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                  {item.discountPercentage}% off
                </span>
              </>
            )}
          </div>
          <p className="text-sm text-muted">
            {item.stockQuantity > 0 ? `${item.stockQuantity} in stock` : "Out of stock"}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.description}</p>
          <div className="md:max-w-xs">
            <AddToCartForm item={item} />
          </div>
        </div>
      </div>
    </div>
  );
}
