"use client";

import { useEffect, useState, useCallback } from "react";
import { useOwnerAuth } from "@/contexts/OwnerAuthContext";
import { apiFetch, apiUpload, ApiError } from "@/lib/api-client";
import type { CategoryOwner } from "@/lib/types";

export default function CategoriesTab({ shopId, onOpenCategory }: { shopId: number; onOpenCategory?: (categoryId: number) => void }) {
  const { token } = useOwnerAuth();
  const [categories, setCategories] = useState<CategoryOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await apiFetch<CategoryOwner[]>(`/owner/shops/${shopId}/categories`, {}, token);
      setCategories(list);
    } finally {
      setLoading(false);
    }
  }, [shopId, token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/owner/shops/${shopId}/categories`, { method: "POST", body: JSON.stringify({ name }) }, token);
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create category.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleThumbnail(categoryId: number, file: File) {
    setUploadingId(categoryId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiUpload(`/owner/shops/${shopId}/categories/${categoryId}/thumbnail`, formData, token);
      await load();
    } finally {
      setUploadingId(null);
    }
  }

  async function handleDelete(categoryId: number) {
    if (!confirm("Delete this category? Items inside it will remain but may become unreachable.")) return;
    await apiFetch(`/owner/shops/${shopId}/categories/${categoryId}`, { method: "DELETE" }, token);
    await load();
  }

  if (loading) return <p className="text-sm text-muted">Loading categories…</p>;

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleCreate} className="flex flex-wrap gap-3 rounded-2xl border border-border bg-surface p-4">
        <input
          type="text"
          placeholder="New category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="min-w-48 flex-1 rounded-xl border border-border px-4 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {submitting ? "Adding…" : "Add category"}
        </button>
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {categories.map((cat) => (
          <div key={cat.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3">
            <button
              type="button"
              onClick={() => onOpenCategory?.(cat.id)}
              className="flex flex-col gap-2 text-left"
              aria-label={`View items in ${cat.name}`}
            >
              <div className="aspect-square w-full overflow-hidden rounded-xl bg-zinc-100">
                {cat.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary S3/CloudFront URL
                  <img src={cat.thumbnailUrl} alt={cat.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl">🖼️</div>
                )}
              </div>
              <p className="truncate text-sm font-medium">{cat.name}</p>
              <span className="text-xs text-accent">View items →</span>
            </button>
            <label className="cursor-pointer rounded-lg border border-border px-2 py-1 text-center text-xs text-muted hover:border-accent">
              {uploadingId === cat.id ? "Uploading…" : "Upload image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleThumbnail(cat.id, e.target.files[0])}
              />
            </label>
            <button type="button" onClick={() => handleDelete(cat.id)} className="text-xs text-red-600">
              Delete
            </button>
          </div>
        ))}
        {categories.length === 0 && <p className="col-span-full text-sm text-muted">No categories yet. Add your first one above.</p>}
      </div>
    </div>
  );
}
