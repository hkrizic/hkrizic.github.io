(function() {
  function initNavigation() {
    const navbar = document.getElementById('navbar');
    const navLinks = document.getElementById('navLinks');
    const navToggle = document.getElementById('navToggle');
    let openFrame = 0;

    if (!navbar || !navLinks || !navToggle) return;

    function setMenuOpen(isOpen) {
      window.cancelAnimationFrame(openFrame);
      navToggle.setAttribute('aria-expanded', String(isOpen));
      document.body.classList.toggle('nav-open', isOpen);
      navbar.classList.toggle('menu-open', isOpen);

      if (isOpen) {
        openFrame = window.requestAnimationFrame(() => {
          navLinks.classList.add('open');
        });
        return;
      }

      navLinks.classList.remove('open');
    }

    navToggle.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = navLinks.classList.contains('open');
      if (!isOpen && window.i18n?.closeLanguageMenus) {
        window.i18n.closeLanguageMenus();
      }
      setMenuOpen(!isOpen);
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        setMenuOpen(false);
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        setMenuOpen(false);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initNavigation);
})();
