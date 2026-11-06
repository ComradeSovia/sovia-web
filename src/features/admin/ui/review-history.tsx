import Link from "next/link";
import { requireAdminSession } from "../data/auth";
import {
  AUDIT_TYPES,
  type AuditType,
  listReviewAudit,
  undoMergeSchema,
} from "../data/review-audit";
import { undoReviewMergeAction } from "../review-audit-actions";
import { PlanningAdoptForm } from "./planning-adopt-form";

export function auditRecordHref(type: string, id: string) {
  if (type === "MCP") return "/admin/mcp";
  const area = {
    REQUEST: "requests",
    PLAN: "todo",
    DRAFT: "planning-drafts",
    COMMENT: "comment-reviews",
    WORK: "content",
  }[type];
  return area ? `/admin/${area}/${encodeURIComponent(id)}` : null;
}
function display(value: unknown) {
  return typeof value === "string"
    ? value
    : value == null
      ? "—"
      : JSON.stringify(value, null, 2);
}
function fields(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { value };
}

export async function ReviewHistory({
  type,
  id,
  page = 1,
  compact = false,
  eventId,
}: {
  type?: AuditType;
  id?: string;
  page?: number;
  compact?: boolean;
  eventId?: string;
}) {
  await requireAdminSession();
  const { events, total } = await listReviewAudit(type, id, page, eventId);
  const url = (next: number) =>
    `/admin/review/history?${new URLSearchParams({ ...(type ? { type } : {}), ...(id ? { id } : {}), ...(eventId ? { event: eventId } : {}), page: String(next) })}`;
  return (
    <section
      className="space-y-5 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5"
      aria-label="Review change history"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Review change history</h2>
        {compact ? (
          <Link href={url(1)} className="text-xs text-sky-300 underline">
            Open full history · {total}
          </Link>
        ) : (
          <span className="text-xs text-zinc-500">{total} events</span>
        )}
      </div>
      <p className="text-xs leading-6 text-zinc-500">
        History starts when audit tracking was enabled. Earlier operations are
        not reconstructed. Undo appends a new event and retains original
        recommendations, conversations and comment snapshots.
      </p>
      {!events.length ? (
        <p className="text-sm text-zinc-400">
          No tracked changes for this record yet.
        </p>
      ) : null}
      {events.slice(0, compact ? 5 : 30).map((event) => {
        const before = fields(event.before),
          after = fields(event.after);
        const changed = [
          ...new Set([...Object.keys(before), ...Object.keys(after)]),
        ].filter(
          (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
        );
        const undo = undoMergeSchema.safeParse(event.undo);
        const href = auditRecordHref(event.entityType, event.entityId);
        const related =
          event.relatedType && event.relatedId
            ? auditRecordHref(event.relatedType, event.relatedId)
            : null;
        const source =
          event.sourceType && event.sourceId
            ? auditRecordHref(event.sourceType, event.sourceId)
            : null;
        return (
          <article
            key={event.id}
            id={`event-${event.id}`}
            className="scroll-mt-8 space-y-3 border-t border-zinc-800 pt-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-300">
                  {event.action.replaceAll("_", " ").toLowerCase()}
                </p>
                <p className="mt-1 break-words font-medium">{event.title}</p>
              </div>
              <time
                dateTime={event.createdAt.toISOString()}
                className="text-xs text-zinc-500"
              >
                {event.createdAt.toISOString().replace("T", " ").slice(0, 19)}{" "}
                UTC
              </time>
            </div>
            <p className="break-words text-xs text-zinc-500">
              By {event.actor}
            </p>
            <div className="flex flex-wrap gap-4 text-xs text-sky-300">
              {event.operationId ? (
                <Link
                  href={`/admin/mcp/operations/${encodeURIComponent(event.operationId)}`}
                >
                  MCP operation receipt
                </Link>
              ) : null}
              {href ? <Link href={href}>Open record</Link> : null}
              {related ? (
                <Link href={related}>
                  Related {event.relatedType?.toLowerCase()}
                </Link>
              ) : null}
              {source ? (
                <Link href={source}>
                  {event.action === "MERGE_UNDONE" &&
                  event.sourceType === "REQUEST"
                    ? "New pending recommendation"
                    : event.sourceType === "DRAFT"
                      ? "Original conversation"
                      : event.sourceType === "WORK"
                        ? "Comment Work context"
                        : "Original source / record"}
                </Link>
              ) : null}
              {event.undoOfId ? (
                <Link
                  href={`/admin/review/history?event=${encodeURIComponent(event.undoOfId)}#event-${encodeURIComponent(event.undoOfId)}`}
                >
                  Original merge event
                </Link>
              ) : null}
            </div>
            {event.reason ? (
              <p className="whitespace-pre-wrap text-xs leading-6 text-zinc-300">
                Reason: {event.reason}
              </p>
            ) : null}
            <details className="rounded border border-zinc-800 p-3 text-xs">
              <summary className="cursor-pointer text-zinc-400">
                Changed: {changed.join(", ") || "association recorded"}
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full table-fixed text-left">
                  <thead>
                    <tr className="text-zinc-500">
                      <th className="w-1/5 py-2">Field</th>
                      <th>Before</th>
                      <th>After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changed.map((key) => (
                      <tr
                        key={key}
                        className="border-t border-zinc-800 align-top"
                      >
                        <th className="break-words py-3 pr-2 font-normal text-zinc-500">
                          {key}
                        </th>
                        <td className="p-3">
                          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words font-sans leading-6">
                            {display(before[key])}
                          </pre>
                        </td>
                        <td className="p-3">
                          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words font-sans leading-6">
                            {display(after[key])}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            {event.undoneBy ? (
              <p className="text-xs text-amber-200">
                This merge was undone. Both events remain in the history.
              </p>
            ) : undo.success &&
              ["REQUEST_MERGED", "COMMENT_MERGED"].includes(event.action) ? (
              <details className="rounded border border-amber-700/30 p-3">
                <summary className="cursor-pointer text-xs text-amber-200">
                  Undo incorrect merge
                </summary>
                <div className="mt-4 space-y-4">
                  <p className="text-xs leading-6 text-zinc-400">
                    {undo.data.kind === "request-plan"
                      ? "Remove only the association introduced by this merge. The plan, its later edits, Works and original source text are kept. A request with no remaining plan returns to pending review if it is still accepted."
                      : "Move this comment source to a new pending recommendation. Keep the existing recommendation and original comment unchanged. Reply approval is revoked for review; no reply is posted."}
                  </p>
                  <PlanningAdoptForm
                    action={undoReviewMergeAction}
                    confirmation="I checked the source and target and want to undo this incorrect merge. Keep the original records and record my reason."
                    buttonLabel="Undo this merge"
                  >
                    <input type="hidden" name="eventId" value={event.id} />
                    <label className="grid gap-2 text-xs text-zinc-400">
                      Reason
                      <textarea
                        name="reason"
                        required
                        maxLength={1000}
                        rows={2}
                        className="w-full rounded border border-zinc-700 bg-zinc-950 p-3 text-zinc-100"
                      />
                    </label>
                  </PlanningAdoptForm>
                </div>
              </details>
            ) : null}
          </article>
        );
      })}
      {!compact ? (
        <nav
          aria-label="History pages"
          className="flex justify-between text-xs text-sky-300"
        >
          {page > 1 ? <Link href={url(page - 1)}>Previous</Link> : <span />}
          {page * 30 < total ? <Link href={url(page + 1)}>Next</Link> : null}
        </nav>
      ) : null}
    </section>
  );
}

export { AUDIT_TYPES };
