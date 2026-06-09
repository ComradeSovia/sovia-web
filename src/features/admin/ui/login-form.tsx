import { loginAdmin } from "../actions";

export function AdminLogin() {
  return (
    <section className="mx-auto max-w-xl space-y-8">
      <div className="border-[3px] border-ink bg-paper p-5 shadow-[10px_10px_0_rgb(var(--shadow))]">
        <div className="meta mb-3">Restricted Console</div>
        <h1 className="text-5xl sm:text-6xl">Admin</h1>
      </div>

      <form action={loginAdmin} className="grid gap-5">
        <label className="grid gap-2 text-sm font-black uppercase tracking-[0.08em]">
          Password
          <input
            className="border-[3px] border-ink bg-paper px-4 py-3 text-ink shadow-[6px_6px_0_rgb(var(--red))]"
            name="password"
            type="password"
            required
          />
        </label>

        <button className="btn-primary" type="submit">
          Enter
        </button>
      </form>
    </section>
  );
}
