(function () {
    'use strict';

    var STORAGE_KEY = 'hk-lang';
    var SUPPORTED = ['en', 'de'];
    var DEFAULT_LANG = 'en';

    function detectLang() {
        try {
            var stored = localStorage.getItem(STORAGE_KEY);
            if (SUPPORTED.indexOf(stored) !== -1) return stored;
        } catch (e) {}
        var browser = (navigator.language || '').toLowerCase();
        if (browser.indexOf('de') === 0) return 'de';
        return DEFAULT_LANG;
    }

    function apply(lang) {
        if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;
        document.documentElement.lang = lang;

        var nodes = document.querySelectorAll('[data-en], [data-de]');
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var val = node.dataset[lang];
            if (val == null) continue;
            var tag = node.tagName;
            if (tag === 'TITLE') {
                document.title = val;
            } else if (tag === 'META') {
                node.setAttribute('content', val);
            } else if (node.hasAttribute('data-i18n-attr')) {
                node.setAttribute(node.getAttribute('data-i18n-attr'), val);
            } else {
                node.innerHTML = val;
            }
        }

        var btns = document.querySelectorAll('.nav__lang-btn');
        for (var j = 0; j < btns.length; j++) {
            btns[j].classList.toggle('is-active', btns[j].getAttribute('data-lang') === lang);
            btns[j].setAttribute('aria-pressed', btns[j].getAttribute('data-lang') === lang ? 'true' : 'false');
        }
    }

    function setLang(lang) {
        try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
        apply(lang);
    }

    function init() {
        apply(detectLang());
        var btns = document.querySelectorAll('.nav__lang-btn');
        for (var i = 0; i < btns.length; i++) {
            (function (btn) {
                btn.addEventListener('click', function () {
                    setLang(btn.getAttribute('data-lang'));
                });
            })(btns[i]);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.HKi18n = { setLang: setLang, detectLang: detectLang };
})();
