"use client";

import { use, useState } from "react";
import RequireOwnerAuth from "@/components/owner/RequireOwnerAuth";
import CategoriesTab from "@/components/owner/CategoriesTab";
import ItemsTab from "@/components/owner/ItemsTab";
import CouponsTab from "@/components/owner/CouponsTab";
import OrdersTab from "@/components/owner/OrdersTab";
import SettingsTab from "@/components/owner/SettingsTab";

const TABS = [
  { key: "categories", label: "Categories" },
  { key: "items", label: "Items" },
  { key: "coupons", label: "Coupons" },
  { key: "orders", label: "Orders" },
  { key: "settings", label: "Settings" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function ShopManagement({ shopId }: { shopId: number }) {
  const [tab, setTab] = useState<TabKey>("categories");
  const [focusCategoryId, setFocusCategoryId] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              if (t.key !== "items") setFocusCategoryId(null);
            }}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold ${tab === t.key ? "bg-surface shadow-sm" : "text-muted"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "categories" && (
        <CategoriesTab
          shopId={shopId}
          onOpenCategory={(categoryId) => {
            setFocusCategoryId(categoryId);
            setTab("items");
          }}
        />
      )}
      {tab === "items" && (
        <ItemsTab shopId={shopId} focusCategoryId={focusCategoryId} onClearFocusCategory={() => setFocusCategoryId(null)} />
      )}
      {tab === "coupons" && <CouponsTab shopId={shopId} />}
      {tab === "orders" && <OrdersTab shopId={shopId} />}
      {tab === "settings" && <SettingsTab shopId={shopId} />}
    </div>
  );
}

export default function ShopManagementPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = use(params);
  return (
    <RequireOwnerAuth>
      <ShopManagement shopId={Number(shopId)} />
    </RequireOwnerAuth>
  );
}
