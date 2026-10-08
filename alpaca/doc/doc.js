// ALPACA docs: copy buttons, figure lightbox, scroll-spy navigation, config-knob search.
"use strict";
document.querySelectorAll("pre").forEach((pre) => {
  const b = document.createElement("button");
  b.className = "copy"; b.textContent = "copy";
  b.onclick = () => { navigator.clipboard.writeText(pre.innerText.replace(/^copy\n?/, "")).then(() => { b.textContent = "copied"; setTimeout(() => (b.textContent = "copy"), 1400); }); };
  pre.appendChild(b);
});
document.querySelectorAll("figure img").forEach((img) => {
  img.addEventListener("click", () => {
    const lb = document.createElement("div"); lb.className = "lightbox";
    const big = document.createElement("img"); big.src = img.src; big.alt = img.alt;
    lb.appendChild(big); lb.onclick = () => lb.remove(); document.body.appendChild(lb);
  });
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll(".lightbox").forEach((x) => x.remove()); });
// scroll spy
const links = [...document.querySelectorAll(".doc-nav a[href^='#']")];
const targets = links.map((a) => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
if (targets.length) {
  const spy = () => {
    let cur = targets[0];
    for (const t of targets) if (t.getBoundingClientRect().top < 140) cur = t;
    links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + cur.id));
  };
  document.addEventListener("scroll", spy, { passive: true }); spy();
}
// config knob search + level filter
const q = document.getElementById("knob-q");
if (q) {
  const knobs = [...document.querySelectorAll(".knob")];
  const groups = [...document.querySelectorAll(".knob-group")];
  const count = document.getElementById("knob-count");
  let level = "all";
  const apply = () => {
    const s = q.value.trim().toLowerCase();
    let n = 0;
    knobs.forEach((k) => {
      const ok = (!s || k.dataset.hay.includes(s)) && (level === "all" || k.dataset.level === level || (level === "common" && k.dataset.level === "essential"));
      k.classList.toggle("hidden", !ok); if (ok) n++;
    });
    groups.forEach((g) => g.classList.toggle("hidden", !g.querySelector(".knob:not(.hidden)")));
    count.textContent = `${n} of ${knobs.length} knobs`;
    try { localStorage.setItem("alpaca-doc-level", level); } catch (e) { /* storage unavailable */ }
  };
  document.querySelectorAll("[data-level-btn]").forEach((b) => b.addEventListener("click", () => {
    level = b.dataset.levelBtn;
    document.querySelectorAll("[data-level-btn]").forEach((x) => x.classList.toggle("on", x === b)); apply();
  }));
  try { const saved = localStorage.getItem("alpaca-doc-level"); if (saved) document.querySelector(`[data-level-btn="${saved}"]`)?.click(); } catch (e) { /* storage unavailable */ }
  q.addEventListener("input", apply);
  if (location.hash.startsWith("#k-")) { q.value = ""; }
  apply();
}
