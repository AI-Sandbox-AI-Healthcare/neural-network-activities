#!/usr/bin/env python3
"""
Builds the static, backend-free GitHub Pages site under docs/.

Reads the single big SPA (backend/static/index.html) and splits it into:
  - docs/assets/app.css   (shared styles, extracted verbatim)
  - docs/assets/app.js    (shared JS, extracted + trimmed of dead backend code
                            and cross-page session persistence)
  - docs/activities/<id>.html  (one standalone page per activity)
  - docs/index.html       (landing page linking to every activity)

Re-run this script whenever backend/static/index.html changes.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "backend" / "static" / "index.html"
DOCS = ROOT / "docs"

KATEX_LINKS = """<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>"""

# ── Activity metadata: (id, prefix-list unused here, title, sub, chapter, init-fn(s), module-group tab ids) ──
# module-group tab ids: normally just [id]; the 6.2.2 / 6.2.3 pair shares one JS module (initAct4)
# and must ship together so that module's init function finds all the elements it touches.
ACTIVITIES = [
    # (id, title, sub, chapter, [init_fns], [group_tab_ids])
    ("0.0",    "Neuron Explorer",            "Weighted sum + ReLU",                 "Prerequisite", ["initNeuron"],        ["0.0"]),
    ("6.1",    "Bias Absorption",            "Merge W and c",                       "Chapter 6",     ["initBias"],          ["6.1"]),
    ("6.2.1",  "Cross-Entropy",              "J(W) matrix view",                    "Chapter 6",     ["initCE"],            ["6.2.1"]),
    ("6.2.2",  "Sigmoid CE Cost",            "Cost curve explorer",                 "Chapter 6",     ["initAct4"],          ["6.2.2", "6.2.3"]),
    ("6.2.3",  "Sigmoid vs Softmax",         "Independent vs competing",            "Chapter 6",     ["initAct4"],          ["6.2.2", "6.2.3"]),
    ("6.3",    "Maxout Units",               "Simulate ReLU & |x|",                 "Chapter 6",     ["initMaxout"],        ["6.3"]),
    ("6.4",    "Linear Regions",             "Deep ReLU region count",              "Chapter 6",     ["initRegions"],       ["6.4"]),
    ("6.5.1",  "Comp. Graph",                "Build a GRU-like DAG",                "Chapter 6",     ["initCompGraph"],     ["6.5.1"]),
    ("6.5.2",  "Backprop Table",             "build_grad step-by-step",             "Chapter 6",     ["initBackprop"],      ["6.5.2"]),
    ("7.1",    "Reg. Race",                  "L1 vs L2 regularization",             "Chapter 7",     ["initRegRace"],       ["7.1"]),
    ("7.8",    "Early Stopping",             "When to stop training",               "Chapter 7",     ["initEarlyStop"],     ["7.8"]),
    ("7.12",   "Input Dropout",              "Beyond hidden layers",                "Chapter 7",     ["initDropout"],       ["7.12"]),
    ("7.KD",   "KD Regularizer",             "Taxonomy-aware reg.",                 "Chapter 7",     ["initTaxonomy"],      ["7.KD"]),
    ("8.1",    "Surrogate Loss",             "When loss isn't trainable",           "Chapter 8",     ["initSurrogateLoss"], ["8.1"]),
    ("8.2",    "Grad Norm",                  "Read the landscape",                  "Chapter 8",     ["initGradNorm"],      ["8.2"]),
    ("8.3",    "Momentum SGD",               "Velocity accumulation",               "Chapter 8",     ["initMomentum"],      ["8.3"]),
    ("8.4",    "Transfer Learn",             "Reuse pre-trained features",          "Chapter 8",     ["initTransferLearn"], ["8.4"]),
    ("8.5",    "Optimizer Race",             "SGD vs AdaGrad vs Adam",              "Chapter 8",     ["initOptRace"],       ["8.5"]),
    ("8.7.1",  "Batch Norm",                 "Control column means",                "Chapter 8",     ["initBatchNorm"],     ["8.7.1"]),
    ("9.1",    "Cross-Correlation",          "Slide kernel, fill output",           "Chapter 9",     ["initConv91"],        ["9.1"]),
    ("9.3",    "Adaptive Pooling",           "Fix output size for any input",       "Chapter 9",     ["initPool93"],        ["9.3"]),
    ("9.GC.1", "GCN Mechanics",              "Graph, A*, message passing",          "Chapter 9",     ["initGCMech"],        ["9.GC.1"]),
    ("9.GC.2", "Conv vs GCN",                "Can graph conv replace CNN?",         "Chapter 9",     ["initGCEq"],          ["9.GC.2"]),
    ("10.1.1", "Conv Sentiment",             "Window size & negation",              "Chapter 10",    ["initTextCNN"],       ["10.1.1"]),
    ("10.1.2", "RNN Forward",                "Step-by-step h(t) trace",             "Chapter 10",    ["initRNNFwd"],        ["10.1.2"]),
    ("10.2.1", "RNN Designer",               "Word → sequence",                     "Chapter 10",    ["initRNNDesign"],     ["10.2.1"]),
    ("10.2.2", "Tanh Saturation",            "Vanishing gradient in BPTT",          "Chapter 10",    ["initRNNTanh"],       ["10.2.2"]),
    ("10.3",   "Bi-RNN Equations",           "Forward, backward & output",          "Chapter 10",    ["initBiRNN"],         ["10.3"]),
    ("10.4",   "NER as Seq2Seq",             "Token class vs. generation",          "Chapter 10",    ["initNERSeq"],        ["10.4"]),
    ("10.6",   "Recursive NNs",              "Beyond language trees",               "Chapter 10",    ["initRecNets"],       ["10.6"]),
    ("10.7",   "Linear RNN Stability",       "Unroll & w vs u",                     "Chapter 10",    ["initLinRNN"],        ["10.7"]),
    ("10.10",  "GRU vs LSTM",                "Architecture search space",           "Chapter 10",    ["initGRUComp"],       ["10.10"]),
    ("10.TF",  "Transformer PE",             "Beyond sinusoids",                    "Chapter 10",    ["initTrfPos"],        ["10.TF"]),
    ("11.1",   "Cancer NLP",                 "Metrics for high-stakes tasks",       "Chapter 11",    ["initCancerNLP"],     ["11.1"]),
    ("11.3",   "Learning Curves",            "Bias vs. variance diagnosis",         "Chapter 11",    ["initLearnCurve"],    ["11.3"]),
    ("11.4",   "Hyperband",                  "Bracket search budget",               "Chapter 11",    ["initHyperband"],     ["11.4"]),
    ("11.LS",  "LIME for EEG",               "Neighborhood in time-series",         "Chapter 11",    ["initLIMEEEG"],       ["11.LS"]),
    ("11.GA",  "Gradient Attribution",       "Saliency vs LIME vs SHAP",            "Chapter 11",    ["initGradAttr"],      ["11.GA"]),
]

assert len(ACTIVITIES) == 38, len(ACTIVITIES)


def extract_balanced_div(text: str, start: int) -> str:
    """Given the index of a '<div' opening tag, return the full element
    (including matching closing </div>) by counting nested div tags."""
    depth = 0
    i = start
    tag_re = re.compile(r"<div\b|</div>")
    while True:
        m = tag_re.search(text, i)
        if not m:
            raise ValueError("unbalanced div starting at %d" % start)
        if m.group() == "<div":
            depth += 1
        else:
            depth -= 1
            if depth == 0:
                return text[start:m.end()]
        i = m.end()


def main():
    src = SRC.read_text(encoding="utf-8")

    # ---- shared CSS ----
    style_m = re.search(r"<style>\n(.*?)</style>", src, re.S)
    css = style_m.group(1)

    # ---- shared JS ----
    script_m = re.search(r"<script>\n(.*?)</script>\n</body>", src, re.S)
    js = script_m.group(1)

    # Remove the dead /api/submit function (no backend, no student data stored).
    submit_start = js.index("async function submitWork(module) {")
    submit_end_marker = "// ══════════════════════════════════════════════════\n//  INIT"
    submit_end = js.index(submit_end_marker, submit_start)
    js = js[:submit_start] + js[submit_end:]

    # Stop persisting completion badges across page loads: a reload should start fresh.
    js = js.replace(
        "  if (done) { try { sessionStorage.setItem('done_' + id, '1') } catch(e) {} }\n",
        "",
    )
    js = js.replace(
        "function restoreBadges() {\n"
        "  try {\n"
        "    document.querySelectorAll('.completed-badge').forEach(el => {\n"
        "      if (sessionStorage.getItem('done_' + el.id) === '1') updateBadge(el.id, true)\n"
        "    })\n"
        "  } catch(e) {}\n"
        "}\n\n",
        "",
    )

    # Remove the monolithic DOMContentLoaded bootstrap (called all 37 inits + hash
    # routing for the single-page app) and the hashchange listener. Each generated
    # per-activity page supplies its own tiny bootstrap instead.
    boot_start = js.index("document.addEventListener('DOMContentLoaded', () => {\n  initDoneBanners()")
    boot_end_marker = "window.addEventListener('hashchange', () => {\n  const id = window.location.hash.slice(1)\n  if (id && $('tab-' + id)) showTab(id)\n})\n"
    boot_end = js.index(boot_end_marker) + len(boot_end_marker)
    js = js[:boot_start] + js[boot_end:]

    DOCS.mkdir(exist_ok=True)
    (DOCS / "assets").mkdir(exist_ok=True)
    (DOCS / "activities").mkdir(exist_ok=True)
    (DOCS / "assets" / "app.css").write_text(css, encoding="utf-8")
    (DOCS / "assets" / "app.js").write_text(js, encoding="utf-8")
    (DOCS / ".nojekyll").write_text("", encoding="utf-8")

    # ---- extract every tab-panel fragment, keyed by activity id ----
    panels = {}
    for m in re.finditer(r'<div id="tab-([^"]+)" class="tab-panel[^"]*">', src):
        tab_id = m.group(1)
        panels[tab_id] = extract_balanced_div(src, m.start())

    missing = [a[0] for a in ACTIVITIES if a[0] not in panels]
    assert not missing, f"no HTML panel found for: {missing}"

    # ---- generate one page per activity ----
    for act_id, title, sub, chapter, init_fns, group_ids in ACTIVITIES:
        panel_html = "\n\n".join(panels[t] for t in group_ids)
        init_calls = "\n  ".join(f"{fn}()" for fn in init_fns)
        page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title} · Neural Networks Activities</title>
<link rel="stylesheet" href="../assets/app.css">
{KATEX_LINKS}
</head>
<body>
<header class="app-header">
  <div>
    <h1>{title}</h1>
    <p class="header-sub">ISTA 457 / INFO 557 · {sub}</p>
  </div>
  <a href="../index.html" class="btn btn-g" style="text-decoration:none">&larr; All Activities</a>
</header>
<div class="app-body">
<main class="app-main">

{panel_html}

</main>
</div>
<script src="../assets/app.js"></script>
<script>
document.addEventListener('DOMContentLoaded', () => {{
  initDoneBanners()
  {init_calls}
  showTab('{act_id}')
}})
</script>
</body>
</html>
"""
        safe_name = act_id + ".html"
        (DOCS / "activities" / safe_name).write_text(page, encoding="utf-8")

    # ---- landing page ----
    chapters = {}
    for act_id, title, sub, chapter, _, _ in ACTIVITIES:
        chapters.setdefault(chapter, []).append((act_id, title, sub))

    cards = []
    for chapter, items in chapters.items():
        cards.append(f'  <div class="chapter-label">{chapter}</div>')
        cards.append('  <div class="card-grid">')
        for act_id, title, sub in items:
            cards.append(
                f'    <a class="act-card" href="activities/{act_id}.html">'
                f'<div class="act-title">{act_id} · {title}</div>'
                f'<div class="act-sub">{sub}</div></a>'
            )
        cards.append('  </div>')
    cards_html = "\n".join(cards)

    landing_css = """
:root {
  --bg:#faf8f5; --surface:#ffffff; --surf2:#f5f0e8; --border:#e2d9cc;
  --text:#1a1210; --muted:#5c4a3a; --blue:#1d4ed8; --green:#15803d;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6}
.app-header{background:linear-gradient(135deg,#ede9e0,#f5f0e8);border-bottom:2px solid var(--border);padding:24px 32px}
.app-header h1{font-size:24px;font-weight:800;letter-spacing:-.5px;color:var(--text)}
.header-sub{color:var(--muted);font-size:13px;font-weight:500;margin-top:4px}
.app-main{max-width:1100px;margin:0 auto;padding:28px 24px 60px}
.chapter-label{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);opacity:.75;margin:26px 0 10px}
.chapter-label:first-child{margin-top:0}
.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
.act-card{position:relative;display:block;text-decoration:none;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 18px;transition:box-shadow .15s,border-color .15s}
.act-card:hover{border-color:var(--blue);box-shadow:0 2px 10px rgba(0,0,0,.06)}
.act-title{font-weight:700;font-size:14px;color:var(--text);line-height:1.35}
.act-sub{font-size:12px;color:var(--muted);font-weight:400;margin-top:4px;line-height:1.35}
"""

    landing = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Neural Networks - Activities · ISTA 457</title>
<style>{landing_css}</style>
</head>
<body>
<header class="app-header">
  <h1>Neural Networks — Activities</h1>
  <p class="header-sub">ISTA 457 / INFO 557 · click an activity to open it</p>
</header>
<main class="app-main">
{cards_html}
</main>
</body>
</html>
"""
    (DOCS / "index.html").write_text(landing, encoding="utf-8")

    print(f"Wrote {len(ACTIVITIES)} activity pages, docs/index.html, docs/assets/app.{{css,js}}")


if __name__ == "__main__":
    main()
