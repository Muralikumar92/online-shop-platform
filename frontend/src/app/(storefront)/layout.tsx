import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { serverFetch, ApiError } from "@/lib/server-api";
import type { ShopPublic } from "@/lib/types";
import ShopHeader from "@/components/ShopHeader";
import BottomNav from "@/components/BottomNav";
import GlobalCheckoutBar from "@/components/GlobalCheckoutBar";

async function loadShop(): Promise<ShopPublic | null> {
  try {
    return await serverFetch<ShopPublic>("/public/shop");
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
      return null;
    }
    throw err;
  }
}

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const shop = await loadShop();

  if (!shop) {
    return (
      <div className="app-shell items-center justify-center px-6 text-center">
        <p className="text-lg font-semibold">Shop not found</p>
        <p className="mt-2 text-sm text-muted">
          This store isn&apos;t available right now. Double-check the address, or the shop&apos;s subscription may have lapsed.
        </p>
      </div>
    );
  }

  return (
    <CustomerAuthProvider>
      <CartProvider>
        <div className="app-shell">
          <ShopHeader shop={shop} />
          <main className="content-container w-full flex-1 overflow-y-auto pb-20 md:pb-4">{children}</main>
          <GlobalCheckoutBar />
          <BottomNav />
        </div>
      </CartProvider>
    </CustomerAuthProvider>
  );
}
