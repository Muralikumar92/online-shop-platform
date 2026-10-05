"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountIcon, { useAccountDisplayName } from "./AccountIcon";

const TABS = [
  { href: "/", label: "Shop", icon: "🏠" },
  { href: "/orders", label: "Orders", icon: "📦" },
  { href: "/account", label: "Account", icon: null },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const displayName = useAccountDisplayName();
  return (
    <nav className="sticky bottom-0 z-10 flex border-t border-border bg-surface/95 backdrop-blur md:hidden">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${active ? "text-accent font-semibold" : "text-muted"}`}
          >
            {tab.icon ? <span className="text-lg">{tab.icon}</span> : <AccountIcon />}
            <span className="max-w-[72px] truncate">{tab.icon ? tab.label : displayName ?? tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
