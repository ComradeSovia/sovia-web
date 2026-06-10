import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-black font-mono text-emerald-300">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(16,185,129,0.08)_1px,transparent_1px)] bg-[size:100%_2rem]" />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}
