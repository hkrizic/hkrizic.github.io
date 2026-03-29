(function() {
  function initNavigation() {
    const navLinks = document.getElementById('navLinks');
    const navToggle = document.getElementById('navToggle');

    if (!navLinks || !navToggle) return;

    function setMenuOpen(isOpen) {
      navLinks.classList.toggle('open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
      document.body.classList.toggle('nav-open', isOpen);
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
