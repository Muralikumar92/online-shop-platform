import Link from "next/link";
import { OwnerAuthProvider } from "@/contexts/OwnerAuthContext";
import OwnerHeader from "@/components/owner/OwnerHeader";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <OwnerAuthProvider>
      <div className="flex min-h-dvh w-full flex-col">
        <OwnerHeader />
        <main className="content-container w-full flex-1 px-4 py-6 sm:px-6">{children}</main>
        <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted">
          <Link href="/owner">Owner portal</Link>
        </footer>
      </div>
    </OwnerAuthProvider>
  );
}
