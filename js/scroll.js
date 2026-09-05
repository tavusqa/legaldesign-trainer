/* scroll.js — мини-движок покадровой анимации по скроллу.
   Замена lax.js: ~90 строк, ноль зависимостей, ноль CDN (принцип 3 CLAUDE.md).

   Ключевые кадры задаются в единицах высоты экрана:
     Scroll.add(el, { opacity: { at:[0,1,2], to:[1,1,0] },
                      x:       { at:[1,2],   to:[0, v => -v.w*0.3] } })
   `at` — позиция скролла в «экранах», `to` — значение (число = px, либо
   функция от {w,h} для величин, зависящих от вьюпорта). */
window.Scroll = (function () {
  var items = [], vp = { w: 0, h: 0 }, running = false, lastY = -1;

  function measure() {
    vp.w = window.innerWidth;
    vp.h = window.innerHeight;
    lastY = -1; // форсируем пересчёт
  }

  function onResize() { measure(); update(); }

  function val(v) { return typeof v === 'function' ? v(vp) : v; }

  /* Линейная интерполяция по набору ключевых кадров с зажимом на концах. */
  function sample(track, screens) {
    var at = track.at, to = track.to, n = at.length, i;
    if (screens <= at[0]) return val(to[0]);
    if (screens >= at[n - 1]) return val(to[n - 1]);
    for (i = 1; i < n; i++) {
      if (screens <= at[i]) {
        var span = at[i] - at[i - 1];
        var t = span === 0 ? 1 : (screens - at[i - 1]) / span;
        var a = val(to[i - 1]), b = val(to[i]);
        return a + (b - a) * t;
      }
    }
    return val(to[n - 1]);
  }

  function apply(item, screens) {
    var p = item.props, tr = '', el = item.el;
    if (p.x || p.y) {
      tr += 'translate3d(' + (p.x ? sample(p.x, screens) : 0) + 'px,' +
                             (p.y ? sample(p.y, screens) : 0) + 'px,0)';
    }
    if (p.scale) tr += ' scale(' + sample(p.scale, screens) + ')';
    if (p.rotate) tr += ' rotate(' + sample(p.rotate, screens) + 'deg)';
    if (tr) el.style.transform = tr;
    if (p.opacity) {
      var o = sample(p.opacity, screens);
      el.style.opacity = o;
      /* полностью прозрачные слои не должны перехватывать клики */
      el.style.pointerEvents = o < 0.02 ? 'none' : '';
    }
  }

  /* Обновляемся по событию scroll, а не в цикле rAF: rAF не тикает, пока
     вкладка не отрисовывается, и анимация «замерзает» на последнем кадре.
     Событие scroll браузер и так шлёт не чаще кадра. */
  function update() {
    var y = window.pageYOffset;
    if (y === lastY) return;
    lastY = y;
    var screens = vp.h ? y / vp.h : 0;
    for (var i = 0; i < items.length; i++) apply(items[i], screens);
  }

  return {
    add: function (el, props) {
      if (typeof el === 'string') el = document.querySelector(el);
      if (!el) return;
      items.push({ el: el, props: props });
    },
    start: function () {
      if (running) return;
      running = true;
      measure();
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', onResize);
      update();
    },
    stop: function () {
      running = false;
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    },
    clear: function () { items = []; }
  };
})();
