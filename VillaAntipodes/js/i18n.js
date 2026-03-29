const i18n = {
  currentLang: 'en',
  languages: [
    { code: 'en', short: 'EN', name: 'English' },
    { code: 'de', short: 'DE', name: 'Deutsch' },
    { code: 'fr', short: 'FR', name: 'Français' },
    { code: 'it', short: 'IT', name: 'Italiano' },
    { code: 'es', short: 'ES', name: 'Español' },
    { code: 'pt', short: 'PT', name: 'Português' },
    { code: 'zh', short: 'ZH', name: '中文' },
    { code: 'ja', short: 'JA', name: '日本語' },
    { code: 'ko', short: 'KO', name: '한국어' },
    { code: 'hr', short: 'HR', name: 'Hrvatski' }
  ],
  supportedLangs: ['en','de','fr','it','es','pt','zh','ja','ko','hr'],

  init() {
    const url = new URLSearchParams(window.location.search).get('lang');
    const saved = this.getSavedLang();
    const lang = url || saved || navigator.language?.slice(0,2) || 'en';
    this.currentLang = this.supportedLangs.includes(lang) ? lang : 'en';
    this.initLanguageSwitchers();
    this.apply();
    this.updateSelector();
  },

  setLang(lang) {
    if (!this.supportedLangs.includes(lang)) return;
    this.currentLang = lang;
    this.saveLang(lang);
    this.apply();
    this.updateSelector();
  },

  t(key) {
    const dictionary = typeof translations !== 'undefined' ? translations : {};
    const lang = dictionary[this.currentLang] || dictionary.en || {};
    const fallback = dictionary.en || {};
    return lang[key] || fallback[key] || key;
  },

  getSavedLang() {
    try {
      return localStorage.getItem('villa-lang');
    } catch (error) {
      return null;
    }
  },

  saveLang(lang) {
    try {
      localStorage.setItem('villa-lang', lang);
    } catch (error) {
      // Ignore storage issues on restrictive or local file origins.
    }
  },

  applyAttributeTranslations(dataAttr, targetAttr) {
    document.querySelectorAll('[' + dataAttr + ']').forEach((el) => {
      const key = el.getAttribute(dataAttr);
      el.setAttribute(targetAttr, this.t(key));
    });
  },

  apply() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      el.textContent = i18n.t(key);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-html');
      el.innerHTML = i18n.t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = i18n.t(key);
    });
    document.querySelectorAll('[data-i18n-label]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-label');
      el.textContent = i18n.t(key);
    });
    this.applyAttributeTranslations('data-i18n-content', 'content');
    this.applyAttributeTranslations('data-i18n-title', 'title');
    this.applyAttributeTranslations('data-i18n-aria-label', 'aria-label');
    this.applyAttributeTranslations('data-i18n-alt', 'alt');
    document.documentElement.lang = this.currentLang;
    this.syncUrl();
    this.updateLinks();
  },

  getLanguageConfig(lang) {
    return this.languages.find((item) => item.code === lang) || this.languages[0];
  },

  initLanguageSwitchers() {
    document.querySelectorAll('[data-lang-switcher]').forEach((switcher) => {
      const trigger = switcher.querySelector('.lang-switcher-trigger');
      const menu = switcher.querySelector('[data-lang-menu]');
      const options = switcher.querySelector('[data-lang-options]');

      if (options && !options.children.length) {
        this.languages.forEach((language) => {
          const option = document.createElement('button');
          option.type = 'button';
          option.className = 'lang-option';
          option.dataset.langCode = language.code;
          option.setAttribute('aria-pressed', 'false');
          option.innerHTML =
            '<span class="lang-option-name">' + language.name + '</span>' +
            '<span class="lang-option-code">' + language.short + '</span>';
          options.appendChild(option);
        });
      }

      if (trigger && !trigger.dataset.langBound) {
        trigger.dataset.langBound = 'true';
        trigger.addEventListener('click', (event) => {
          event.stopPropagation();
          const shouldOpen = !switcher.classList.contains('open');
          this.closeLanguageMenus();
          this.setLanguageMenuOpen(switcher, shouldOpen);
        });
      }

      if (menu && !menu.dataset.langBound) {
        menu.dataset.langBound = 'true';
        menu.addEventListener('click', (event) => {
          const option = event.target.closest('[data-lang-code]');
          if (!option) return;
          this.setLang(option.dataset.langCode);
          this.closeLanguageMenus();
        });
      }
    });

    if (!this.languageMenuEventsBound) {
      this.languageMenuEventsBound = true;
      document.addEventListener('click', (event) => {
        if (!event.target.closest('[data-lang-switcher]')) {
          this.closeLanguageMenus();
        }
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          this.closeLanguageMenus();
        }
      });
      window.addEventListener('resize', () => {
        this.refreshOpenLanguageMenus();
      });
      window.addEventListener('scroll', () => {
        this.refreshOpenLanguageMenus();
      }, { passive: true });

      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
          this.refreshOpenLanguageMenus();
        });
        window.visualViewport.addEventListener('scroll', () => {
          this.refreshOpenLanguageMenus();
        });
      }
    }
  },

  isCompactViewport() {
    return window.matchMedia('(max-width: 768px)').matches;
  },

  positionLanguageMenu(switcher) {
    const trigger = switcher.querySelector('.lang-switcher-trigger');
    const menu = switcher.querySelector('[data-lang-menu]');

    if (!trigger || !menu) return;

    if (!this.isCompactViewport()) {
      menu.style.removeProperty('--lang-menu-top');
      menu.style.removeProperty('--lang-menu-max-height');
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const gap = 12;
    const bottomInset = 16;
    const top = Math.max(Math.round(triggerRect.bottom + gap), 16);
    const maxHeight = Math.max(Math.floor(viewportHeight - top - bottomInset), 160);

    menu.style.setProperty('--lang-menu-top', top + 'px');
    menu.style.setProperty('--lang-menu-max-height', maxHeight + 'px');
  },

  refreshOpenLanguageMenus() {
    document.querySelectorAll('[data-lang-switcher].open').forEach((switcher) => {
      this.positionLanguageMenu(switcher);
    });
  },

  setLanguageMenuOpen(switcher, isOpen) {
    const trigger = switcher.querySelector('.lang-switcher-trigger');
    const menu = switcher.querySelector('[data-lang-menu]');
    switcher.classList.toggle('open', isOpen);
    if (trigger) {
      trigger.setAttribute('aria-expanded', String(isOpen));
    }
    if (menu) {
      if (isOpen) {
        this.positionLanguageMenu(switcher);
      }
      menu.hidden = !isOpen;
    }
  },

  closeLanguageMenus() {
    document.querySelectorAll('[data-lang-switcher]').forEach((switcher) => {
      this.setLanguageMenuOpen(switcher, false);
    });
  },

  updateSelector() {
    const activeLanguage = this.getLanguageConfig(this.currentLang);
    document.querySelectorAll('[data-lang-current]').forEach((label) => {
      label.textContent = activeLanguage.name;
    });
    document.querySelectorAll('[data-lang-current-code]').forEach((label) => {
      label.textContent = activeLanguage.short;
    });
    document.querySelectorAll('.lang-option').forEach((option) => {
      const isActive = option.dataset.langCode === this.currentLang;
      option.classList.toggle('is-active', isActive);
      option.setAttribute('aria-pressed', String(isActive));
    });
  },

  syncUrl() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', this.currentLang);
      window.history.replaceState({}, '', url);
    } catch (error) {
      // Ignore URL rewrite issues on unsupported environments.
    }
  },

  updateLinks() {
    document.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;
      if (
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('//')
      ) {
        return;
      }

      const url = new URL(href, window.location.href);
      if (!url.pathname.endsWith('.html')) return;

      url.searchParams.set('lang', this.currentLang);
      const fileName = url.pathname.split('/').pop() || url.pathname;
      link.setAttribute('href', fileName + url.search + url.hash);
    });
  },

  composeBookingEmail(form) {
    const selectedGuests = form.elements.guests?.selectedOptions?.[0]?.textContent?.trim() || form.elements.guests?.value || '';
    const selectedShuttle = form.elements.shuttle?.selectedOptions?.[0]?.textContent?.trim() || form.elements.shuttle?.value || '';
    const message = form.elements.message?.value?.trim() || '';
    const bodyLines = [
      this.t('booking_email_name') + ': ' + form.elements.firstName.value + ' ' + form.elements.lastName.value,
      this.t('form_email') + ': ' + form.elements.email.value,
      this.t('form_checkin') + ': ' + form.elements.checkin.value,
      this.t('form_checkout') + ': ' + form.elements.checkout.value,
      this.t('form_guests') + ': ' + selectedGuests,
      this.t('form_shuttle') + ': ' + selectedShuttle,
      '',
      this.t('form_message') + ':',
      message
    ];

    return {
      subject: this.t('booking_email_subject'),
      body: bodyLines.join('\n')
    };
  }
};

window.i18n = i18n;
document.addEventListener('DOMContentLoaded', function() { i18n.init(); });
