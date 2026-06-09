import {
  deleteMusicWorkAction,
  logoutAdmin,
  saveMusicWorkAction,
} from "../actions";
import { hasAdminPassword, isAdminAuthenticated } from "../data/auth";
import {
  getAdminDatabaseStatus,
  listAdminMusicWorks,
} from "../data/music-admin";
import { AdminLogin } from "./login-form";

export async function AdminPage({ error }: { error?: string }) {
  if (!hasAdminPassword()) {
    return (
      <section className="space-y-6">
        <h1 className="text-5xl sm:text-6xl">Admin</h1>
        <div className="border-[3px] border-ink bg-paper p-5 shadow-[8px_8px_0_rgb(var(--red))]">
          <p>
            Set <strong>SOVIA_ADMIN_PASSWORD</strong> or{" "}
            <strong>ADMIN_PASSWORD</strong> in env to enable the admin panel.
          </p>
        </div>
      </section>
    );
  }

  if (!(await isAdminAuthenticated())) {
    return <AdminLogin />;
  }

  const [databaseStatus, works] = await Promise.all([
    getAdminDatabaseStatus(),
    listAdminMusicWorks(),
  ]);

  return (
    <section className="space-y-8">
      <div className="grid gap-5 border-[3px] border-ink bg-paper p-5 shadow-[10px_10px_0_rgb(var(--shadow))] md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="meta mb-3">Content Database</div>
          <h1 className="text-5xl sm:text-6xl">Admin</h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <form action={logoutAdmin}>
            <button className="btn-outline" type="submit">
              Logout
            </button>
          </form>
        </div>
      </div>

      {!databaseStatus.ok && (
        <div className="border-[3px] border-ink bg-paper p-5 shadow-[8px_8px_0_rgb(var(--red))]">
          <div className="meta mb-3">Database Error</div>
          <p>{databaseStatus.message}</p>
        </div>
      )}

      {error === "database" && databaseStatus.ok && (
        <div className="border-[3px] border-ink bg-paper p-5 shadow-[8px_8px_0_rgb(var(--red))]">
          <div className="meta mb-3">Database Error</div>
          <p>The last admin action could not be completed. Try again.</p>
        </div>
      )}

      {databaseStatus.ok ? (
        <div className="border-[3px] border-ink bg-paper p-4">
          <div className="meta">{databaseStatus.message}</div>
        </div>
      ) : null}

      {databaseStatus.ok && (
        <>
          <details open className="border-[3px] border-ink bg-paper p-5">
            <summary className="cursor-pointer text-2xl font-black uppercase">
              New Work
            </summary>
            <MusicWorkForm />
          </details>

          <div className="space-y-4">
            {works.map((work) => (
              <details
                key={work.path}
                className="border-[3px] border-ink bg-paper p-5 shadow-[6px_6px_0_rgb(var(--shadow))]"
              >
                <summary className="cursor-pointer">
                  <span className="font-black uppercase">{work.title}</span>
                  <span className="meta ml-3">{work.path}</span>
                </summary>
                <div className="mt-5 space-y-5">
                  <MusicWorkForm work={work} />
                  <form action={deleteMusicWorkAction}>
                    <input name="path" type="hidden" value={work.path} />
                    <button className="btn-outline" type="submit">
                      Delete DB Override
                    </button>
                  </form>
                </div>
              </details>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

type MusicWorkFormProps = {
  work?: {
    path: string;
    vid: string;
    title: string;
    original?: string | null;
    u2bId?: string | null;
    series?: string | null;
    description?: string | null;
    lyrics?: string | null;
  };
};

function MusicWorkForm({ work }: MusicWorkFormProps) {
  return (
    <form action={saveMusicWorkAction} className="mt-5 grid gap-4">
      {work && <input name="currentPath" type="hidden" value={work.path} />}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Path" name="path" required value={work?.path} />
        <Field label="Content ID" name="vid" value={work?.vid} />
        <Field label="Title" name="title" required value={work?.title} />
        <Field label="Original" name="original" value={work?.original} />
        <Field label="YouTube ID" name="u2bId" value={work?.u2bId} />
        <Field label="Series" name="series" value={work?.series} />
      </div>

      <TextArea
        label="Description"
        name="description"
        value={work?.description}
      />
      <TextArea label="Lyrics" name="lyrics" value={work?.lyrics} rows={14} />

      <div>
        <button className="btn-primary" type="submit">
          Save
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  value,
}: {
  label: string;
  name: string;
  required?: boolean;
  value?: string | null;
}) {
  return (
    <label className="grid gap-2 text-sm font-black uppercase tracking-[0.08em]">
      {label}
      <input
        className="border-[3px] border-ink bg-paper px-3 py-2 font-sans normal-case tracking-normal text-ink"
        defaultValue={value ?? ""}
        name={name}
        required={required}
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  rows = 8,
  value,
}: {
  label: string;
  name: string;
  rows?: number;
  value?: string | null;
}) {
  return (
    <label className="grid gap-2 text-sm font-black uppercase tracking-[0.08em]">
      {label}
      <textarea
        className="min-h-40 border-[3px] border-ink bg-paper px-3 py-2 font-mono text-sm normal-case tracking-normal text-ink"
        defaultValue={value ?? ""}
        name={name}
        rows={rows}
      />
    </label>
  );
}
