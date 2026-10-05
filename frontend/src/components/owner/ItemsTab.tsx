"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useOwnerAuth } from "@/contexts/OwnerAuthContext";
import { apiFetch, apiUpload, ApiError } from "@/lib/api-client";
import type { CategoryOwner, ItemPublic } from "@/lib/types";
import { formatPaise } from "@/lib/types";

const emptyForm = { name: "", description: "", categoryId: "", price: "", discountPercentage: "0", stockQuantity: "0" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export default function ItemsTab({
  shopId,
  focusCategoryId,
  onClearFocusCategory,
}: {
  shopId: number;
  /** When set (e.g. navigated here from clicking a category), only that category's items are shown and new items default into it. */
  focusCategoryId?: number | null;
  onClearFocusCategory?: () => void;
}) {
  const { token } = useOwnerAuth();
  const [items, setItems] = useState<ItemPublic[]>([]);
  const [categories, setCategories] = useState<CategoryOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newMediaFiles, setNewMediaFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [itemList, categoryList] = await Promise.all([
        apiFetch<ItemPublic[]>(`/owner/shops/${shopId}/items`, {}, token),
        apiFetch<CategoryOwner[]>(`/owner/shops/${shopId}/categories`, {}, token),
      ]);
      setItems(itemList);
      setCategories(categoryList);
    } finally {
      setLoading(false);
    }
  }, [shopId, token]);

  useEffect(() => {
    load();
  }, [load]);

  const categoryName = useCallback((id: number) => categories.find((c) => c.id === id)?.name ?? "Uncategorized", [categories]);

  const visibleItems = useMemo(
    () => (focusCategoryId ? items.filter((i) => i.categoryId === focusCategoryId) : items),
    [items, focusCategoryId]
  );

  const groupedItems = useMemo(() => {
    const groups = new Map<number, ItemPublic[]>();
    for (const item of visibleItems) {
      const list = groups.get(item.categoryId) ?? [];
      list.push(item);
      groups.set(item.categoryId, list);
    }
    return Array.from(groups.entries()).sort((a, b) => categoryName(a[0]).localeCompare(categoryName(b[0])));
  }, [visibleItems, categoryName]);

  function startCreate() {
    const defaultCategoryId = focusCategoryId ?? categories[0]?.id;
    setForm({ ...emptyForm, categoryId: defaultCategoryId ? String(defaultCategoryId) : "" });
    setNewMediaFiles([]);
    setEditingId("new");
    setError(null);
  }

  function startEdit(item: ItemPublic) {
    setForm({
      name: item.name,
      description: item.description ?? "",
      categoryId: String(item.categoryId),
      price: String(item.priceInPaise / 100),
      discountPercentage: String(item.discountPercentage),
      stockQuantity: String(item.stockQuantity),
    });
    setNewMediaFiles([]);
    setEditingId(item.id);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const body = {
      name: form.name,
      description: form.description,
      categoryId: Number(form.categoryId),
      priceInPaise: Math.round(Number(form.price) * 100),
      discountPercentage: Number(form.discountPercentage),
      stockQuantity: Number(form.stockQuantity),
    };
    try {
      if (editingId === "new") {
        const created = await apiFetch<ItemPublic>(`/owner/shops/${shopId}/items`, { method: "POST", body: JSON.stringify(body) }, token);
        if (newMediaFiles.length > 0) {
          const formData = new FormData();
          newMediaFiles.forEach((f) => formData.append("files", f));
          await apiUpload(`/owner/shops/${shopId}/items/${created.id}/media`, formData, token);
        }
      } else {
        await apiFetch(`/owner/shops/${shopId}/items/${editingId}`, { method: "PUT", body: JSON.stringify(body) }, token);
      }
      setEditingId(null);
      setNewMediaFiles([]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save item.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMediaUpload(itemId: number, files: FileList) {
    setUploadingId(itemId);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      await apiUpload(`/owner/shops/${shopId}/items/${itemId}/media`, formData, token);
      await load();
    } finally {
      setUploadingId(null);
    }
  }

  async function handleRemoveMedia(itemId: number, mediaId: number) {
    await apiFetch(`/owner/shops/${shopId}/items/${itemId}/media/${mediaId}`, { method: "DELETE" }, token);
    await load();
  }

  async function handleDelete(itemId: number) {
    if (!confirm("Delete this item permanently?")) return;
    await apiFetch(`/owner/shops/${shopId}/items/${itemId}`, { method: "DELETE" }, token);
    await load();
  }

  if (loading) return <p className="text-sm text-muted">Loading items…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Items</h2>
          {focusCategoryId && (
            <p className="text-sm text-muted">
              Showing only <span className="font-medium">{categoryName(focusCategoryId)}</span>
              {onClearFocusCategory && (
                <button type="button" onClick={onClearFocusCategory} className="ml-2 text-accent">
                  Show all categories
                </button>
              )}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={startCreate}
          disabled={categories.length === 0}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          + Add item
        </button>
      </div>
      {categories.length === 0 && <p className="text-sm text-muted">Add a category first before creating items.</p>}

      {editingId !== null && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
          <Field label="Item name">
            <input
              type="text"
              placeholder="e.g. Pattu Saree"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="rounded-xl border border-border px-4 py-2.5 text-sm"
            />
          </Field>
          <Field label="Description">
            <textarea
              placeholder="Describe the item"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="rounded-xl border border-border px-4 py-2.5 text-sm"
            />
          </Field>
          <Field label="Category">
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              required
              className="rounded-xl border border-border px-4 py-2.5 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Price (₹)">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
                className="rounded-xl border border-border px-4 py-2.5 text-sm"
              />
            </Field>
            <Field label="Discount %">
              <input
                type="number"
                min="0"
                max="100"
                placeholder="0"
                value={form.discountPercentage}
                onChange={(e) => setForm({ ...form, discountPercentage: e.target.value })}
                className="rounded-xl border border-border px-4 py-2.5 text-sm"
              />
            </Field>
            <Field label="Stock qty">
              <input
                type="number"
                min="0"
                placeholder="0"
                value={form.stockQuantity}
                onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                required
                className="rounded-xl border border-border px-4 py-2.5 text-sm"
              />
            </Field>
          </div>
          {editingId === "new" && (
            <Field label="Photos / videos (optional, you can add more later)">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => setNewMediaFiles(e.target.files ? Array.from(e.target.files) : [])}
                className="rounded-xl border border-dashed border-border px-4 py-2.5 text-sm"
              />
              {newMediaFiles.length > 0 && (
                <span className="text-xs text-muted">{newMediaFiles.length} file(s) selected</span>
              )}
            </Field>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditingId(null)} className="rounded-xl px-5 py-2.5 text-sm text-muted">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-6">
        {groupedItems.map(([categoryId, categoryItems]) => (
          <div key={categoryId} className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-muted">{categoryName(categoryId)}</h3>
            {categoryItems.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted">
                      {formatPaise(item.effectivePriceInPaise)}
                      {item.discountPercentage > 0 && (
                        <span className="ml-1 line-through">{formatPaise(item.priceInPaise)}</span>
                      )}
                      {" · "}Stock: {item.stockQuantity}
                    </p>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <button type="button" onClick={() => startEdit(item)} className="text-accent">
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(item.id)} className="text-red-600">
                      Delete
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.media.map((m) => (
                    <div key={m.id} className="relative h-16 w-16 overflow-hidden rounded-lg bg-zinc-100">
                      {m.type === "IMAGE" ? (
                        // eslint-disable-next-line @next/next/no-img-element -- arbitrary S3/CloudFront URL
                        <img src={m.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <video src={m.url} className="h-full w-full object-cover" muted />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(item.id, m.id)}
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/60 px-1.5 text-xs text-white"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted hover:border-accent">
                    {uploadingId === item.id ? "…" : "+ Media"}
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={(e) => e.target.files && e.target.files.length > 0 && handleMediaUpload(item.id, e.target.files)}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        ))}
        {visibleItems.length === 0 && <p className="text-sm text-muted">No items yet.</p>}
      </div>
    </div>
  );
}
