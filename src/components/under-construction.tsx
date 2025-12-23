import Link from "next/link";
import { Routes } from "@/constants/routes";

export function UnderConstruction({ title }: { title: string }) {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center text-center space-y-10">
      <div className="meta">
        СТАТУС
        <br />
        СТРАНИЦА НАХОДИТСЯ В СТАДИИ СТРОИТЕЛЬСТВА
      </div>

      <h1>
        «{title.toLocaleUpperCase()}»
        <br />
        UNDER
        <br />
        CONSTRUCTION
      </h1>

      <div className="flex gap-6 pt-4">
        <Link href={Routes.Center.href} className="btn-primary">
          Return to Center
        </Link>
      </div>

      <p className="meta pt-6">Order is being established.</p>
    </section>
  );
}
