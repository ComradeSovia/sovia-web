import { Routes } from "@sovia/shared";
import { getDefaultSharedCopy } from "@sovia/shared/i18n/copy";
import Link from "next/link";

const copy = getDefaultSharedCopy();

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center text-center space-y-10">
      <div className="meta">
        {copy.notFound.status}
        <br />
        {copy.notFound.description}
      </div>

      <h1>
        {copy.notFound.title}
        <br />
        {copy.notFound.lineOne}
        <br />
        {copy.notFound.lineTwo}
      </h1>

      <div className="flex gap-6 pt-4">
        <Link href={Routes.Center.href} className="btn-primary">
          {copy.notFound.returnLabel}
        </Link>
      </div>

      <p className="meta pt-6">{copy.notFound.footer}</p>
    </section>
  );
}
