/* Herbst in der Helferei '26 — interactions */
(function () {
  "use strict";

  document.documentElement.classList.add("js");
  /* Escape hatch for testing/crawlers: #noanim shows everything instantly */
  var noAnim = window.location.hash.indexOf("noanim") !== -1;

  /* ---------- Header: solid background after scroll ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile navigation ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".nav");
  var mobileNav = window.matchMedia("(max-width: 960px)");
  if (toggle && nav) {
    if (!nav.id) nav.id = "main-navigation";
    toggle.setAttribute("type", "button");
    toggle.setAttribute("aria-controls", nav.id);

    function setMenuOpen(open, returnFocus) {
      open = Boolean(open && mobileNav.matches);
      nav.classList.toggle("is-open", open);
      toggle.classList.toggle("is-open", open);
      header.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Menü schliessen" : "Menü öffnen");
      document.body.classList.toggle("nav-open", open);
      if (mobileNav.matches) nav.setAttribute("aria-hidden", open ? "false" : "true");
      else nav.removeAttribute("aria-hidden");

      if (!open) {
        nav.querySelectorAll(".nav-item.is-expanded").forEach(function (item) {
          item.classList.remove("is-expanded");
          var itemLink = item.querySelector(".nav-link");
          if (itemLink) itemLink.setAttribute("aria-expanded", "false");
        });
        if (returnFocus) toggle.focus();
      }
    }

    toggle.addEventListener("click", function () {
      setMenuOpen(!nav.classList.contains("is-open"), false);
    });

    nav.addEventListener("click", function (e) {
      var link = e.target.closest("a");
      if (!link || !mobileNav.matches) return;
      if (link.matches(".dropdown a") || !link.matches(".has-dropdown > .nav-link")) {
        setMenuOpen(false, false);
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setMenuOpen(false, true);
      }
    });

    var resetMenu = function () { setMenuOpen(false, false); };
    if (mobileNav.addEventListener) mobileNav.addEventListener("change", resetMenu);
    else mobileNav.addListener(resetMenu);

    setMenuOpen(false, false);
  }

  /* Mobile: expand submenu on tap instead of navigating */
  document.querySelectorAll(".nav-item.has-dropdown > a.nav-link").forEach(function (link) {
    link.setAttribute("aria-haspopup", "true");
    link.setAttribute("aria-expanded", "false");
    link.addEventListener("click", function (e) {
      if (mobileNav.matches) {
        e.preventDefault();
        var item = link.parentElement;
        var expanded = !item.classList.contains("is-expanded");
        nav.querySelectorAll(".nav-item.is-expanded").forEach(function (openItem) {
          if (openItem !== item) {
            openItem.classList.remove("is-expanded");
            var openLink = openItem.querySelector(".nav-link");
            if (openLink) openLink.setAttribute("aria-expanded", "false");
          }
        });
        item.classList.toggle("is-expanded", expanded);
        link.setAttribute("aria-expanded", expanded ? "true" : "false");
      }
    });
  });

  /* ---------- Countdown to festival opening ---------- */
  var cd = document.querySelector("[data-countdown]");
  if (cd) {
    var target = new Date(cd.getAttribute("data-countdown")).getTime();
    var els = {
      d: cd.querySelector("[data-cd-days]"),
      h: cd.querySelector("[data-cd-hours]"),
      m: cd.querySelector("[data-cd-mins]"),
      s: cd.querySelector("[data-cd-secs]")
    };
    var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
    function tick() {
      var diff = target - Date.now();
      if (diff < 0) diff = 0;
      var d = Math.floor(diff / 864e5);
      var h = Math.floor(diff / 36e5) % 24;
      var m = Math.floor(diff / 6e4) % 60;
      var s = Math.floor(diff / 1e3) % 60;
      if (els.d) els.d.textContent = d;
      if (els.h) els.h.textContent = pad(h);
      if (els.m) els.m.textContent = pad(m);
      if (els.s) els.s.textContent = pad(s);
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if (noAnim) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    revealEls = [];
  }
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Stagger children (grids) ---------- */
  document.querySelectorAll("[data-stagger]").forEach(function (grid) {
    Array.prototype.forEach.call(grid.children, function (child, i) {
      child.style.transitionDelay = Math.min(i * 90, 450) + "ms";
    });
  });

  /* ---------- Lightbox gallery ---------- */
  var galleryLinks = Array.prototype.slice.call(document.querySelectorAll(".gallery a"));
  var lightbox = document.querySelector(".lightbox");
  if (lightbox && galleryLinks.length) {
    var lbImg = lightbox.querySelector("img");
    var idx = 0;
    function show(i) {
      idx = (i + galleryLinks.length) % galleryLinks.length;
      lbImg.src = galleryLinks[idx].getAttribute("href");
      lightbox.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }
    function close() {
      lightbox.classList.remove("is-open");
      document.body.style.overflow = "";
    }
    galleryLinks.forEach(function (a, i) {
      a.addEventListener("click", function (e) { e.preventDefault(); show(i); });
    });
    lightbox.querySelector(".lb-close").addEventListener("click", close);
    lightbox.querySelector(".lb-prev").addEventListener("click", function () { show(idx - 1); });
    lightbox.querySelector(".lb-next").addEventListener("click", function () { show(idx + 1); });
    lightbox.addEventListener("click", function (e) { if (e.target === lightbox) close(); });
    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
  }

  /* ---------- Newsletter → mail client ---------- */
  document.querySelectorAll("form[data-newsletter]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = form.querySelector("input[type=email]").value.trim();
      if (!email) return;
      var subject = encodeURIComponent("Newsletter-Anmeldung");
      var body = encodeURIComponent("Guten Tag\n\nIch möchte mich für den Newsletter von Herbst in der Helferei anmelden.\n\nE-Mail: " + email + "\n\nFreundliche Grüsse");
      window.location.href = "mailto:info@herbst-helferei.ch?subject=" + subject + "&body=" + body;
      var note = form.querySelector(".form-note");
      if (note) note.textContent = "Ihr E-Mail-Programm öffnet sich – bitte Nachricht absenden.";
    });
  });

  /* ---------- Contact form → mail client ---------- */
  var contactForm = document.querySelector("form[data-contact]");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var get = function (name) {
        var el = contactForm.querySelector("[name=" + name + "]");
        return el ? el.value.trim() : "";
      };
      var subject = encodeURIComponent(get("subject") || "Kontaktanfrage über die Website");
      var body = encodeURIComponent(get("message") + "\n\n—\n" + get("name") + "\n" + get("email"));
      window.location.href = "mailto:info@herbst-helferei.ch?subject=" + subject + "&body=" + body;
      var note = contactForm.querySelector(".form-note");
      if (note) note.textContent = "Ihr E-Mail-Programm öffnet sich – bitte Nachricht absenden.";
    });
  }

  /* ---------- Mobile sticky ticket bar ---------- */
  var ticketBar = document.querySelector(".mobile-ticket-bar");
  if (ticketBar) {
    ticketBar.classList.add("is-active");
    document.body.classList.add("has-ticket-bar");
  }
})();

/* ---------- Welcome popup (homepage) ---------- */
(function () {
  var popup = document.getElementById("welcome-popup");
  if (!popup) return;

  function closePopup() {
    popup.setAttribute("hidden", "");
    document.body.style.overflow = "";
  }

  /* Shown on every visit of the landing page */
  setTimeout(function () {
    popup.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
    var panel = popup.querySelector(".welcome-popup__panel");
    if (panel) panel.focus({ preventScroll: true });
  }, 900);

  popup.querySelectorAll("[data-popup-close]").forEach(function (el) {
    el.addEventListener("click", closePopup);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !popup.hasAttribute("hidden")) closePopup();
  });
})();
