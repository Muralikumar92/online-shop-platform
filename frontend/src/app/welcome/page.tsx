import Link from "next/link";

export const metadata = {
  title: "Online Shop Platform",
  description: "Give your shop a beautiful, mobile-first online store in minutes.",
};

// Served at the platform's apex/root domain only - proxy.ts rewrites
// requests for "/" on the root domain here, leaving every shop subdomain's
// "/" to keep resolving to (storefront)/page.tsx (the category grid).
export default function WelcomePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
        <span className="rounded-full bg-accent/10 px-4 py-1 text-xs font-semibold tracking-wide text-accent uppercase">
          Online Shop Platform
        </span>
        <h1 className="text-3xl font-bold sm:text-4xl">Your shop, online, in minutes.</h1>
        <p className="text-sm leading-relaxed text-muted sm:text-base">
          Showcase your products with photos and videos, let customers browse and checkout from their phone, and
          track every order from packed to delivered — all from one simple dashboard.
        </p>

        <Link
          href="/owner"
          className="w-full rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90 sm:text-base"
        >
          Go to Owner Portal →
        </Link>

        <p className="text-xs text-muted">
          Already have a shop? Your customers can visit it directly at your shop&apos;s own address
          (e.g. <span className="font-mono">your-shop.theatti.com</span>).
        </p>
      </div>
    </div>
  );
}
