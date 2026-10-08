# Usage analytics (GitHub Pages activities)

The published activities send interaction events to **Google Analytics 4**
through one hand-maintained file, [`docs/assets/analytics.js`](docs/assets/analytics.js).
It is adapted from `docs/analytics.js` in
[neural-network-assignments-ui-explorer](https://github.com/ai-sandbox-ai-healthcare/neural-network-assignments-ui-explorer)
and sends to the **same GA4 property** (Measurement ID `G-T41SB4WQ70`).

- [`scripts/build_pages.py`](scripts/build_pages.py) adds
  `<script src="../assets/analytics.js" defer></script>` to every
  `docs/activities/<id>.html` page, and `assets/analytics.js` to `docs/index.html`.
  It never writes `analytics.js` itself.
- The local FastAPI app (`backend/`) never loads it, and the script only sends
  from `ai-sandbox-ai-healthcare.github.io`, so nothing is tracked when the
  activities run on your machine.
- The activity code (`app.js`) is not modified. `analytics.js` wraps
  `updateBadge()` (completion) and `a4Answer()` (the 6.2.3 quiz). Everything else
  comes from conventions every activity already follows:
  - a multiple-choice option gains class `sel-ok` / `sel-bad` when answered;
  - a typed answer box carries class `ok` / `bad` while its value is right / wrong;
  - a locked stage (`.ba-locked-section`) gains class `unlocked`.

  If one of these changes in `backend/static/index.html`, only that event stops; nothing breaks.

## Do I need a new Cloud project, BigQuery dataset or GA4 property?

**No.** The activities and the explorers are both served from
`ai-sandbox-ai-healthcare.github.io`, so they reuse what the explorers already set up:

| | Shared with the explorers |
|---|---|
| GA4 property / web stream | Same Measurement ID. A web stream covers the whole host, not one repo's path. |
| Cloud project + BigQuery export | Same project `nn-ui-analytics`, same dataset `analytics_557882182`, same daily `events_YYYYMMDD` tables. |
| `_ga` cookie | Same `user_pseudo_id` for one browser on both sites, so a student's activities and explorer use can be linked. |
| Opt-out (`?notrack=1`) | Stored in the site's localStorage, so it covers both sites. |
| Retention, Google signals, BigQuery link | Already configured on the property. |

Every event from the activities carries `site = activities` (and `activity`, e.g. `7.8`),
so the two sites never mix in queries. `analysis/activities_report.sql`
reads only `site = 'activities'`. The explorers' report reads only events that
carry `assignment`. In GA4's own reports, filter on the `site` dimension or on page path
`/neural-network-activities/`.

A separate property only makes sense if you ever need different retention,
consent or access for the two sites. Data volume is not a reason: a class is far
below the 1 million events/day export limit.

## Setup

1. **Nothing to create.** `CONFIG.measurementId` in `docs/assets/analytics.js`
   is already the explorers' ID, and `CONFIG.consent` matches theirs (`'none'`, no banner).
2. **Register the new custom definitions** (optional; only GA4's own reports need
   this, and only from the day they're registered. BigQuery receives every parameter regardless).
   GA4 → Admin → Custom definitions:
   - Event-scoped dimensions: `site`, `activity`, `question_id`, `option_text`, `correct`, `stage_id`.
     (`el_id`, `el_text`, `el_action`, `scroller` are already registered for the explorers and apply here too.)
   - Custom metrics: `ms_since_open` (milliseconds), `stages_unlocked` and `attempt` (standard).
     `active_ms` is already registered.
3. **Test locally** before pushing:
   `python -m http.server 8000 -d docs`, then open
   <http://localhost:8000/activities/7.8.html?ga_debug=1>. Every event is logged in
   the browser console as `[ga] <name> {…}` and shows up within seconds under
   GA4 Admin → DebugView. Debug and localhost events are filtered out of the report.
4. **Commit and push** `docs/` (plus `scripts/build_pages.py`, `analysis/`, this
   file). GitHub Pages redeploys. Open a live activity and check Reports → Realtime.
5. **Opt yourself out.** If you already opened an explorer page with `?notrack=1`
   in a browser, that browser is opted out here too. Otherwise open any live page
   once with `?notrack=1` in every browser and device you use. `?notrack=0` undoes it.
6. **Read the data** the next day (the export is daily) with
   [`analysis/activities_report.sql`](analysis/activities_report.sql).

## Events

Every event carries `site` (`activities`), `activity` (`0.0` … `11.GA`, or
`landing` for the list page), `page_load_id`, `t_ms` (ms since page load) and
`seq` (order within the page load). GA4 adds the timestamp, page URL, browser,
OS, device, country/city, referrer and its own `ga_session_id` / `user_pseudo_id`.

| Event | When | Extra parameters |
|---|---|---|
| `page_view` | page load (automatic) | — |
| `activity_open` | activity page load | `visit_number` (nth time this browser opened this activity), `completed_before` |
| `client_info` | page load | `viewport_w`, `viewport_h`, `pixel_ratio`, `touch`, `dark_mode`, `load_ms` |
| `activity_complete` | the "✓ Activity Complete" banner first appears in this page load | `panel`, `ms_since_open`, `active_ms`, `completed_before`, running totals `click_count`, `quiz_answers`, `quiz_correct`, `typed_answers`, `control_changes`, `stages_unlocked`, `stages_total` |
| `stage_unlocked` | a locked stage opens | `stage_id` (e.g. `es-s3`), `stages_unlocked`, `stages_total` |
| `quiz_answer` | a multiple-choice option is picked | `question_id` (e.g. `es-stop`), `option_index`, `option_text`, `correct`, `attempt` |
| `answer_input` | a typed answer box after a 1.2 s pause in typing or on leaving it (new values only); an 8.1 matching dropdown when Check is clicked | `el_id`, `value`, `correct`, `attempt` |
| `reflection_input` | a reflection box after a 3 s pause or on leaving it | `el_id`, `text_length`, `word_count` (+ `typed_text`, first 100 characters, if `CONFIG.sendReflectionText`) |
| `ui_change` | slider / dropdown / checkbox / radio released | `el_id`, `el_type`, `from_value`, `to_value`, `adjust_ms`, `correct` (dropdowns marked right/wrong) |
| `ui_click` | any button, link or clickable element | `el_id`, `el_tag`, `el_text`, `el_action` (its `onclick`, e.g. `esAnswer('stop',1)`), `link_url` |
| `rage_click` | 3 clicks on one element within 0.8 s | same as `ui_click` |
| `scroll_depth` | 25/50/75/100% of the page or a scrolling box, once each | `scroller`, `percent` |
| `text_copy` | student copies text from the page | `text_length` |
| `page_hidden` / `page_visible` | tab hidden / back | running totals `active_ms`, `completed`, `click_count`, `quiz_answers`, `quiz_correct`, `typed_answers`, `control_changes`, `max_scroll_pct`, `stages_unlocked`, `stages_total` / `away_ms` |
| `js_error` | uncaught error (max 10 per page) | `message`, `source`, `line` |

`correct` is `true` / `false`, or absent when the activity doesn't mark that input.

*Active* time counts 5-second slices in which the page was visible and the
student moved, clicked, typed or scrolled within the last 30 s (`CONFIG.idleMs`).
*Visible* time (computed in the report) is the time the page was open and on
screen, with any single gap over 30 min capped.

*Complete* means the activity's own completion check passed: the same check that
shows the "✓ Activity Complete" banner. A reload starts every activity from
scratch, so a completion always happens within one page load. `completed_before`
tells you if this browser had already completed it on an earlier visit.

A slider that completes an activity mid-drag sends `activity_complete` before
that slider's `ui_change`, because `ui_change` is sent when the slider is released.

## Getting the data out (BigQuery)

[`analysis/activities_report.sql`](analysis/activities_report.sql) answers the
common questions in one run:

1. Class summary per activity: users, % completed, median active / visible minutes, median minutes to complete.
2. Per user, per activity: visits, time, completed, minutes to complete, stages reached, wrong answers.
3. Per user, across activities: how many opened and completed, and which they left unfinished.
4. Stage funnel: where students stop in each activity.
5. Difficulty of every question and answer box: % right first try, % right eventually, most common wrong answer.
6. Every multiple-choice answer, in order.
7. Every typed answer tried, and reflection edits.
8. Every slider / dropdown / checkbox / radio change.
9. What gets clicked (on the landing page, which activities students open).

For anything else, start from this query, which gives one row per event with
the parameters as columns:

```sql
CREATE TEMP FUNCTION p(params ANY TYPE, k STRING) AS ((
  SELECT COALESCE(value.string_value, CAST(value.int_value AS STRING),
                  CAST(value.double_value AS STRING), CAST(value.float_value AS STRING))
  FROM UNNEST(params) WHERE key = k LIMIT 1));

SELECT
  TIMESTAMP_MICROS(event_timestamp)           AS ts,
  user_pseudo_id,                              -- one browser (GA cookie)
  p(event_params, 'page_load_id')             AS page_load_id,
  CAST(p(event_params, 'seq') AS INT64)       AS seq,
  event_name,
  p(event_params, 'activity')                 AS activity,
  p(event_params, 'question_id')              AS question_id,
  p(event_params, 'el_id')                    AS el_id,
  p(event_params, 'value')                    AS value,
  p(event_params, 'correct')                  AS correct
FROM `nn-ui-analytics.analytics_557882182.events_*`
WHERE _TABLE_SUFFIX BETWEEN '20261001' AND '20261231'
  AND p(event_params, 'site') = 'activities'
  AND p(event_params, 'debug_mode') IS NULL   -- drop your ?ga_debug=1 test visits
ORDER BY user_pseudo_id, page_load_id, seq;
```

## Privacy and research ethics

- The activities never ask for a name, NetID or email, and nothing that
  identifies a student is sent. Google Analytics' terms forbid personally
  identifiable information; don't add any to an event.
- Typed answers are numbers or short formulas and are sent as typed. Reflection
  boxes are free text, so they send only their length and word count unless
  `CONFIG.sendReflectionText = true`. Turn that on only if your IRB approval
  covers it, since students may write anything there.
- GA4 does not store IP addresses. The `_ga` cookie links one browser's visits
  across the activities and the explorers (same `user_pseudo_id`).
- **Consent banner.** `CONFIG.consent` works as in the explorers: `'opt-in'`
  (nothing loads from Google until Allow), `'notice'` (on, with an Opt-out button)
  or `'none'` (no banner, current setting). Keep the two sites on the same mode,
  as they share the stored choice.
- Analysing student interaction data for publication is human-subjects
  research. Check with the UArizona IRB (Human Subjects Protection Program)
  before collecting, and consider FERPA if the data is ever linked to grades or
  identities.
