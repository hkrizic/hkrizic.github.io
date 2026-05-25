/* Stringendo — shared front-end logic.
   Works across all pages. Reads from data.js (loaded before this).
*/

/* ---------- HEADER / NAV ---------- */
const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
  siteNav.addEventListener("click", (event) => {
    if (event.target.matches("a")) {
      siteNav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });

  // active link by current page
  const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  siteNav.querySelectorAll("a").forEach((a) => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    if (href === here) a.classList.add("active");
  });
}

/* ---------- HERO IMAGE ROTATOR (home + page hero) ---------- */
document.querySelectorAll(".hero-media, .page-hero-media, .hero-big-media").forEach((media) => {
  const shots = media.querySelectorAll(".hero-shot");
  if (shots.length < 2) return;
  let active = 0;
  setInterval(() => {
    shots[active].classList.remove("active");
    active = (active + 1) % shots.length;
    shots[active].classList.add("active");
  }, 4600);
});

/* ============================================================
   BACKGROUND MOTION — star parallax, orb scroll drift, mouse drift,
   occasional shooting stars. Mobile-friendly, reduced-motion aware.
   ============================================================ */
(function setupBackgroundMotion() {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  const isMobile = matchMedia("(max-width: 720px)").matches;
  const body = document.body;
  const stage = document.querySelector(".stage");
  const orbs = stage ? Array.from(stage.querySelectorAll(".orb")) : [];

  // Per-orb scroll-parallax speed (alternating slow / fast)
  const orbSpeeds = [-0.18, 0.28, -0.32, 0.22, -0.24, 0.34];

  let scrollY = window.scrollY;
  let rafScheduled = false;

  function applyTransforms() {
    rafScheduled = false;
    const sy = scrollY;
    // Star layers — different speeds for parallax depth
    body.style.setProperty("--star-far-y",  `${(-sy * (isMobile ? 0.04 : 0.07)).toFixed(2)}px`);
    body.style.setProperty("--star-near-y", `${(-sy * (isMobile ? 0.12 : 0.20)).toFixed(2)}px`);

    // Orbs — scroll-driven vertical drift only (no mouse follow)
    orbs.forEach((orb, i) => {
      const speed = orbSpeeds[i % orbSpeeds.length];
      const y = (-sy * Math.abs(speed) * 0.5).toFixed(2);
      orb.style.setProperty("--orb-y", `${y}px`);
      orb.style.setProperty("--orb-x", "0px");
    });
  }

  function onScroll() {
    scrollY = window.scrollY;
    if (!rafScheduled) {
      rafScheduled = true;
      requestAnimationFrame(applyTransforms);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  // Initial paint
  applyTransforms();
})();

/* ---------- HERO PARALLAX (subtle) ---------- */
const heroBig = document.querySelector(".hero-big");
const heroBigMedia = document.querySelector(".hero-big-media");
if (heroBig && heroBigMedia && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const isMobile = matchMedia("(max-width: 720px)").matches;
  const factor = isMobile ? 0.18 : 0.32; // gentler on mobile
  let raf = null;
  const update = () => {
    raf = null;
    const rect = heroBig.getBoundingClientRect();
    // Only do work while hero is anywhere near the viewport
    if (rect.bottom < -100 || rect.top > window.innerHeight) return;
    const y = Math.max(0, -rect.top) * factor;
    heroBigMedia.style.transform = `translate3d(0, ${y}px, 0)`;
  };
  const onScroll = () => {
    if (raf == null) raf = requestAnimationFrame(update);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  update();
}

/* ---------- MEGA CONCERT CARD ---------- */
const megaTarget = document.querySelector("[data-mega-concert]");
if (megaTarget && typeof CONCERTS !== "undefined" && CONCERTS.next) {
  const c = CONCERTS.next;
  const flyerBtn = c.flyer
    ? `<a class="button orb-btn" data-orb="4" href="${c.flyer}" target="_blank" rel="noreferrer" download>Flyer (PDF) ↓</a>`
    : "";
  const onKonzertePage = (location.pathname.split("/").pop() || "").toLowerCase() === "konzerte.html";
  const allBtn = onKonzertePage
    ? ""
    : `<a class="button orb-btn" data-orb="2" href="konzerte.html">Alle Konzerte</a>`;
  megaTarget.innerHTML = `
    <a class="mega-image is-flyer" href="${c.flyer || "konzerte.html"}" target="${c.flyer ? "_blank" : "_self"}" rel="noreferrer" aria-label="Konzert-Flyer öffnen">
      <img src="${c.image}" alt="Flyer ${c.title}">
      <span class="mega-eyebrow">Nächstes Konzert</span>
    </a>
    <div class="mega-body">
      <div class="mega-date">
        <span class="mega-day">${c.date.day}</span>
        <span class="mega-mon">${c.date.month} ${c.date.year}</span>
      </div>
      <h2 class="mega-title">${c.title}</h2>
      <p class="mega-where">${c.where} · ${c.time}</p>
      <p class="mega-program">${c.program}</p>
      <div class="mega-actions">
        <a class="button orb-btn" data-orb="1" href="${c.tickets}" target="_blank" rel="noreferrer">Tickets buchen →</a>
        ${flyerBtn}
        ${allBtn}
      </div>
    </div>
  `;
}

/* ---------- ENSEMBLE TEASERS (home) ---------- */
const teaserGrid = document.querySelector("[data-ensemble-teasers]");
if (teaserGrid && typeof ENSEMBLES !== "undefined") {
  teaserGrid.innerHTML = ENSEMBLES.map((e) => `
    <a class="ensemble-teaser" href="ensembles.html#${e.id}">
      <span class="dot dot-${e.color}"></span>
      <h3>${e.name}</h3>
      <p class="teaser-tag">${e.tagline}</p>
      <p class="teaser-meta">${e.age}</p>
      <span class="teaser-arrow">→</span>
    </a>
  `).join("");
}

/* ---------- ENSEMBLE FULL BLOCKS (ensembles page) ---------- */
const ensembleHost = document.querySelector("[data-ensemble-blocks]");
if (ensembleHost && typeof ENSEMBLES !== "undefined") {
  // Quick lookup of color by ensemble id (for "also playing in" dots)
  const colorById = Object.fromEntries(ENSEMBLES.map((e) => [e.id, e.color]));
  const nameById  = Object.fromEntries(ENSEMBLES.map((e) => [e.id, e.name]));

  const renderPortrait = (m, i, e) => {
    const [name, img, meta] = m;
    const orbNo = (i % 6) + 1;
    const initial = (name || "?").trim().charAt(0).toUpperCase();
    const bioKey = meta && meta.bioKey
      ? meta.bioKey
      : (img ? img.split("/").pop().replace(/\.(jpe?g|png|webp)$/i, "") : name);
    const alsoIds = meta && meta.also
      ? (Array.isArray(meta.also) ? meta.also : [meta.also])
      : [];
    const allEnsembleIds = [e.id, ...alsoIds];
    const alsoDot = alsoIds
      .map((id) => {
        const c = colorById[id];
        const n = nameById[id];
        if (!c) return "";
        return `<span class="mos-dot mos-dot-cross dot-${c}" title="auch in ${n}"></span>`;
      })
      .join("");
    const inner = img
      ? `<img src="${img}" alt="${name} — ${e.name}" loading="lazy">`
      : "";
    const frameClass = img ? "portrait-frame" : `portrait-frame ph-orb-${orbNo}`;
    const phAttr = img ? "" : `data-initial="${initial}"`;
    const isAlumni = meta && meta.alumni;
    const articleCls = `portrait${isAlumni ? " is-alumnus" : ""}${img ? "" : " is-placeholder"}${alsoIds.length ? " is-dual" : ""}`;
    return `
      <article class="${articleCls}"
               role="button"
               tabindex="0"
               data-name="${name}"
               data-bio-key="${bioKey}"
               data-img="${img || ""}"
               data-color="${e.color}"
               data-primary-ensemble="${e.id}"
               data-also="${alsoIds.join(',')}"
               data-alumni="${isAlumni ? '1' : '0'}"
               data-orb="${orbNo}"
               aria-label="${name} — Profil öffnen">
        <div class="${frameClass}" ${phAttr}>${inner}</div>
        <span class="portrait-name">
          <span class="mos-dot dot-${e.color}"></span>${alsoDot}${name}
        </span>
      </article>
    `;
  };

  ensembleHost.innerHTML = ENSEMBLES.map((e, idx) => {
    const active = e.musicians.filter((m) => !(m[2] && m[2].alumni));
    const alumni = e.musicians.filter((m) =>  (m[2] && m[2].alumni));

    const activeHTML = active.map((m, i) => renderPortrait(m, i, e)).join("");
    const alumniHTML = alumni.length
      ? `
        <div class="alumni-divider">
          <p class="eyebrow">Alumni · ehemals ${e.name}</p>
        </div>
        <div class="portrait-grid is-alumni-grid">
          ${alumni.map((m, i) => renderPortrait(m, i, e)).join("")}
        </div>`
      : "";

    return `
      <section class="ensemble-block" id="${e.id}" data-color="${e.color}" style="--accent: var(--${e.color})">
        <div class="ensemble-header">
          <div class="ensemble-id">
            <span class="dot dot-${e.color}"></span>
            <span class="ensemble-num">0${idx + 1}</span>
          </div>
          <div class="ensemble-headline">
            <p class="eyebrow">${e.tagline}</p>
            <h2>${e.name}</h2>
            <p class="lead">${e.description}</p>
            <dl class="ensemble-facts">
              <div><dt>Alter</dt><dd>${e.age}</dd></div>
              <div><dt>Leitung</dt><dd>${e.leitung}</dd></div>
              <div><dt>Probe</dt><dd>${e.probe}</dd></div>
            </dl>
          </div>
        </div>
        ${e.bridge ? '<p class="bridge-note">Bridge-Ensemble — Mitglieder rotieren aus Stringendo14 & StringendoZürich.</p>' : ""}
        <div class="portrait-grid">${activeHTML}</div>
        ${alumniHTML}
      </section>
    `;
  }).join("");
}

/* ---------- KONZERTE PAGE: MEGA + ARCHIVE + SEASONAL ---------- */
const archiveHost = document.querySelector("[data-archive]");
if (archiveHost && typeof CONCERTS !== "undefined") {
  archiveHost.innerHTML = CONCERTS.archive.map((c) => `
    <article class="event-card">
      <img src="${c.image}" alt="${c.title}">
      <div>
        <span>${c.tag}</span>
        <h3>${c.title}</h3>
        <p class="sub">${c.subtitle}</p>
        <p class="meta">${c.date} · ${c.where}</p>
        <p>${c.detail}</p>
        ${c.flyer ? `<p style="margin-top:14px"><a class="button orb-btn small" data-orb="4" href="${c.flyer}" target="_blank" rel="noreferrer" download>Flyer (PDF) ↓</a></p>` : ""}
      </div>
    </article>
  `).join("");
}

const seasonalHost = document.querySelector("[data-seasonal]");
if (seasonalHost && typeof CONCERTS !== "undefined") {
  const dotColors = ["green", "blue", "red", "yellow", "violet", "green"];
  seasonalHost.innerHTML = CONCERTS.seasonal.map((c, i) => {
    const linkHTML = c.link
      ? `<a class="season-link" href="${c.link}" target="_blank" rel="noreferrer">${c.link.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗</a>`
      : "";
    return `
      <article class="season-card${c.link ? " has-link" : ""}">
        <span class="dot dot-${dotColors[i % dotColors.length]}"></span>
        <h3>${c.title}</h3>
        <p class="meta">${c.where}</p>
        <p>${c.note}</p>
        ${linkHTML}
      </article>
    `;
  }).join("");
}

/* ---------- MUSIK PAGE: ALBUMS + VIDEOS ---------- */
const albumList = document.querySelector("[data-albums]");
const soundcloud = document.querySelector("#soundcloud-player");
if (albumList && typeof ALBUMS !== "undefined") {
  albumList.innerHTML = ALBUMS.map((a, i) => `
    <button class="album ${i === 0 ? "active" : ""}" data-playlist="${a.id}">
      <span>${a.title}</span>
      <small>${a.sub}</small>
    </button>
  `).join("");
  const albums = albumList.querySelectorAll(".album");
  albums.forEach((album) => {
    album.addEventListener("click", () => {
      albums.forEach((item) => item.classList.remove("active"));
      album.classList.add("active");
      if (soundcloud) {
        soundcloud.src = `https://w.soundcloud.com/player/?visual=true&url=https%3A%2F%2Fapi.soundcloud.com%2Fplaylists%2F${album.dataset.playlist}&show_artwork=false&show_comments=false&show_playcount=false&show_user=false&color=000000`;
      }
    });
  });
}

/* Modern video grid — YouTube thumbnails with click-to-load embed.
   Two flavours: archive (compact) and featured (large). */
function renderVideoCards(host, list, opts = {}) {
  if (!host || !Array.isArray(list)) return;
  const isFeatured = !!opts.featured;
  // featured uses maxresdefault for nicer big visuals, with fallback
  const thumb = (id) => isFeatured
    ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`
    : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  host.innerHTML = list.map((v) => `
    <article class="video-card${isFeatured ? " is-featured" : ""}" data-yt="${v.id}">
      <button class="video-thumb" type="button" aria-label="Video ${v.title} abspielen">
        <img loading="lazy" src="${thumb(v.id)}"
             onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${v.id}/hqdefault.jpg'"
             alt="${v.title}">
        <span class="video-play">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path fill="currentColor" d="M8 5v14l11-7z"/>
          </svg>
        </span>
      </button>
      <div class="video-meta">
        <h3>${v.title}</h3>
        <p>${v.sub}</p>
      </div>
    </article>
  `).join("");

  host.querySelectorAll(".video-card").forEach((card) => {
    const btn = card.querySelector(".video-thumb");
    btn.addEventListener("click", () => {
      const id = card.dataset.yt;
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
      iframe.title = card.querySelector("h3").textContent;
      iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
      iframe.setAttribute("allowfullscreen", "");
      iframe.loading = "lazy";
      btn.replaceWith(iframe);
      card.classList.add("is-playing");
    });
  });
}

const featuredHost = document.querySelector("[data-videos-featured]");
if (featuredHost && typeof VIDEOS_FEATURED !== "undefined") {
  renderVideoCards(featuredHost, VIDEOS_FEATURED, { featured: true });
}

const videoStrip = document.querySelector("[data-videos]");
if (videoStrip) {
  const archive = (typeof VIDEOS_ARCHIVE !== "undefined") ? VIDEOS_ARCHIVE : (typeof VIDEOS !== "undefined" ? VIDEOS : []);
  renderVideoCards(videoStrip, archive);
}

/* Spotify featured embed */
const spotifyHost = document.querySelector("[data-spotify-featured]");
if (spotifyHost && typeof SPOTIFY_FEATURED !== "undefined") {
  spotifyHost.innerHTML = SPOTIFY_FEATURED.map((a) => `
    <article class="spotify-card">
      <div class="spotify-embed">
        <iframe
          loading="lazy"
          src="https://open.spotify.com/embed/album/${a.id}?utm_source=generator&theme=0"
          width="100%"
          height="380"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          title="Spotify · ${a.title}"
          frameborder="0"></iframe>
      </div>
      <div class="spotify-meta">
        <p class="spotify-tag"><span class="spotify-dot"></span>Neu auf Spotify</p>
        <h3>${a.title}</h3>
        <p class="spotify-artist">${a.artist}</p>
        <p class="spotify-note">${a.note}</p>
        <p>
          <a class="button orb-btn" data-orb="5"
             href="https://open.spotify.com/album/${a.id}"
             target="_blank" rel="noreferrer">In Spotify öffnen ↗</a>
        </p>
      </div>
    </article>
  `).join("");
}

/* ---------- SUPPORT FORM (home) ---------- */
const supportForm = document.querySelector(".support-form");
if (supportForm) {
  supportForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const subject = encodeURIComponent("Mitgliedschaft Förderverein Stringendo");
    const body = encodeURIComponent(
      `Vorname: ${data.get("first-name") || ""}\n` +
      `Nachname: ${data.get("last-name") || ""}\n` +
      `E-Mail: ${data.get("email") || ""}\n` +
      `Beitragsart: ${data.get("membership") || ""}\n\n` +
      `${data.get("message") || ""}`
    );
    window.location.href = `mailto:kontakt@stringendo.ch?subject=${subject}&body=${body}`;
  });
}

/* ---------- SCROLL REVEAL ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add("in");
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
document.querySelectorAll(".reveal, .ensemble-block, .section-head").forEach((el) => io.observe(el));

/* ============================================================
   MUSICIAN MODAL — click portrait → playful intro card
   ============================================================ */
(function setupMusicianModal() {
  if (!document.querySelector(".portrait-grid")) return;

  // Build modal eagerly so the compositor layer is warm before the first click.
  let modal, modalDialog, modalClose, lastFocus;
  let built = false;

  const buildModal = () => {
    if (built) return;
    built = true;
    modal = document.createElement("div");
    modal.className = "musician-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "mm-name");
    modal.hidden = true;
    modal.innerHTML = `
      <div class="mm-backdrop" data-close></div>
      <article class="mm-card" role="document">
        <button class="mm-close" type="button" aria-label="Schliessen" data-close>×</button>
        <div class="mm-photo">
          <div class="mm-photo-frame">
            <img id="mm-img" alt="" />
            <span class="mm-photo-glow"></span>
          </div>
        </div>
        <div class="mm-body">
          <p class="mm-eyebrow" id="mm-ensemble"></p>
          <h2 class="mm-name" id="mm-name"></h2>
          <p class="mm-status" id="mm-status"></p>
          <blockquote class="mm-quote" id="mm-quote"></blockquote>
        </div>
      </article>
    `;
    document.body.appendChild(modal);
    modalDialog = modal.querySelector(".mm-card");
    modalClose = modal.querySelector(".mm-close");

    // Close handlers
    modal.addEventListener("click", (ev) => {
      if (ev.target.hasAttribute("data-close")) closeModal();
    });
    document.addEventListener("keydown", (ev) => {
      if (!modal.hidden && ev.key === "Escape") closeModal();
    });
  };

  const ensembleNameById = (typeof ENSEMBLES !== "undefined")
    ? Object.fromEntries(ENSEMBLES.map((e) => [e.id, e.name]))
    : {};

  // Build immediately so the first open is as smooth as subsequent ones.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildModal);
  } else {
    buildModal();
  }

  const openModal = (portrait) => {
    if (!modal) buildModal();
    const name = portrait.dataset.name;
    const bioKey = portrait.dataset.bioKey || name;
    const img = portrait.dataset.img;
    const color = portrait.dataset.color;
    const primary = portrait.dataset.primaryEnsemble;
    const also = (portrait.dataset.also || "").split(",").filter(Boolean);
    const alumni = portrait.dataset.alumni === "1";
    const orbNo = portrait.dataset.orb || "1";

    const bio = (typeof BIOS !== "undefined") ? (BIOS[bioKey] || BIOS[name]) : null;

    // Ensemble label: primary + (also)
    const ensembleNames = [primary, ...also].map((id) => ensembleNameById[id] || id);
    const ensembleLabel = (alumni ? "Alumni · ehemals " : "")
      + ensembleNames.join(" & ");

    // Photo
    const imgEl = modal.querySelector("#mm-img");
    const frameEl = modal.querySelector(".mm-photo-frame");
    if (img) {
      imgEl.src = img;
      imgEl.alt = name;
      imgEl.style.display = "";
      frameEl.classList.remove("is-placeholder");
      frameEl.style.backgroundImage = "";
    } else {
      imgEl.removeAttribute("src");
      imgEl.style.display = "none";
      frameEl.classList.add("is-placeholder");
      frameEl.dataset.initial = name.charAt(0).toUpperCase();
      frameEl.style.backgroundImage = `url('assets/brand/kreis_verlauf_${orbNo}.png')`;
    }

    // Drive all accent colours inside the card from this one CSS var
    modal.style.setProperty("--mm-color", `var(--${color})`);

    modal.querySelector("#mm-ensemble").textContent = ensembleLabel;
    modal.querySelector("#mm-name").textContent = name;
    modal.querySelector("#mm-status").textContent = alumni
      ? "Ehemaliges Mitglied · weiterhin Teil der Familie."
      : "";

    // Build a single quoted block: opening „, all paragraphs inside, closing "
    const quoteEl = modal.querySelector("#mm-quote");
    const parts = [];
    if (bio && bio.quote) parts.push(bio.quote);
    if (bio && bio.text) {
      const paras = Array.isArray(bio.text) ? bio.text : [bio.text];
      parts.push(...paras);
    }
    if (parts.length === 0) {
      // Placeholder, still quoted
      quoteEl.classList.add("is-placeholder");
      quoteEl.innerHTML = `<p>„Diese Vorstellung folgt bald.."</p>`;
    } else {
      quoteEl.classList.remove("is-placeholder");
      const paraHtml = parts.map((p, i) => {
        let text = p;
        if (i === 0) text = "„" + text;
        if (i === parts.length - 1) text = text + "“"; // German closing quote (right double quote)
        return `<p>${text}</p>`;
      }).join("");
      quoteEl.innerHTML = paraHtml;
    }

    // Show — set hidden=false, force a reflow so the transition fires from opacity 0
    lastFocus = document.activeElement;
    document.body.classList.add("mm-open");
    modal.hidden = false;
    // Force layout flush so the transition picks up properly
    void modal.offsetWidth;
    modal.classList.add("is-open");
    modalClose.focus();
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove("is-open");
    document.body.classList.remove("mm-open");
    // After the opacity transition, hide it completely so it doesn't sit
    // on top of the page intercepting clicks.
    setTimeout(() => { modal.hidden = true; }, 240);
    if (lastFocus && typeof lastFocus.focus === "function") {
      try { lastFocus.focus(); } catch (_) {}
    }
  };

  // Delegate clicks on portraits
  document.addEventListener("click", (ev) => {
    const p = ev.target.closest(".portrait[role='button']");
    if (!p) return;
    openModal(p);
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    const p = ev.target.closest(".portrait[role='button']");
    if (!p) return;
    ev.preventDefault();
    openModal(p);
  });
})();

/* ---------- STAGGER REVEAL FOR PORTRAITS ----------
   When an ensemble block enters the viewport, its portraits
   pop in one after another. Modern, minimalist, playful. */
const portraitIO = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const block = entry.target;
    block.querySelectorAll(".portrait").forEach((p, i) => {
      p.style.setProperty("--d", `${i * 60}ms`);
      // Slight randomization for organic feel
      const bobDelay = (i * 0.17) % 2.4;
      p.style.setProperty("animation-delay", `${bobDelay}s`);
      requestAnimationFrame(() => p.classList.add("in"));
    });
    portraitIO.unobserve(block);
  });
}, { threshold: 0.08, rootMargin: "0px 0px -80px 0px" });
document.querySelectorAll(".ensemble-block").forEach((block) => portraitIO.observe(block));
