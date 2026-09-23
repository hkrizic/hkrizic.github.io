import { el, section, row, select, button, textInput } from "../ui/widgets.js";
import { runOf, runRow } from "./common.js";

export default {
  id: "gallery", title: "Plot gallery", icon: "▦", description: "Every PNG the pipeline produced, grouped by folder, with a lightbox; the summary PDF.", defaultSize: "l",
  available: (run) => run.pngs.length > 0 || run.pdfs.length > 0,
  create(ctx, state, panel) {
    Object.assign(state, { folder: state.folder || "", query: state.query || "" });
    const body = el("div", { class: "gallery" });
    panel.body.append(body);
    let lightbox = null;
    const openLightbox = async (run, list, idx) => {
      if (lightbox) lightbox.remove();
      const img = el("img");
      const cap = el("div", { class: "lb-cap" });
      const show = async (i) => { idx = (i + list.length) % list.length; img.src = await run.url(list[idx]); cap.textContent = `${list[idx]}  (${idx + 1}/${list.length})`; };
      lightbox = el("div", { class: "lightbox", onClick: (e) => { if (e.target === lightbox) lightbox.remove(); } },
        el("div", { class: "lb-inner" }, el("button", { class: "lb-nav", onClick: () => show(idx - 1) }, "‹"), img, el("button", { class: "lb-nav", onClick: () => show(idx + 1) }, "›")), cap,
        el("button", { class: "lb-close", onClick: () => lightbox.remove() }, "✕"));
      document.body.append(lightbox);
      const key = (e) => { if (!lightbox.isConnected) { window.removeEventListener("keydown", key); return; } if (e.key === "ArrowLeft") show(idx - 1); if (e.key === "ArrowRight") show(idx + 1); if (e.key === "Escape") lightbox.remove(); };
      window.addEventListener("keydown", key);
      show(idx);
    };
    const render = async () => {
      const run = runOf(ctx, state);
      body.innerHTML = "";
      const folders = [...new Set(run.pngs.map((p) => p.replace(/\/[^/]+$/, "")))].sort();
      const q = state.query.toLowerCase();
      const list = run.pngs.filter((p) => (!state.folder || p.startsWith(state.folder + "/")) && (!q || p.toLowerCase().includes(q)));
      if (state.folder === "__pdf__" || (!list.length && run.pdfs.length && !state.folder)) {
        for (const pdf of run.pdfs) {
          const url = await run.url(pdf);
          body.append(el("div", { class: "pdf-wrap" }, el("div", { class: "ctl-row" }, el("b", {}, pdf), button("Open in new tab", () => window.open(url, "_blank"), { small: true })), el("iframe", { src: url, class: "pdf" })));
        }
      }
      if (state.folder !== "__pdf__") {
        const grid = el("div", { class: "thumbs" });
        for (const [i, p] of list.entries()) {
          const img = el("img", { loading: "lazy", alt: p });
          run.url(p).then((u) => { img.src = u; });
          grid.append(el("figure", { onClick: () => openLightbox(run, list, i) }, img, el("figcaption", {}, p.replace(/^.*\//, ""), el("span", { class: "muted small" }, " " + p.replace(/\/[^/]+$/, "")))));
        }
        body.append(grid);
      }
      panel.setStatus(`${list.length} images · ${run.pdfs.length} pdf`);
      panel.settings.replaceChildren(
        runRow(ctx, state, render) || "",
        section("Filter",
          row("Folder", select([{ value: "", label: "all" }, ...folders.map((f) => ({ value: f, label: f })), ...(run.pdfs.length ? [{ value: "__pdf__", label: "summary PDF" }] : [])], state.folder, (v) => { state.folder = v; render(); })),
          row("Search", textInput(state.query, (v) => { state.query = v; render(); }, { placeholder: "name…", width: 140 })),
        ),
      );
    };
    render();
    return { destroy() { if (lightbox) lightbox.remove(); }, state: () => state, refresh: render };
  },
};
