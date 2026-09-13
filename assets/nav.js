/* Panderose — mobile nav toggle. Self-initializes on every .nav found. */
(function () {
  function init(nav) {
    var toggle = nav.querySelector('.nav__toggle');
    var links = nav.querySelector('.nav__links');
    if (!toggle || !links) return;

    function close() {
      nav.classList.remove('nav--open');
      toggle.setAttribute('aria-expanded', 'false');
    }
    function open() {
      nav.classList.add('nav--open');
      toggle.setAttribute('aria-expanded', 'true');
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (nav.classList.contains('nav--open')) {
        close();
      } else {
        open();
      }
    });

    var linkEls = links.querySelectorAll('a');
    for (var i = 0; i < linkEls.length; i++) {
      linkEls[i].addEventListener('click', close);
    }

    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) close();
    });
  }

  var navs = document.querySelectorAll('.nav');
  for (var i = 0; i < navs.length; i++) init(navs[i]);
})();
