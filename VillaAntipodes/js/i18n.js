const i18n = {
  currentLang: 'en',
  supportedLangs: ['en','de','fr','it','es','pt','zh','ja','ko','hr'],

  init() {
    const url = new URLSearchParams(window.location.search).get('lang');
    const saved = this.getSavedLang();
    const lang = url || saved || navigator.language?.slice(0,2) || 'en';
    this.currentLang = this.supportedLangs.includes(lang) ? lang : 'en';
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

  updateSelector() {
    document.querySelectorAll('#langSelect').forEach((sel) => {
      sel.value = this.currentLang;
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
