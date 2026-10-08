/*
 * Google Analytics 4 interaction tracking for the GitHub Pages activities.
 *
 * Hand-maintained -- NOT generated. scripts/build_pages.py adds
 * <script src="../assets/analytics.js" defer></script> to every
 * docs/activities/<id>.html page (assets/analytics.js on docs/index.html) but
 * never writes this file. The local FastAPI app (backend/) never loads it, so
 * nothing is tracked when the activities run on localhost.
 *
 * Adapted from docs/analytics.js in neural-network-assignments-ui-explorer,
 * and sends to the same GA4 property: both sites are served from
 * ai-sandbox-ai-healthcare.github.io, so they share the _ga cookie (one
 * user_pseudo_id per browser across both), the consent / opt-out choice and
 * the BigQuery export. Every event sent from here carries site=activities.
 *
 * app.js itself is untouched. `defer` runs this file after app.js and before
 * the page's DOMContentLoaded bootstrap, so it can wrap updateBadge()
 * (completion) and a4Answer() (the 6.2.3 quiz). Everything else is read from
 * conventions app.js already follows in every activity:
 *   - a multiple-choice option gains class sel-ok / sel-bad when answered,
 *   - a typed answer box has class ok / bad while its value is right / wrong,
 *   - a locked stage (.ba-locked-section) gains class unlocked.
 * The full event list lives in ANALYTICS.md at the repo root.
 *
 * Privacy: the activities never ask for a name or NetID. Reflection boxes
 * (textareas) send their length only, unless CONFIG.sendReflectionText is on.
 *
 * Debugging: add ?ga_debug=1 to a page URL to log every event to the console
 * and show it in GA4's DebugView (works on localhost too). ?notrack=1 opts
 * this browser out for good -- on the explorers too, since both sites share
 * localStorage; ?notrack=0 undoes it.
 */
(() => {
'use strict';

const CONFIG = {
  // GA4 -> Admin -> Data streams -> (your web stream) -> Measurement ID.
  // Same property and stream as the assignment explorers.
  measurementId: 'G-T41SB4WQ70',
  // Only these hostnames send data (any host does with ?ga_debug=1).
  hosts: ['ai-sandbox-ai-healthcare.github.io'],
  // 'opt-in' : nothing is sent until the student clicks Allow.
  // 'notice' : tracking is on by default; the banner offers an opt-out.
  // 'none'   : no banner -- only if your IRB / course policy allows it.
  consent: 'none',
  noticeText: 'These activities can record anonymous usage data (time spent, answers '
    + 'tried, slider settings and clicks) with Google Analytics cookies, to improve the '
    + 'course and for education research.',
  infoUrl: '',               // optional "Learn more" link, e.g. an IRB information sheet
  sendReflectionText: false, // true -> also send the first 100 characters of reflection answers
  idleMs: 30000,             // no input for this long -> time stops counting as active
};

const ID = CONFIG.measurementId;
const qs = new URLSearchParams(location.search);
const DEBUG = qs.has('ga_debug');
const KEY = 'nnui_ga_consent';   // same key as the explorers: one choice for the whole site
const m = location.pathname.match(/\/activities\/([^/]+)\.html$/);
const ACTIVITY = m ? decodeURIComponent(m[1]) : 'landing';
const PANEL = document.getElementById('tab-' + ACTIVITY);
const now = () => Math.round(performance.now());
const clean = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const warn = e => { if (DEBUG) console.warn('[ga] hook failed', e); };

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} },
};
if (qs.has('notrack')) store.set(KEY, qs.get('notrack') === '0' ? null : 'denied');

const live = /^G-[A-Z0-9]+$/.test(ID) && ID !== 'G-XXXXXXXXXX'
  && (DEBUG || CONFIG.hosts.includes(location.hostname));
if (!live && !DEBUG) return;
if (!live) console.info('[ga] measurementId not set -- events are logged here, not sent');

// 'granted' | 'denied' | null (undecided: events wait in `buffer`)
const stored = store.get(KEY);
let consent = stored === 'granted' || stored === 'denied' ? stored
  : CONFIG.consent === 'opt-in' ? null : 'granted';
const buffer = [];

// ============================================================
// gtag + consent
// ============================================================
let started = false;
function startGtag() {
  if (started || !live) return;
  started = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', ID, Object.assign({
    site: 'activities',
    activity: ACTIVITY,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  }, DEBUG ? { debug_mode: true } : {}));
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(s);
}

function decide(choice) {
  store.set(KEY, choice);
  consent = choice;
  if (choice === 'granted') {
    startGtag();
    if (started) buffer.forEach(([name, ev]) => gtag('event', name, ev));
  } else if (started) {
    window['ga-disable-' + ID] = true;
  }
  buffer.length = 0;
}

function banner() {
  const optIn = CONFIG.consent === 'opt-in';
  const box = document.createElement('div');
  box.id = 'ga-consent';
  box.setAttribute('role', 'region');
  box.setAttribute('aria-label', 'Usage data notice');
  box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483000;'
    + 'max-width:min(400px,calc(100vw - 32px));background:#1e293b;color:#f1f5f9;'
    + 'font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;'
    + 'padding:14px 16px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.3)';
  const btn = 'border:0;border-radius:6px;padding:6px 14px;font:inherit;font-weight:600;cursor:pointer;';
  box.innerHTML = '<div>' + CONFIG.noticeText
    + (CONFIG.infoUrl ? ' <a href="' + CONFIG.infoUrl + '" target="_blank" rel="noopener" style="color:#93c5fd">Learn more</a>' : '')
    + '</div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">'
    + '<button type="button" data-choice="denied" style="' + btn
    + 'background:transparent;color:#cbd5e1;box-shadow:inset 0 0 0 1px #475569">'
    + (optIn ? 'No thanks' : 'Opt out') + '</button>'
    + '<button type="button" data-choice="granted" style="' + btn + 'background:#6366f1;color:#fff">'
    + (optIn ? 'Allow' : 'OK') + '</button></div>';
  box.addEventListener('click', e => {
    const choice = e.target.getAttribute && e.target.getAttribute('data-choice');
    if (!choice) return;
    decide(choice);
    box.remove();
  });
  document.body.appendChild(box);
}

// ============================================================
// send()
// ============================================================
// Random per page load: groups one visit's events (seq orders them) in BigQuery.
const PAGE_LOAD_ID = Math.random().toString(36).slice(2, 10);
let seq = 0;
function send(name, params) {
  const ev = Object.assign({
    site: 'activities',
    activity: ACTIVITY,
    page_load_id: PAGE_LOAD_ID,
    t_ms: now(),          // ms since page load -- survives buffering
    seq: ++seq,
  }, params);
  // GA4 limits: 25 params per event, 100-character string values.
  for (const k of Object.keys(ev)) {
    const v = ev[k];
    if (v === undefined || v === null || v === '' || (typeof v === 'number' && !isFinite(v))) delete ev[k];
    else if (typeof v === 'number') ev[k] = Number.isInteger(v) ? v : +v.toFixed(4);
    else ev[k] = String(v).slice(0, 100);
  }
  if (DEBUG) { ev.debug_mode = true; console.debug('[ga]', name, ev); }
  if (!live || consent === 'denied') return;
  if (consent === null) { if (buffer.length < 200) buffer.push([name, ev]); return; }
  gtag('event', name, ev);
}

// Wrap a global function of app.js. `before(args)` runs first and its result
// is handed to `after(args, returnValue, ctx)`, which runs once the original
// has finished (awaited if it is async).
function hook(name, after, before) {
  const orig = window[name];
  if (typeof orig !== 'function') return;
  window[name] = function (...args) {
    let ctx;
    try { ctx = before && before(args); } catch (e) { warn(e); }
    const r = orig.apply(this, args);
    if (after) Promise.resolve(r).then(v => { try { after(args, v, ctx); } catch (e) { warn(e); } }, () => {});
    return r;
  };
}

// ============================================================
// Active time (visible + input within the last CONFIG.idleMs)
// ============================================================
let lastInput = now(), activeMs = 0;
['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(t =>
  document.addEventListener(t, () => { lastInput = now(); }, { capture: true, passive: true }));
setInterval(() => {
  if (document.hidden || now() - lastInput > CONFIG.idleMs) return;
  activeMs += 5000;
}, 5000);

// Running totals for this page load, sent with activity_complete and page_hidden.
const stats = { clicks: 0, quiz: 0, quizCorrect: 0, typed: 0, changes: 0 };
function stageCounts() {
  const root = PANEL || document;
  const total = root.querySelectorAll('.ba-locked-section').length;
  return total ? {
    stages_unlocked: root.querySelectorAll('.ba-locked-section.unlocked').length,
    stages_total: total,
  } : {};
}

// ============================================================
// Opening and completing the activity
// ============================================================
// localStorage remembers, per browser, how often each activity was opened and
// when it was first completed -- app.js itself starts every page load fresh.
const T0 = Date.now();
const doneKey = id => 'nnact_done_' + id;
const doneBefore = id => { const t = +store.get(doneKey(id)); return t > 0 && t < T0; };
const tracking = () => consent !== 'denied';
function activityOpen() {
  if (!PANEL) return;
  const visitsKey = 'nnact_visits_' + ACTIVITY;
  const visit = (+store.get(visitsKey) || 0) + 1;
  if (tracking()) store.set(visitsKey, String(visit));
  send('activity_open', { visit_number: visit, completed_before: doneBefore(ACTIVITY) });
}

// Every activity re-checks itself through updateBadge('<prefix>-completed', isComplete(...)).
const completed = new Set();
hook('updateBadge', ([id, isDone]) => {
  if (!isDone) return;
  const el = document.getElementById(id) || document.getElementById(String(id).replace('-completed', '-done'));
  const p = el && el.closest('.tab-panel');
  const panel = p ? p.id.replace(/^tab-/, '') : ACTIVITY;
  if (completed.has(panel)) return;
  completed.add(panel);
  flushAll();   // the typed answer that completed it goes first
  send('activity_complete', Object.assign({
    panel,
    ms_since_open: now(),
    active_ms: activeMs,
    completed_before: doneBefore(panel),
    click_count: stats.clicks,
    quiz_answers: stats.quiz,
    quiz_correct: stats.quizCorrect,
    typed_answers: stats.typed,
    control_changes: stats.changes,
  }, stageCounts()));
  if (tracking() && !store.get(doneKey(panel))) store.set(doneKey(panel), String(Date.now()));
});

// ============================================================
// Multiple-choice answers
// ============================================================
const quizTries = {};
function quizAnswer(question_id, option_index, option_text, correct) {
  quizTries[question_id] = (quizTries[question_id] || 0) + 1;
  stats.quiz++;
  if (correct) stats.quizCorrect++;
  send('quiz_answer', { question_id, option_index, option_text, correct, attempt: quizTries[question_id] });
}

// Options are ids like cv-q1-2 (question cv-q1, option 2). A few drop the
// dash (bn-wy2, or-f2, tl-q12); there the option is the last digit.
function optionAnswered(el, correct) {
  const id = el.id || '';
  const mm = id.match(/^(.*)-(\d+)$/) || id.match(/^(.+)(\d)$/);
  const question = mm ? mm[1] : id || (el.parentElement && el.parentElement.id) || 'unknown';
  quizAnswer(question, mm ? +mm[2] : undefined, clean(el.textContent, 100), correct);
}

// 6.2.3 marks its quiz with inline styles instead of sel-ok / sel-bad.
hook('a4Answer', ([i, choice], r, wasAnswered) => {
  if (wasAnswered) return;
  quizAnswer('a4-q' + i, choice === 'sigmoid' ? 0 : 1, choice, choice === a4QuizData[i].answer);
}, ([i]) => a4QuizAnswers[i] !== undefined);

// ============================================================
// Class changes: answered options and unlocked stages
// ============================================================
const classes = s => new Set(String(s || '').split(/\s+/).filter(Boolean));
const stagesSeen = new Set();
function classChanged(el, oldClass) {
  const before = classes(oldClass), after = classes(el.getAttribute('class'));
  const gained = c => after.has(c) && !before.has(c);
  if (gained('sel-ok') || gained('sel-bad')) optionAnswered(el, after.has('sel-ok'));
  // 8.1's matching dropdowns are marked ok / bad when the student clicks Check.
  if (el.tagName === 'SELECT' && (after.has('ok') || after.has('bad'))) sendAnswer(el);
  if (gained('unlocked') && el.id && !stagesSeen.has(el.id)) {
    stagesSeen.add(el.id);
    send('stage_unlocked', Object.assign({ stage_id: el.id }, stageCounts()));
  }
}

// Started after the page's own DOMContentLoaded bootstrap, so the initial
// render (stage 1 unlocking itself, ...) doesn't count as student actions.
let watching = false;
function watchClasses() {
  if (watching || !window.MutationObserver) return;
  watching = true;
  new MutationObserver(records => {
    // One element can change several times in a task: compare its first old value with the final one.
    const first = new Map();
    records.forEach(r => { if (!first.has(r.target)) first.set(r.target, r.oldValue); });
    first.forEach((old, el) => { try { classChanged(el, old); } catch (e) { warn(e); } });
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
}

// ============================================================
// Typed answers and reflections
// ============================================================
const ANSWER = 'input[type="text"], input[type="number"], input:not([type])';
const REFLECTION = 'textarea';
const FIELD = 'input[type="range"], input[type="checkbox"], input[type="radio"], select';
const status = el => (el.classList.contains('ok') ? true : el.classList.contains('bad') ? false : undefined);

// One event per pause in typing (or on leaving the box), and only for a new value.
const pending = new Map();
function later(el, ms, fn) {
  cancel(el);
  pending.set(el, { fn, timer: setTimeout(() => { pending.delete(el); fn(el); }, ms) });
}
function cancel(el) {
  const p = pending.get(el);
  if (p) { clearTimeout(p.timer); pending.delete(el); }
}
function flushAll() {
  pending.forEach(({ fn, timer }, el) => { clearTimeout(timer); fn(el); });
  pending.clear();
}

const lastSent = new WeakMap();
const answerTries = {};
function sendAnswer(el) {
  const v = el.value.trim();
  if (!v || lastSent.get(el) === v) return;
  lastSent.set(el, v);
  const id = el.id || el.name || 'unnamed';
  answerTries[id] = (answerTries[id] || 0) + 1;
  stats.typed++;
  send('answer_input', { el_id: id, value: v, correct: status(el), attempt: answerTries[id] });
}
function sendReflection(el) {
  const v = el.value.trim();
  if (lastSent.get(el) === v) return;
  lastSent.set(el, v);
  send('reflection_input', Object.assign({
    el_id: el.id, text_length: v.length, word_count: v ? v.split(/\s+/).length : 0,
  }, CONFIG.sendReflectionText ? { typed_text: v } : {}));
}

document.addEventListener('input', e => {
  const el = e.target;
  if (!el.matches) return;
  if (el.matches(ANSWER)) later(el, 1200, sendAnswer);
  else if (el.matches(REFLECTION)) later(el, 3000, sendReflection);
}, true);

// Sliders / selects / checkboxes / radios: one event per committed change,
// with the value before the drag or keypress and how long the adjustment took.
const fieldValue = el => (el.type === 'checkbox' ? String(el.checked) : el.value);
const armed = new WeakMap();
const arm = e => {
  const el = e.target;
  if (!el.matches || !el.matches(FIELD)) return;
  const from = el.type === 'radio'
    ? (document.querySelector('input[type="radio"][name="' + CSS.escape(el.name) + '"]:checked') || {}).value
    : fieldValue(el);
  armed.set(el, { v: from, t: now() });
};
document.addEventListener('pointerdown', arm, true);
document.addEventListener('keydown', arm, true);

// This listener runs before the element's own handlers, so anything that reads
// the ok / bad mark waits a tick for app.js to set it.
document.addEventListener('change', e => {
  const el = e.target;
  if (!el.matches) return;
  if (el.matches(ANSWER) || el.matches(REFLECTION)) {
    const fn = el.matches(ANSWER) ? sendAnswer : sendReflection;
    setTimeout(() => { cancel(el); fn(el); }, 0);
    return;
  }
  if (!el.matches(FIELD)) return;
  const a = armed.get(el);
  armed.delete(el);
  stats.changes++;
  const d = {
    el_id: el.id || el.name, el_type: el.type, from_value: a && a.v,
    to_value: fieldValue(el), adjust_ms: a ? now() - a.t : undefined,
  };
  setTimeout(() => send('ui_change', Object.assign(d, { correct: status(el) })), 0);
}, true);

// ============================================================
// Generic events -- any element, including ones added later
// ============================================================
const CLICKABLE = 'button, a[href], [onclick], [role="button"], summary, input[type="checkbox"], input[type="radio"]';

let lastClick = { el: null, t: 0, n: 0 };
document.addEventListener('click', e => {
  const el = e.target.closest && e.target.closest(CLICKABLE);
  if (!el || el.closest('#ga-consent')) return;
  if ((el.getAttribute('onclick') || '').trim() === 'event.stopPropagation()') return;
  const t = now();
  lastClick = el === lastClick.el && t - lastClick.t < 800
    ? { el, t, n: lastClick.n + 1 } : { el, t, n: 1 };
  const label = el.labels && el.labels[0];   // radios / checkboxes
  const d = {
    el_id: el.id || el.name,
    el_tag: el.tagName.toLowerCase(),
    el_text: clean(el.getAttribute('aria-label') || (label || el).textContent, 80),
    el_action: (el.getAttribute('onclick') || '').trim(),
    link_url: el.href,
  };
  stats.clicks++;
  send('ui_click', d);
  if (lastClick.n === 3) send('rage_click', d);
}, true);

// Scroll depth of the page and of any scrolling box inside it, once each.
const depthSent = {};
const scrollTimers = new Map();
let maxScroll = 0;
document.addEventListener('scroll', e => {
  const el = e.target === document ? document.scrollingElement : e.target;
  if (!el || !el.classList || scrollTimers.has(el)) return;
  scrollTimers.set(el, setTimeout(() => {
    scrollTimers.delete(el);
    const room = el.scrollHeight - el.clientHeight;
    if (room < 50) return;
    const pct = el.scrollTop / room * 100;
    const scroller = el === document.scrollingElement ? 'page' : el.id || el.classList[0] || el.tagName.toLowerCase();
    if (scroller === 'page') maxScroll = Math.max(maxScroll, Math.min(100, Math.round(pct)));
    const sent = depthSent[scroller] || (depthSent[scroller] = new Set());
    [25, 50, 75, 100].forEach(p => {
      if (pct >= p - 1 && !sent.has(p)) { sent.add(p); send('scroll_depth', { scroller, percent: p }); }
    });
  }, 250));
}, { capture: true, passive: true });

document.addEventListener('copy', () => send('text_copy', { text_length: String(getSelection()).length }));

// page_hidden doubles as the running summary of the visit: the last one sent
// is the final tally when the student closes the tab.
function summary() {
  const page = document.scrollingElement;
  const fits = page && page.scrollHeight - page.clientHeight < 50;
  return Object.assign({
    active_ms: activeMs,
    completed: completed.has(ACTIVITY),
    click_count: stats.clicks,
    quiz_answers: stats.quiz,
    quiz_correct: stats.quizCorrect,
    typed_answers: stats.typed,
    control_changes: stats.changes,
    max_scroll_pct: fits ? 100 : maxScroll,
  }, stageCounts());
}
let hiddenAt = null;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    hiddenAt = now();
    flushAll();
    send('page_hidden', summary());
  } else if (hiddenAt !== null) {
    send('page_visible', { away_ms: now() - hiddenAt });
  }
});

let errors = 0;
window.addEventListener('error', e => {
  if (errors++ < 10) send('js_error', {
    message: e.message, source: (e.filename || '').split('?')[0].split('/').pop() || 'page', line: e.lineno });
});
window.addEventListener('unhandledrejection', e => {
  if (errors++ < 10) send('js_error', { message: (e.reason && e.reason.message) || e.reason, source: 'promise' });
});

function clientInfo() {
  const nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
  send('client_info', {
    viewport_w: innerWidth, viewport_h: innerHeight, pixel_ratio: devicePixelRatio,
    touch: navigator.maxTouchPoints > 0,
    dark_mode: matchMedia('(prefers-color-scheme: dark)').matches,
    load_ms: nav && nav.loadEventEnd ? Math.round(nav.loadEventEnd) : undefined,
  });
}

// ============================================================
// Start
// ============================================================
if (consent === 'granted') startGtag();   // before the first send(), which calls gtag()
if (CONFIG.consent !== 'none' && !stored) banner();
activityOpen();
// This file is deferred, so the page's DOMContentLoaded bootstrap (registered
// earlier, runs first) hasn't fired yet; `load` is the fallback.
if (document.readyState === 'complete') watchClasses();
else {
  document.addEventListener('DOMContentLoaded', watchClasses);
  window.addEventListener('load', watchClasses);
}
if (document.readyState === 'complete') setTimeout(clientInfo, 0);
else window.addEventListener('load', () => setTimeout(clientInfo, 0));
})();
