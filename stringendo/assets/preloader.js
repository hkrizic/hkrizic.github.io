(function () {
  var preloader = document.getElementById('preloader');
  if (!preloader) return;

  var MIN_SHOW_MS = 300;
  var MAX_WAIT_MS = 5000;
  var hidden = false;
  var startedAt = (window.performance && performance.now) ? performance.now() : Date.now();

  function now() {
    return (window.performance && performance.now) ? performance.now() : Date.now();
  }

  function hide() {
    if (hidden) return;
    hidden = true;
    var elapsed = now() - startedAt;
    var wait = Math.max(0, MIN_SHOW_MS - elapsed);
    setTimeout(function () {
      document.body.classList.remove('is-loading');
      setTimeout(function () {
        if (preloader && preloader.parentNode) {
          preloader.parentNode.removeChild(preloader);
        }
      }, 700);
    }, wait);
  }

  if (document.readyState === 'complete') {
    hide();
  } else {
    window.addEventListener('load', hide);
  }

  setTimeout(hide, MAX_WAIT_MS);
})();
