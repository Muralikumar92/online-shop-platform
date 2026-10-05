"use client";

import { useEffect, useState } from "react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import CustomerLoginForm from "@/components/CustomerLoginForm";
import { AddressForm } from "@/components/AddressSelector";
import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/http";
import type { CustomerAddress } from "@/lib/types";

function AddressBook() {
  const { token } = useCustomerAuth();
  const [addresses, setAddresses] = useState<CustomerAddress[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);

  function reload() {
    apiFetch<CustomerAddress[]>("/me/addresses", {}, token)
      .then(setAddresses)
      .catch(() => setError("Could not load your addresses."));
  }

  useEffect(reload, [token]);

  async function handleDelete(id: number) {
    if (!confirm("Delete this address?")) return;
    try {
      await apiFetch(`/me/addresses/${id}`, { method: "DELETE" }, token);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete this address.");
    }
  }

  async function handleSetDefault(id: number) {
    try {
      await apiFetch(`/me/addresses/${id}/default`, { method: "PUT" }, token);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update default address.");
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Saved addresses</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {addresses === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        addresses.map((addr) =>
          editingId === addr.id ? (
            <AddressForm
              key={addr.id}
              token={token}
              initial={addr}
              onSaved={() => {
                setEditingId(null);
                reload();
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={addr.id} className="rounded-2xl border border-border bg-surface p-4 text-sm">
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
              <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium">
                <button type="button" onClick={() => setEditingId(addr.id)} className="text-accent">
                  Edit
                </button>
                {!addr.isDefault && (
                  <button type="button" onClick={() => handleSetDefault(addr.id)} className="text-accent">
                    Set as default
                  </button>
                )}
                <button type="button" onClick={() => handleDelete(addr.id)} className="text-red-600">
                  Delete
                </button>
              </div>
            </div>
          )
        )
      )}

      {editingId === "new" ? (
        <AddressForm
          token={token}
          onSaved={() => {
            setEditingId(null);
            reload();
          }}
          onCancel={() => setEditingId(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingId("new")}
          className="rounded-xl border border-dashed border-border py-3 text-sm font-medium text-accent"
        >
          + Add a new address
        </button>
      )}
    </div>
  );
}

export default function AccountPage() {
  const { token, profile, loading, logout } = useCustomerAuth();

  if (loading) {
    return <p className="px-4 py-8 text-center text-muted">Loading…</p>;
  }

  if (!token || !profile) {
    return <CustomerLoginForm />;
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-8">
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl font-semibold text-accent-foreground">
          {(profile.fullName ?? profile.email).charAt(0).toUpperCase()}
        </div>
        <p className="font-semibold">{profile.fullName ?? "Welcome"}</p>
        <p className="text-sm text-muted">{profile.email}</p>
      </div>

      <AddressBook />

      <button
        type="button"
        onClick={logout}
        className="mt-6 w-full rounded-xl border border-border py-3 text-sm font-semibold text-muted"
      >
        Log out
      </button>
    </div>
  );
}
