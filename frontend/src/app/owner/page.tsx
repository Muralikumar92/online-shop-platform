"use client";

import { useState } from "react";
import Link from "next/link";
import { useOwnerAuth, type OwnerShop } from "@/contexts/OwnerAuthContext";
import RequireOwnerAuth from "@/components/owner/RequireOwnerAuth";
import { apiFetch, ApiError } from "@/lib/api-client";

function statusBadge(shop: OwnerShop) {
  const map: Record<string, string> = {
    TRIAL: "bg-amber-100 text-amber-800",
    ACTIVE: "bg-green-100 text-green-800",
    EXPIRED: "bg-red-100 text-red-800",
    CANCELLED: "bg-zinc-200 text-zinc-700",
  };
  return map[shop.subscriptionStatus] ?? "bg-zinc-200 text-zinc-700";
}

function CreateShopForm({ onCreated }: { onCreated: () => void }) {
  const { token } = useOwnerAuth();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/owner/shops", { method: "POST", body: JSON.stringify({ name, slug: slug || undefined }) }, token);
      setName("");
      setSlug("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create shop.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-semibold">Create a new shop</h2>
      <input
        type="text"
        placeholder="Shop name (e.g. Jane's Boutique)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="rounded-xl border border-border px-4 py-2.5 text-sm"
      />
      <input
        type="text"
        placeholder="Subdomain slug (optional, e.g. janes-boutique)"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        className="rounded-xl border border-border px-4 py-2.5 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
      >
        {submitting ? "Creating…" : "Create shop"}
      </button>
    </form>
  );
}

function Dashboard() {
  const { shops, refreshShops } = useOwnerAuth();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Your shops</h1>
        <p className="text-sm text-muted">Manage catalog, orders and subscription for each of your stores.</p>
      </div>

      {shops.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => (
            <Link
              key={shop.id}
              href={`/owner/shops/${shop.id}`}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5 hover:border-accent"
            >
              <div className="flex items-center gap-3">
                {shop.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary S3/CloudFront logo URL
                  <img src={shop.logoUrl} alt={shop.name} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                    {shop.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold">{shop.name}</p>
                  <p className="text-xs text-muted">{shop.slug}.myshops.com</p>
                </div>
              </div>
              <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(shop)}`}>
                {shop.subscriptionStatus}
              </span>
            </Link>
          ))}
        </div>
      )}

      <CreateShopForm onCreated={refreshShops} />
    </div>
  );
}

export default function OwnerDashboardPage() {
  return (
    <RequireOwnerAuth>
      <Dashboard />
    </RequireOwnerAuth>
  );
}
