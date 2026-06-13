import { Routes } from "@sovia/shared";

export function HomeManifesto() {
  return (
    <div className="manifesto grid gap-8 md:grid-cols-[14rem_1fr]">
      <div className="space-y-4">
        <div className="inline-block bg-block px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-relief">
          About Our Department
        </div>
        <div className="bg-block p-5 text-5xl font-black leading-none text-relief">
          00
          <br />
          About
          <br />
          Sovia
        </div>
      </div>
      <div className="space-y-5">
        <p className="max-w-3xl text-base font-medium leading-relaxed">
          Sovia Rabocheva collects <strong>familiar songs</strong> and sends
          them through the <strong>machinery of another world</strong>. This is
          not replication, and not only comedy. This is{" "}
          <strong>reconstruction</strong>.
        </p>
        <a className="btn-primary" href={Routes.About.href}>
          About Sovia
        </a>
      </div>
    </div>
  );
}
