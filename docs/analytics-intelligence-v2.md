# Analytics & Content Intelligence V2 — core and content strategy delivery

## Audit and implementation plan

The checked-out repository uses Next.js 16.1, React 19.2, strict TypeScript, Prisma 7.8/PostgreSQL, and Biome 2.2. Origin is `ComradeSovia/sovia-web`. This audit used the local checkout; it did not fetch or modify GitHub or query the live YouTube account.

Existing capabilities were retained: the authenticated Analytics frame, MCP OAuth endpoint, cron secret, Data API observations, rolling Analytics snapshots, publish-window snapshots, retention, traffic sources, Reach Reporting imports, and multilingual duplicate/version matching. No new scheduler or external analytics service was introduced.

Confirmed correctness problems in the previous implementation:

- Early windows were truncated to the requested end date but still stored under the nominal 24/72/168/672-hour identifier.
- The UI called all stored early windows completed and labeled the first windows as exact hours.
- Lifetime rows combined current Data API public counts with older Analytics watch time/subscriber metrics. Failed Analytics reads could produce fabricated zero metrics.
- UTC date slicing disagreed with YouTube's Pacific reporting calendar.
- Lifetime medians were used for performance diagnosis; a cohort with no matching peers fell back to all lifetime rows.
- Partial Reach coverage was attached to full Analytics windows; empty CSV CTR values became zero.
- The subscriber-per-1,000 calculation used gross gains despite the intended net conversion meaning.

Delivery sequence: fix data semantics → add daily cache and migrations → connect same-age diagnosis and trends → expose group strategy/geography using existing auth → offline formula and API failure tests.

## Delivered behavior

- `/admin/analytics`: daily 7/28/90/365-day ranges and up to 365-day custom ranges; immediately preceding equal-length comparison; absolute/percent changes; actual daily values; explicit missing-day and stale-cache status.
- Channel metrics: views, watch minutes, gained/lost/net subscriptions, API daily duration/percentage, catalog publication counts. Reach is explicitly a tracked-video subtotal, with impression-weighted CTR, rather than a purported channel total.
- Video contributions: gainers, decliners, per-period new releases versus back catalog, top-10 share, and a separate untracked residual. Incomplete periods disable decomposition. New releases are defined independently inside each comparison period, so the two deltas plus residual reconcile to channel change.
- `/admin/analytics/works/[id]` and its existing legacy detail route: completed publish-date 1/3/7/28-day selection; recent 10/20/50 peers; IP/series, source type, work type, metadata-language, explicit vocal-language-set, and similar-duration cohorts; an independent duration checkbox can also constrain any cohort; peer median, rank, difference from best, and net conversion. Target is excluded from peer baselines. Missing peers and small samples are explicit.
- Video diagnosis contains observed values, same-window peer baselines, metric sample counts, hypotheses, and limitations. Missing CTR cannot generate a packaging diagnosis. Detailed retention and traffic evidence is filtered to the identical video/date window.
- `/admin/analytics/compare`: 2–5-work curves for views, watch minutes, likes, or gained subscribers. X values are publish-calendar window lengths, not exact elapsed hours. No lifetime totals or invented missing points are plotted.
- `/admin/analytics/strategy`: normalized IP aliases with series separation; independent source/work-type/metadata-language/vocal-language/duration groups; medians, measured-work coverage, distributions, weighted CTR, same-age watch time/subscriptions, and separate recent-28-day views. Evergreen eligibility is transparent and age-gated. Candidate scoring combines existing multilingual duplicate checking with auditable historical rules described below.
- `/admin/analytics/audience`: cached country and top-250 city reports for adjacent 28-day periods; API city IDs remain IDs. Shares use a complete channel denominator. Missing locations remain unknown and city subscriber metrics remain unavailable.
- MCP v0.2.0: adds `analytics_channel_trends`, `analytics_content_strategy`, `analytics_audience_geography`; upgrades `analytics_compare_cohort` and `analysis_get_work_insight` to verified same-age evidence. Existing early results explicitly mark partial/unverified legacy rows. Version comparisons also include completed same-age windows. `analysis_score_song_candidate` exposes duplicate exclusion, component medians/weights/sample IDs, evidence coverage, formula and uncertainty; `analytics_compare_cohort` also supports vocal language, similar duration, and an independent duration filter. Content tools expose the new metadata and missing-field detection reports empty vocal languages/unknown duration.
- Sync history is appended to the existing sync table while the `primary` row continues to serve as the active lock/status. Optional failures retain all warning messages and produce `partial` status. Mandatory failures are recorded as errors.

## Data and deployment

Migrations (apply in order):

- `prisma/migrations/20261027000000_analytics_intelligence/migration.sql`
- `prisma/migrations/20261027010000_content_performance_metadata/migration.sql`

The second migration adds `MusicWorkContent.vocalLanguages` (text array, default empty = unknown) and nullable `durationSeconds`, with a positive-duration database constraint. Existing rows are not assigned guessed values.

It adds channel-day, tracked-video-day, and geography caches, adds source provenance to existing rolling snapshots, and allows unknown public likes/comments. Video-day keys are unique and cascade with the work. Existing Analytics rows are marked `legacy_mixed`; new reads deliberately exclude these unverified mixed-source rows until re-sync. Existing raw rows are not deleted by this migration.

Deployment order:

1. Back up the production database before release. The existing push-to-main workflow now publishes a `prod-migrate` image containing the pinned Prisma CLI/schema/migrations. `deploy.sh` runs `prisma migrate deploy` with the existing service environment/network before replacing the app; failed migrations keep the old app running.
2. Regenerate the client in the normal build (`pnpm exec prisma generate`). Offline generation was verified locally.
3. Run one authorized Analytics sync through the existing admin UI or cron endpoint, then inspect status and warnings. No live YouTube sync is triggered by deployment or verification.
4. Verify the routes above while signed in and signed out. Compare a new video's unavailable 28-day window with an older completed window; verify missing CTR yields no packaging inference.

Daily sync initializes up to 730 channel days and 90 tracked-video days; later runs refresh 14 days and backfill one additional 90-day slice per day. A publication-date-aware catalog fingerprint prevents treating newly registered videos as historical zeroes; duplicate YouTube assignments block attribution. Video-range replacement happens transactionally only after every page/batch succeeds. Request budgets are 50 for daily reports and 10 for geography, with sequential requests and a 30-second request timeout. Existing bounded early/retention/traffic sync limits remain in place. Failed reports are retried through the existing next sync, not a new background service.

Coverage expands gradually: a 365-day channel comparison can be available before 365-day per-video contribution coverage. Missing days stay unknown. Window completion is gated by the last actual channel day returned for the same metrics, rather than the requested API end date. Recent windows continue to refresh; older verified early windows can be reused.

## Vocal language, duration, and candidate rules

The Metadata editor uses the existing database-aware dirty/state fields for both new persisted values. Temporary candidate controls remain ordinary inputs and never write to PostgreSQL.

- Vocal codes: `ru, ja, zh, en, de, fr, ko, vi, uk, es, it, pl, pt`. Normalize case/region suffixes and deduplicate. Multiple explicit codes form a multilingual set; `mul` is multilingual with unspecified languages; `zxx` explicitly means no vocals. Neither `mul` nor `zxx` may be mixed with other codes. Empty is unknown. Vocal cohorts compare exact normalized sets; they never infer languages from subtitles or metadata and never match unknown to unknown.
- Duration is the linked video's length in positive integer seconds. Buckets are **<120**, **120–239**, **240–359**, **360–599**, and **>=600** seconds. Missing duration has an explicit Unknown group and cannot match a duration cohort/filter.
- Existing Data API batches request `contentDetails.duration` alongside public statistics; this adds no new batch requests. Valid ISO duration fills only unknown database durations. Manual values are preserved. Changing/removing the YouTube ID in the editor invalidates the old duration. No live API calls were made during implementation.
- Saves distinguish omitted properties from explicit clearing: omitted fields preserve database metadata; `[]` and `null` clear vocal languages and duration. Unrelated step saves preserve both fields. The Metadata clear action clears both. Repository mapping includes list/detail reads and draft/save copies.

Candidate inputs on the Strategy page: title/source title, original artist, IP/series, work type, vocal languages, intended duration, publish-date window, and explicit remake mode. The read-only MCP tool accepts the same inputs. External freshness/trend evidence remains Unknown.

Scoring rule version: **transparent-rules-v1**.

| Evidence component | Weight | Measured quantity |
| --- | ---: | --- |
| Same IP / series | 30% | Same-age median views |
| Same work type | 20% | Same-age median views |
| Same vocal-language set | 15% | Same-age median views |
| Same duration bucket | 10% | Same-age median views |
| Intersection of every supplied attribute | 25% | Median net subscribers per 1,000 views |

Every component and its same-window catalog reference need at least **5 measured works**. Its value is the midrank percentile of the cohort median in the measured reference population (ties occupy their midpoint). Only verified completed snapshots of the current linked video are eligible. Multiple catalog records for the same video do not inflate performance evidence. Net conversion excludes zero-view denominators, supports negative conversion, and never mixes public lifetime counts with Analytics subscribers.

Total score = sum(available component percentile × weight) / available weight. Require at least **50% evidence weight coverage**; otherwise the score remains unavailable. Missing components do not become zeros. Factor medians are marginal comparisons, not a joint causal model; conversion uses the intersection of supplied attributes. Compare scores only with comparable coverage, attributes, and window lengths.

Exact source/title matches are checked over the entire catalog, independently of the duplicate preview limit, with provided artist/IP disambiguation and IP alias normalization. They are excluded by default even if historical performance is strong. Explicit remake mode permits scoring and subtracts **5 points per distinct exact existing video/source record**, capped at **20**. Possible partial title matches show `review_partial_match`. A missing match is not proof of an unproduced work; catalog alias completeness still limits recall. This rule is not a prediction, trend estimate, or precise viewer-affinity model.

Additional manual verification after applying both migrations:

1. Save `ru, ja` and a duration in Metadata; reload and confirm they survive another editor-step save.
2. Clear either field, save/reload, and confirm it remains Unknown rather than retaining the old value. Confirm DB-state colors show modifications before save.
3. Switch video IDs and confirm old duration is invalidated. Run a normal authorized sync to fill unknown durations, preserving manually supplied ones.
4. Select vocal-language/duration cohorts on both detail routes; verify missing target fields return no matching peers, and optional duration filtering combines with IP/source/type cohorts.
5. Score an exact existing source with remake mode off/on; verify exclusion versus visible saturation penalty. Check partial matches, small/missing evidence, source samples, and no-match caveats through both UI and MCP.

Duration reference: [YouTube video contentDetails](https://developers.google.com/youtube/v3/docs/videos#contentDetails.duration).

## Verification

- `node --test scripts/analytics.test.mjs`: 32 tests covering Pacific/DST boundaries, inclusive equal periods, partial/legacy windows, missing versus zero, missing/duplicate days, weighted CTR, median/outlier behavior, net conversion, small cohorts, null-safe diagnosis, bounded pagination, API failures, CSV null/duplicate handling, catalog coverage keys, vocal-language normalization/sets, duration boundaries/ISO parsing, persistence clearing/omission, link-change invalidation, score coverage/weights/negative conversion, duplicate exclusion, partial-match review, and capped remake penalties.
- Prisma client generation succeeds offline using the installed CLI. No dependencies were installed. The pnpm shim attempted to download pnpm 11.1.3 and failed due to network restrictions; installed binaries were used instead.
- Biome checks cover the changed/new analytics, metadata, editor, routes, MCP and test files; `git diff --check` is clean. Full-repository Biome reports existing Canon/generated-content formatting issues; those files were left untouched.
- Next production build completes with exit code 0, including its TypeScript stage and static generation. Windows standalone tracing emits `EINVAL` copy warnings for generated `node:buffer` chunk filenames, and existing `metadataBase` warnings. Treat the Windows standalone output as requiring packaging verification; validate the normal Linux/Docker deployment before release.
- Sandbox-only standalone TypeScript runs reported Label/Radix and VRM dependency-type diagnostics; the normal-permission build passed its type stage. A separate normal-permission `tsc --noEmit` also passes with exit code 0.
- A dev server and browser session were not started. Live API response compatibility, production DB migration, and authorization/browser interaction checks require the deployed environment.

## Remaining phases and limitations

This is a core phased delivery, not completion of every item in the handover.

- Precise historical first 1/3/6 hours remain Not Available. Existing Data API observation deltas are not relabeled as exact post-publication counts. No interpolation is used.
- Vocal-language and canonical video-duration fields, groups, and cohorts are implemented above. Historical vocal languages still need explicit editorial entry; durations fill during normal sync or manual entry. Additional orthogonal character-song/ASMR/content-format tags remain future work. `CO` remains **Concept Original** and `R` remains **Reimagining**, matching the editor.
- Same-age comparisons can optionally control for duration bucket and vocal-language set, but still do not control for release era or catalog-selection bias. Duration buckets are approximate matching, not identical video lengths. Early backfill remains limited to the existing most recent 50 works.
- New/returning/unique/regular/casual viewers, subscribed-status analysis, official Studio export imports, and user-level cross-video paths are not implemented. They are never derived from views.
- Channel-wide Reach, aligned traffic-source change attribution, and views-from-impressions are unavailable in this delivery. Daily tracked Reach may have different coverage than channel totals; partial full-window Reach remains null.
- Evergreen output is an eligibility rule plus measured daily views, not a predicted lifetime-value model. Transparent candidate scoring and duplicate exclusion are implemented above; verified external trend evidence and automatic remake opportunity ranking remain future work. Duplicate matching preserves the existing catalog's alias coverage; no-match is not proof of an unproduced work.
- Stale/missing/partial/duplicate detection is included. A full reconciliation pipeline for cross-source discrepancies and administrator-imported aliases remains future work. Public Data API observations and Analytics totals are kept separate because their cutoffs differ.

Official API references: [report calendar](https://developers.google.com/youtube/analytics/dimensions), [supported channel/geography reports](https://developers.google.com/youtube/analytics/channel_reports), [data availability](https://developers.google.com/youtube/analytics/data_model), [Reach Reporting schema](https://developers.google.com/youtube/reporting/v1/reports/channel_reports), [replacement reports](https://developers.google.com/youtube/reporting/v1/reports/).
