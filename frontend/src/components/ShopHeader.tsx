import Link from "next/link";
import type { ShopPublic } from "@/lib/types";
import CartBadgeLink from "./CartBadgeLink";
import { AccountNavLink } from "./AccountIcon";

const NAV_LINKS = [
  { href: "/", label: "Shop" },
  { href: "/orders", label: "Orders" },
  { href: "/account", label: "Account" },
];

export default function ShopHeader({ shop }: { shop: ShopPublic }) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
      <div className="content-container flex items-center gap-3 px-4 py-3 sm:px-6">
        {shop.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- shop logos are arbitrary external S3/CloudFront URLs
          <img src={shop.logoUrl} alt={shop.name} className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
            {shop.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="flex-1 truncate text-lg font-semibold">{shop.name}</span>
        {/* Desktop nav links replace the mobile bottom tab bar on larger screens. */}
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
          {NAV_LINKS.map((link) =>
            link.href === "/account" ? (
              <AccountNavLink key={link.href} label={link.label} />
            ) : (
              <Link key={link.href} href={link.href} className="hover:text-foreground">
                {link.label}
              </Link>
            )
          )}
        </nav>
        <CartBadgeLink />
      </div>
    </header>
  );
}
