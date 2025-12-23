import Link from "next/link";
import { Routes } from "@/constants/routes";

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center text-center space-y-10">
      <div className="meta">
        ОШИБКА УД
        <br />
        ДАННАЯ СТРАНИЦА НЕ УТВЕРЖДЕНА
      </div>

      <h1>
        404
        <br />
        Page Not Found
      </h1>

      <div className="flex gap-6 pt-4">
        <Link href={Routes.Center.href} className="btn-primary">
          Порядок не обсуждается.
        </Link>
      </div>

      <p className="meta pt-6">Order is not optional.</p>
    </section>
  );
}
