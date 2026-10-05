"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/http";
import type { CustomerAddress } from "@/lib/types";

interface AddressFormValues {
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  makeDefault: boolean;
}

const EMPTY_FORM: AddressFormValues = {
  label: "",
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  makeDefault: false,
};

export function AddressForm({
  token,
  initial,
  hideDefaultToggle = false,
  onSaved,
  onCancel,
}: {
  token: string | null;
  initial?: CustomerAddress;
  hideDefaultToggle?: boolean;
  onSaved: (address: CustomerAddress) => void;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<AddressFormValues>(
    initial
      ? {
          label: initial.label ?? "",
          fullName: initial.fullName,
          phone: initial.phone,
          addressLine1: initial.addressLine1,
          addressLine2: initial.addressLine2 ?? "",
          city: initial.city,
          state: initial.state,
          pincode: initial.pincode,
          makeDefault: initial.isDefault,
        }
      : EMPTY_FORM
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof AddressFormValues>(key: K, value: AddressFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const path = initial ? `/me/addresses/${initial.id}` : "/me/addresses";
      const saved = await apiFetch<CustomerAddress>(
        path,
        { method: initial ? "PUT" : "POST", body: JSON.stringify(values) },
        token
      );
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this address. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        Label (optional)
        <input
          type="text"
          placeholder="e.g. Home, Office"
          value={values.label}
          onChange={(e) => update("label", e.target.value)}
          className="rounded-xl border border-border px-4 py-2.5 text-sm text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        Full name
        <input
          type="text"
          value={values.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          required
          className="rounded-xl border border-border px-4 py-2.5 text-sm text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        Phone number
        <input
          type="tel"
          value={values.phone}
          onChange={(e) => update("phone", e.target.value)}
          required
          className="rounded-xl border border-border px-4 py-2.5 text-sm text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        Address line 1
        <input
          type="text"
          value={values.addressLine1}
          onChange={(e) => update("addressLine1", e.target.value)}
          required
          className="rounded-xl border border-border px-4 py-2.5 text-sm text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        Address line 2 (optional)
        <input
          type="text"
          value={values.addressLine2}
          onChange={(e) => update("addressLine2", e.target.value)}
          className="rounded-xl border border-border px-4 py-2.5 text-sm text-foreground"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          City
          <input
            type="text"
            value={values.city}
            onChange={(e) => update("city", e.target.value)}
            required
            className="rounded-xl border border-border px-4 py-2.5 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          State
          <input
            type="text"
            value={values.state}
            onChange={(e) => update("state", e.target.value)}
            required
            className="rounded-xl border border-border px-4 py-2.5 text-sm text-foreground"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        Pincode
        <input
          type="text"
          value={values.pincode}
          onChange={(e) => update("pincode", e.target.value)}
          required
          className="rounded-xl border border-border px-4 py-2.5 text-sm text-foreground"
        />
      </label>
      {!hideDefaultToggle && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={values.makeDefault} onChange={(e) => update("makeDefault", e.target.checked)} />
          Make this my default address
        </label>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save address"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function AddressSelector({
  token,
  addresses,
  selectedId,
  onSelect,
  onAddressesChange,
}: {
  token: string | null;
  addresses: CustomerAddress[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAddressesChange: (addresses: CustomerAddress[]) => void;
}) {
  const [adding, setAdding] = useState(addresses.length === 0);

  function handleSaved(address: CustomerAddress) {
    const exists = addresses.some((a) => a.id === address.id);
    const next = exists
      ? addresses.map((a) => (a.id === address.id ? address : address.isDefault ? { ...a, isDefault: false } : a))
      : [...(address.isDefault ? addresses.map((a) => ({ ...a, isDefault: false })) : addresses), address];
    onAddressesChange(next);
    onSelect(address.id);
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {addresses.map((addr) => (
        <label
          key={addr.id}
          className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm ${
            selectedId === addr.id ? "border-accent bg-accent/5" : "border-border bg-surface"
          }`}
        >
          <input
            type="radio"
            name="selectedAddress"
            className="mt-1"
            checked={selectedId === addr.id}
            onChange={() => onSelect(addr.id)}
          />
          <div className="flex-1">
            <p className="font-medium">
              {addr.label ? `${addr.label} · ` : ""}
              {addr.fullName}
              {addr.isDefault && (
                <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">Default</span>
              )}
            </p>
            <p className="text-muted">{addr.phone}</p>
            <p className="text-muted">
              {addr.addressLine1}
              {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}, {addr.city}, {addr.state} {addr.pincode}
            </p>
          </div>
        </label>
      ))}

      {adding ? (
        <AddressForm
          token={token}
          onSaved={handleSaved}
          onCancel={addresses.length > 0 ? () => setAdding(false) : undefined}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-xl border border-dashed border-border py-3 text-sm font-medium text-accent"
        >
          + Add a new address
        </button>
      )}
    </div>
  );
}
