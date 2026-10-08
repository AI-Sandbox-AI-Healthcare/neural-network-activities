-- Activities usage report -- run in BigQuery (console.cloud.google.com -> BigQuery).
--
-- 1. The data source is `nn-ui-analytics.analytics_557882182` (in CREATE TEMP
--    TABLE ev, the only place it appears): the same GA4 export as the
--    assignment explorers. Only events sent with site = 'activities' are read.
-- 2. Set the date range just below.
-- 3. Paste the whole file into a new BigQuery query tab and Run. Each numbered
--    SELECT returns one table: in the Results panel, click "View results" next
--    to each statement. Save any of them with "Save results".
--
-- "User" = one browser (GA's user_pseudo_id), not a named student: the
-- activities never ask who the student is. The same browser has the same
-- user_pseudo_id in the explorers' events.
-- Test visits (?ga_debug=1 or localhost) are left out.
-- Event and parameter definitions: ANALYTICS.md.

DECLARE start_date STRING DEFAULT '20261001';   -- YYYYMMDD
DECLARE end_date   STRING DEFAULT '20261231';

CREATE TEMP FUNCTION p(params ANY TYPE, k STRING) AS ((
  SELECT COALESCE(value.string_value, CAST(value.int_value AS STRING),
                  CAST(value.double_value AS STRING), CAST(value.float_value AS STRING))
  FROM UNNEST(params) WHERE key = k LIMIT 1));

-- Sort key for activity ids in course order: 6.2.1 < 6.3 < 7.12 < 7.KD < 10.2.1 < 10.10
-- (pads every number to 3 digits: 10.2.1 -> 010.002.001; letters sort after numbers).
CREATE TEMP FUNCTION act_key(a STRING) AS (
  REGEXP_REPLACE(CONCAT('00', REGEXP_REPLACE(a, r'\.(\d)', r'.00\1')), r'\d*(\d{3})', r'\1'));

-- One row per event sent by docs/assets/analytics.js, parameters as columns.
CREATE TEMP TABLE ev AS
SELECT
  user_pseudo_id,
  p(event_params, 'page_load_id')                        AS visit,
  SAFE_CAST(p(event_params, 'seq') AS INT64)             AS seq,
  SAFE_CAST(p(event_params, 't_ms') AS INT64)            AS t_ms,
  TIMESTAMP_MICROS(event_timestamp)                      AS ts,
  event_name,
  p(event_params, 'activity')                            AS activity,
  -- clicks and controls
  p(event_params, 'el_id')                               AS el_id,
  p(event_params, 'el_text')                             AS el_text,
  p(event_params, 'el_action')                           AS el_action,
  p(event_params, 'from_value')                          AS from_value,
  p(event_params, 'to_value')                            AS to_value,
  SAFE_CAST(p(event_params, 'adjust_ms') AS INT64)       AS adjust_ms,
  -- answers
  p(event_params, 'question_id')                         AS question_id,
  SAFE_CAST(p(event_params, 'option_index') AS INT64)    AS option_index,
  p(event_params, 'option_text')                         AS option_text,
  p(event_params, 'value')                               AS value,
  p(event_params, 'correct')                             AS correct,   -- 'true' / 'false' / NULL (not marked)
  SAFE_CAST(p(event_params, 'attempt') AS INT64)         AS attempt,
  SAFE_CAST(p(event_params, 'text_length') AS INT64)     AS text_length,
  SAFE_CAST(p(event_params, 'word_count') AS INT64)      AS word_count,
  -- progress and time
  p(event_params, 'stage_id')                            AS stage_id,
  SAFE_CAST(p(event_params, 'stages_unlocked') AS INT64) AS stages_unlocked,
  SAFE_CAST(p(event_params, 'stages_total') AS INT64)    AS stages_total,
  SAFE_CAST(p(event_params, 'active_ms') AS INT64)       AS active_ms,
  SAFE_CAST(p(event_params, 'ms_since_open') AS INT64)   AS ms_since_open
FROM `nn-ui-analytics.analytics_557882182.events_*`
WHERE _TABLE_SUFFIX BETWEEN start_date AND end_date
  AND p(event_params, 'site') = 'activities'
  AND p(event_params, 'page_load_id') IS NOT NULL        -- our events, not GA's automatic ones
  AND p(event_params, 'debug_mode') IS NULL
  AND NOT REGEXP_CONTAINS(IFNULL(p(event_params, 'page_location'), ''),
                          r'ga_debug|//localhost|//127\.0\.0\.1');

-- Time from each event to the next one on the same page = time the page was
-- open and on screen. A gap that starts at page_hidden is time away (not
-- counted); other gaps are capped at 30 min so a tab left open overnight
-- doesn't count.
CREATE TEMP TABLE gaps AS
SELECT *,
  IF(event_name = 'page_hidden', 0,
     LEAST(LEAD(t_ms) OVER (PARTITION BY visit ORDER BY seq) - t_ms, 30 * 60 * 1000)) AS gap_ms
FROM ev;

-- One row per page load. active_ms, stages_* are running totals, so MAX is the
-- final value. A reload starts the activity from scratch, so completion always
-- happens within a single visit.
CREATE TEMP TABLE visits AS
SELECT
  user_pseudo_id, activity, visit,
  MIN(ts) AS started,
  IFNULL(SUM(gap_ms), 0) AS visible_ms,
  IFNULL(MAX(active_ms), 0) AS active_ms,
  LOGICAL_OR(event_name = 'activity_complete') AS completed,
  MIN(IF(event_name = 'activity_complete', ts, NULL)) AS completed_at,
  MIN(IF(event_name = 'activity_complete', ms_since_open, NULL)) AS ms_to_complete,
  MIN(IF(event_name = 'activity_complete', active_ms, NULL)) AS active_ms_to_complete,
  IFNULL(MAX(stages_unlocked), 0) AS stages_unlocked,
  MAX(stages_total) AS stages_total,
  COUNTIF(event_name = 'quiz_answer') AS quiz_answers,
  COUNTIF(event_name = 'quiz_answer' AND correct = 'false') AS quiz_wrong,
  COUNTIF(event_name = 'answer_input') AS typed_answers,
  COUNTIF(event_name = 'ui_change') AS control_changes
FROM gaps
GROUP BY user_pseudo_id, activity, visit;

-- 1. Class summary per activity: how many users opened it and completed it,
--    and typical time. Medians are over users (all their visits added up).
--    visible_minutes: page open and on screen (reading counts).
--    active_minutes:  moving / clicking / typing / scrolling within the last 30 s.
--    minutes_to_complete: from opening the page to the "Activity Complete" banner.
WITH per_user AS (
  SELECT activity, user_pseudo_id,
    SUM(visible_ms) / 60000 AS visible_min,
    SUM(active_ms) / 60000 AS active_min,
    LOGICAL_OR(completed) AS completed,
    MIN(ms_to_complete) / 60000 AS min_to_complete,
    SUM(quiz_wrong) AS quiz_wrong
  FROM visits
  WHERE activity != 'landing'
  GROUP BY activity, user_pseudo_id
)
SELECT
  activity,
  COUNT(*) AS users,
  COUNTIF(completed) AS completed,
  ROUND(100 * COUNTIF(completed) / COUNT(*), 1) AS pct_completed,
  ROUND(APPROX_QUANTILES(active_min, 2)[OFFSET(1)], 1) AS median_active_minutes,
  ROUND(APPROX_QUANTILES(visible_min, 2)[OFFSET(1)], 1) AS median_visible_minutes,
  ROUND(APPROX_QUANTILES(min_to_complete, 2)[OFFSET(1)], 1) AS median_minutes_to_complete,
  ROUND(AVG(quiz_wrong), 1) AS avg_wrong_quiz_answers
FROM per_user
GROUP BY activity
ORDER BY act_key(activity);

-- 2. Per user, per activity: time, completion and progress.
SELECT
  user_pseudo_id,
  activity,
  COUNT(*) AS visits,
  MIN(started) AS first_opened,
  ROUND(SUM(visible_ms) / 60000, 1) AS visible_minutes,
  ROUND(SUM(active_ms) / 60000, 1) AS active_minutes,
  LOGICAL_OR(completed) AS completed,
  MIN(completed_at) AS completed_at,
  ROUND(MIN(ms_to_complete) / 60000, 1) AS minutes_to_complete,
  ROUND(MIN(active_ms_to_complete) / 60000, 1) AS active_minutes_to_complete,
  MAX(stages_unlocked) AS stages_unlocked,
  MAX(stages_total) AS stages_total,
  SUM(quiz_answers) AS quiz_answers,
  SUM(quiz_wrong) AS quiz_wrong,
  SUM(typed_answers) AS typed_answers,
  SUM(control_changes) AS control_changes
FROM visits
WHERE activity != 'landing'
GROUP BY user_pseudo_id, activity
ORDER BY user_pseudo_id, act_key(activity);

-- 3. Per user, across all activities: how many they opened and completed, and
--    which ones they opened but never finished.
WITH ua AS (
  SELECT user_pseudo_id, activity,
    LOGICAL_OR(completed) AS completed,
    SUM(active_ms) AS active_ms,
    SUM(visible_ms) AS visible_ms,
    MIN(started) AS first_seen,
    MAX(started) AS last_seen
  FROM visits
  WHERE activity != 'landing'
  GROUP BY user_pseudo_id, activity
)
SELECT
  user_pseudo_id,
  COUNT(*) AS activities_opened,
  COUNTIF(completed) AS activities_completed,
  ROUND(SUM(active_ms) / 60000, 1) AS active_minutes,
  ROUND(SUM(visible_ms) / 60000, 1) AS visible_minutes,
  MIN(first_seen) AS first_seen,
  MAX(last_seen) AS last_seen,
  STRING_AGG(IF(completed, activity, NULL), ', ' ORDER BY act_key(activity)) AS completed_activities,
  STRING_AGG(IF(completed, NULL, activity), ', ' ORDER BY act_key(activity)) AS unfinished_activities
FROM ua
GROUP BY user_pseudo_id
ORDER BY activities_completed DESC, active_minutes DESC;

-- 4. Stage funnel: of the users who opened an activity, how many had at least
--    N of its locked stages unlocked -- where students stop. Activities
--    without locked stages (0.0, 6.2.2, 6.2.3, 6.3, 6.4) are left out.
WITH reach AS (
  SELECT activity, user_pseudo_id, MAX(stages_unlocked) AS reached
  FROM visits
  WHERE activity != 'landing'
  GROUP BY activity, user_pseudo_id
), totals AS (
  SELECT activity, MAX(stages_total) AS total
  FROM visits
  GROUP BY activity
  HAVING MAX(stages_total) > 0
)
SELECT
  r.activity,
  k AS stages_unlocked,
  t.total AS stages_total,
  COUNTIF(r.reached >= k) AS users,
  ROUND(100 * COUNTIF(r.reached >= k) / COUNT(*), 1) AS pct_of_users_who_opened
FROM reach AS r
JOIN totals AS t ON t.activity = r.activity
CROSS JOIN UNNEST(GENERATE_ARRAY(0, t.total)) AS k
GROUP BY r.activity, k, t.total
ORDER BY act_key(r.activity), k;

-- 5. Difficulty of every multiple-choice question (kind = quiz) and every typed
--    answer box / matching dropdown (kind = typed): how many users answered,
--    how many were right first time and eventually, and the most common wrong
--    answer. Percentages count only answers the activity marked right or wrong.
WITH answers AS (
  SELECT activity, user_pseudo_id, ts, seq, correct,
    IF(event_name = 'quiz_answer', 'quiz', 'typed') AS kind,
    IF(event_name = 'quiz_answer', question_id, el_id) AS item,
    IF(event_name = 'quiz_answer', option_text, value) AS answer
  FROM ev
  WHERE event_name IN ('quiz_answer', 'answer_input')
), per_user AS (
  SELECT activity, kind, item, user_pseudo_id,
    ARRAY_AGG(IFNULL(correct, 'unmarked') ORDER BY ts, seq LIMIT 1)[OFFSET(0)] AS first_correct,
    LOGICAL_OR(correct = 'true') AS ever_correct,
    LOGICAL_OR(correct IS NOT NULL) AS marked,
    COUNT(*) AS tries
  FROM answers
  GROUP BY activity, kind, item, user_pseudo_id
), wrong AS (
  SELECT activity, kind, item, answer,
    COUNT(DISTINCT user_pseudo_id) AS users,
    ROW_NUMBER() OVER (PARTITION BY activity, kind, item
                       ORDER BY COUNT(DISTINCT user_pseudo_id) DESC, answer) AS rk
  FROM answers
  WHERE correct = 'false'
  GROUP BY activity, kind, item, answer
)
SELECT
  u.activity,
  u.kind,
  u.item,
  COUNT(*) AS users,
  ROUND(100 * SAFE_DIVIDE(COUNTIF(u.first_correct = 'true'),
                          COUNTIF(u.first_correct IN ('true', 'false'))), 1) AS pct_right_first_try,
  ROUND(100 * SAFE_DIVIDE(COUNTIF(u.ever_correct), COUNTIF(u.marked)), 1) AS pct_eventually_right,
  ROUND(AVG(u.tries), 1) AS avg_tries,
  ANY_VALUE(w.answer) AS most_common_wrong_answer,
  ANY_VALUE(w.users) AS users_who_gave_it
FROM per_user AS u
LEFT JOIN wrong AS w
  ON w.activity = u.activity AND w.kind = u.kind AND w.item = u.item AND w.rk = 1
GROUP BY u.activity, u.kind, u.item
ORDER BY act_key(u.activity), u.kind, u.item;

-- 6. Every multiple-choice answer, in order. attempt = how many times that
--    student had answered that question in that visit.
SELECT
  user_pseudo_id, activity, ts, question_id, attempt, option_index, option_text, correct
FROM ev
WHERE event_name = 'quiz_answer'
ORDER BY user_pseudo_id, act_key(activity), ts, seq;

-- 7. Every typed answer tried (one row per new value, after a pause in typing)
--    and every reflection edit (length only, unless sendReflectionText is on).
SELECT
  user_pseudo_id, activity, ts, event_name, el_id AS field, attempt, value, correct,
  text_length, word_count
FROM ev
WHERE event_name IN ('answer_input', 'reflection_input')
ORDER BY user_pseudo_id, act_key(activity), ts, seq;

-- 8. Every slider / dropdown / checkbox / radio change, in order (one row per
--    release of the control, with the value before and after).
SELECT
  user_pseudo_id, activity, ts, el_id AS control, from_value, to_value, adjust_ms
FROM ev
WHERE event_name = 'ui_change'
ORDER BY user_pseudo_id, act_key(activity), ts, seq;

-- 9. What gets clicked: each button / link / clickable element, by how many
--    users and how often. el_action is the app.js call it makes. On the
--    landing page (activity = 'landing') this shows which activities students
--    open from the list.
SELECT
  activity, el_text, el_action,
  COUNT(DISTINCT user_pseudo_id) AS users,
  COUNT(*) AS clicks
FROM ev
WHERE event_name = 'ui_click'
GROUP BY activity, el_text, el_action
ORDER BY act_key(activity), users DESC, clicks DESC;
