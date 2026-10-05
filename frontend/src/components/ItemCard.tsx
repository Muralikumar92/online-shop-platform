import Link from "next/link";
import type { ItemPublic } from "@/lib/types";
import { formatPaise } from "@/lib/types";
import AddToCartForm from "@/components/AddToCartForm";

export default function ItemCard({ item }: { item: ItemPublic }) {
  const thumbnail = item.media.find((m) => m.type === "IMAGE")?.url ?? item.media[0]?.url ?? null;
  const outOfStock = item.stockQuantity <= 0;
  const hasDiscount = item.discountPercentage > 0;

  return (
    <Link
      href={`/items/${item.id}`}
      className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
      aria-disabled={outOfStock}
    >
      <div className="relative aspect-square w-full bg-zinc-100">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary external S3/CloudFront media URLs
          <img
            src={thumbnail}
            alt={item.name}
            className="h-full w-full object-cover transition-transform group-active:scale-95"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">🖼️</div>
        )}
        {outOfStock && (
          <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-xs font-semibold text-white">
            Out of stock
          </span>
        )}
        {hasDiscount && !outOfStock && (
          <span className="absolute top-2 left-2 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
            {item.discountPercentage}% off
          </span>
        )}
      </div>
      <div className="px-3 py-2">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">{formatPaise(item.effectivePriceInPaise)}</span>
          {hasDiscount && (
            <span className="text-xs text-muted line-through">{formatPaise(item.priceInPaise)}</span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {outOfStock ? "Out of stock" : `${item.stockQuantity} in stock`}
        </p>
        <div className="mt-2">
          <AddToCartForm item={item} compact />
        </div>
      </div>
    </Link>
  );
}
