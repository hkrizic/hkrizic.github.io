"""Build documentation.html from the hand-written chapters below + data/knobs.json (all config knobs).

    python tools/build_docs.py            (run from alpaca/doc/)
Re-run extract_knobs.py first when ALPACA's configuration changes.
"""
import html
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
DOC = os.path.dirname(HERE)
K = json.load(open(os.path.join(DOC, "data", "knobs.json")))
VERSION = K["alpaca_version"]
KNOBS = K["knobs"]


def kid(path):
    return "k-" + re.sub(r"[._]", "-", path).lower()


def md_inline(s):
    s = re.sub(r":(mod|func|class|meth|attr|data|obj):`~?([^`]+)`", r"`\2`", s)   # Sphinx roles -> code
    s = html.escape(s)
    s = re.sub(r"``([^`]+)``", r"<code>\1</code>", s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s)
    return s


def fmt_default(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, str):
        return f'"{v}"'
    return json.dumps(v)


SECTION_INFO = {
    "run": ("Run", "Where the outputs go and which phases run. One output directory per model variant: re-running into a finished directory resumes it."),
    "data": ("Data", "Pixel scale, the model cutout and the likelihood mask. The image, noise map and PSF files themselves are set at the top of <code>run_alpaca.py</code>."),
    "mass": ("Mass model", "The main deflector (EPL+shear, multipoles, broken power law), the θ<sub>E</sub> prior for galaxy–galaxy lenses, and line-of-sight perturbers."),
    "light": ("Light model", "Lens light (Sérsic / MGE components, the full-frame lens-light refit), sky and point sources."),
    "stages": ("Stages", "The staged gradient descent: stage 1 shapelet multistart, the CorrField source warm-up, and the joint CorrField stage with the live PSF."),
    "psf": ("PSF", "How the PSF enters: <code>joint</code> (default: STARRED seed refined during the fit), <code>iterative</code> (rebuilt from the quasar images) or <code>fixed</code>."),
    "likelihood": ("Likelihood", "Time delays, astrometry, ray-shooting consistency and the noise model (including the PSF-error term <i>b</i>)."),
    "sampling": ("Sampling", "Posterior sampling after the MAP: NIFTy (geoVI and/or NUTS in latent space), NumPyro NUTS or Nautilus."),
    "plotting": ("Plotting", "Which diagnostic figures are written."),
    "blinding": ("Blinding", "TDCOSMO-style blinding of cosmological quantities."),
    "config_version": ("Version", "Layout version of the configuration file."),
}


def knob_html(e):
    path = e["key"]
    pre, leaf = (path.rsplit(".", 1) + [""])[:2] if "." in path else ("", path)
    if not leaf:
        pre, leaf = "", path
    desc = e.get("curated_html") or ("<p>" + md_inline(e.get("code_doc") or "") + "</p>")
    notes = "".join(f'<div class="note">▲ {md_inline(n)}</div>' for n in e.get("warnings") or [])
    rel = ""
    if e.get("related"):
        rel = '<div class="rel">related: ' + " ".join(f'<a href="#{kid(r)}">{html.escape(r)}</a>' for r in e["related"]) + "</div>"
    rt = f'<div class="rt">runtime: {html.escape(e["runtime"])}</div>' if e.get("runtime") else ""
    shipped = ""
    if "shipped" in e and e.get("shipped") != e.get("default"):
        shipped = f'<span class="def" title="value in the shipped config.json">config.json: {html.escape(fmt_default(e["shipped"]))}</span>'
    hay = html.escape((path + " " + re.sub("<[^>]+>", " ", desc) + " " + " ".join(e.get("warnings") or [])).lower())
    return (f'<div class="knob" id="{kid(path)}" data-level="{e["level"]}" data-hay="{hay}">'
            f'<div class="head"><code class="key"><span class="pre">{html.escape(pre + "." if pre else "")}</span>{html.escape(leaf)}</code>'
            f'<span class="type">{html.escape(str(e.get("type") or ""))}</span>'
            f'<span class="def" title="default">{html.escape(fmt_default(e.get("default")))}</span>{shipped}'
            f'<span class="lvl {e["level"]}">{e["level"]}</span></div>'
            f'<div class="desc">{desc}</div>{notes}{rel}{rt}</div>')


groups = {}
for e in KNOBS:
    sec = e["section"]
    sub = ".".join(e["key"].split(".")[:2]) if e["key"].count(".") >= 2 else sec
    groups.setdefault(sec, {}).setdefault(sub, []).append(e)
ORDER = ["run", "data", "mass", "light", "stages", "psf", "likelihood", "sampling", "plotting", "blinding", "config_version"]
ref_html, ref_nav = [], []
for sec in ORDER:
    if sec not in groups:
        continue
    title, intro = SECTION_INFO[sec]
    n = sum(len(v) for v in groups[sec].values())
    ref_html.append(f'<div class="knob-group" id="cfg-{sec}"><h3>{title} <span class="count">· <code>{sec}</code> · {n} knobs</span></h3><p>{intro}</p>')
    ref_nav.append(f'<a href="#cfg-{sec}"><span class="n">·</span>{title}</a>')
    for sub in sorted(groups[sec], key=lambda s: (s != sec, s)):
        for e in sorted(groups[sec][sub], key=lambda e: ({"essential": 0, "common": 1, "advanced": 2}[e["level"]], e["key"])):
            ref_html.append(knob_html(e))
    ref_html.append("</div>")

CHAPTERS = open(os.path.join(HERE, "chapters.html")).read()
counts = {lvl: sum(1 for e in KNOBS if e["level"] == lvl) for lvl in ("essential", "common", "advanced")}
page = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ALPACA documentation</title>
  <meta name="description" content="ALPACA {VERSION} documentation: installation, input files, the staged pipeline, outputs and every configuration option." />
  <link rel="stylesheet" href="../css/app.css" />
  <link rel="stylesheet" href="doc.css" />
  <link rel="icon" type="image/png" sizes="64x64" href="../assets/favicon-64.png" />
</head>
<body>
  <header class="topbar">
    <a class="brand" href="../"><img src="../assets/logo-mark.png" alt="ALPACA" /><span>Alpaca</span><span class="sub">documentation</span></a>
    <nav class="navlinks">
      <a class="btn" href="tutorial.html">Tutorial</a>
      <a class="btn primary" href="documentation.html">Documentation</a>
      <a class="btn" href="../app.html">Analysis</a>
      <a class="btn ghost" href="https://github.com/hkrizic/alpaca">GitHub</a>
    </nav>
  </header>
  <div class="doc-layout">
    <nav class="doc-nav">
      <h4>Guide</h4>
      <a href="#overview">Overview</a>
      <a href="#install">Installation</a>
      <a href="#ai">AI-assisted workflow</a>
      <a href="#inputs">Input files</a>
      <a href="#run-script">run_alpaca.py</a>
      <a href="#pipeline">The staged pipeline</a>
      <a href="#running">Running &amp; budgets</a>
      <a href="#outputs">Outputs</a>
      <a href="#judging">Judging a model</a>
      <a href="#blinding">Blinding</a>
      <a href="#troubleshooting">Troubleshooting</a>
      <h4>Configuration</h4>
      <a href="#config">How the config works</a>
      {''.join(ref_nav)}
    </nav>
    <main class="doc-main">
      <h1>Documentation</h1>
      <p class="sub">ALPACA {VERSION}. New to ALPACA? Start with the <a href="tutorial.html">tutorial</a>.</p>
      {CHAPTERS}
      <h2 id="config"><span class="step">Configuration reference</span>How the config works</h2>
      <p>A run is configured by one JSON file (<code>config.json</code>). Every run copies the configuration it used
        into <code>&lt;run&gt;/config/config.json</code>, so any run can be reproduced or modified. Data paths, image
        positions and time delays live in <code>run_alpaca.py</code> (see <a href="#run-script">above</a>); everything
        else is here. Options you leave out take the default shown below. The shipped <code>config.json</code> is a
        complete production configuration (HE0435−1223); where its value differs from the code default, both are
        shown.</p>
      <p>All {len(KNOBS)} options of ALPACA {VERSION}, generated from the code. Tags:
        <span class="lvl essential" style="font-size:9.5px;letter-spacing:.1em;padding:0 6px;background:#000;color:#fff">essential</span>
        ({counts['essential']}): you set or check these for every lens;
        <b>common</b> ({counts['common']}): budgets and the usual model variants;
        <b>advanced</b> ({counts['advanced']}): expert knobs, safe at their defaults.</p>
      <div class="knob-tools">
        <input id="knob-q" type="text" placeholder="Search options (e.g. theta_E, mask, psf_error_b, halving)" />
        <button class="chip on" data-level-btn="all">all</button>
        <button class="chip" data-level-btn="essential">essential</button>
        <button class="chip" data-level-btn="common">essential + common</button>
        <span id="knob-count" class="count"></span>
      </div>
      {''.join(ref_html)}
    </main>
  </div>
  <script src="doc.js"></script>
</body>
</html>
"""
open(os.path.join(DOC, "documentation.html"), "w").write(page)
print(f"documentation.html: {len(KNOBS)} knobs, {len(page) // 1024} kB")
