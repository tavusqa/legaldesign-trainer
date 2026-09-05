/* scrolly.js — движок покадровой анимации по скроллу для «глав» (chapter).
   Как в спецпроекте pravo.ru (lax.js), но привязка не к абсолютному scrollY,
   а к прогрессу внутри секции — главы можно строить динамически и в любом
   месте страницы. Ноль зависимостей, ноль CDN (принцип 3 CLAUDE.md).

   Глава — обычная секция высотой N*100vh со sticky-сценой внутри: браузер
   сам «пришпиливает» сцену, движок только интерполирует свойства слоёв.
   Прокрутка назад отматывает всё в обратную сторону бесплатно — состояние
   каждого слоя есть чистая функция позиции скролла.

   Ключевые кадры — в «экранах» от начала главы:
     Scrolly.add(chapterEl, el, { opacity: { at:[0,1,2], to:[1,1,0] },
                                  x:       { at:[1,2],   to:[0, v => -v.w*0.3] } })
   `at` — экраны, `to` — значение (число = px, либо функция от {w,h}). */
window.Scrolly = (function () {
  'use strict';
  var chapters = [], vp = { w: 0, h: 0 }, running = false, lastY = -1;

  function chapterOf(el) {
    for (var i = 0; i < chapters.length; i++) if (chapters[i].el === el) return chapters[i];
    var c = { el: el, top: 0, items: [] };
    chapters.push(c);
    return c;
  }

  function measure() {
    vp.w = window.innerWidth;
    vp.h = window.innerHeight;
    for (var i = 0; i < chapters.length; i++) {
      var r = chapters[i].el.getBoundingClientRect();
      chapters[i].top = r.top + window.pageYOffset;
    }
    lastY = -1; /* форсируем перерисовку */
  }

  function val(v) { return typeof v === 'function' ? v(vp) : v; }

  /* Линейная интерполяция по ключевым кадрам с зажимом на концах. */
  function sample(track, s) {
    var at = track.at, to = track.to, n = at.length, i;
    if (s <= at[0]) return val(to[0]);
    if (s >= at[n - 1]) return val(to[n - 1]);
    for (i = 1; i < n; i++) {
      if (s <= at[i]) {
        var span = at[i] - at[i - 1];
        var t = span === 0 ? 1 : (s - at[i - 1]) / span;
        var a = val(to[i - 1]), b = val(to[i]);
        return a + (b - a) * t;
      }
    }
    return val(to[n - 1]);
  }

  function apply(item, s) {
    var p = item.props, tr = '', el = item.el;
    if (p.x || p.y) {
      tr += 'translate3d(' + (p.x ? sample(p.x, s) : 0) + 'px,' +
                             (p.y ? sample(p.y, s) : 0) + 'px,0)';
    }
    if (p.scale) tr += ' scale(' + sample(p.scale, s) + ')';
    if (p.rotate) tr += ' rotate(' + sample(p.rotate, s) + 'deg)';
    if (tr) el.style.transform = tr;
    if (p.opacity) {
      var o = sample(p.opacity, s);
      el.style.opacity = o;
      /* прозрачные слои не должны перехватывать клики */
      el.style.pointerEvents = o < 0.05 ? 'none' : '';
    }
  }

  /* Обновляемся по scroll, а не в rAF-цикле: rAF замирает в фоновой вкладке. */
  function update() {
    var y = window.pageYOffset;
    if (y === lastY) return;
    lastY = y;
    for (var i = 0; i < chapters.length; i++) {
      var c = chapters[i];
      if (!c.items.length) continue;
      var s = vp.h ? (y - c.top) / vp.h : 0; /* экраны от начала главы */
      for (var j = 0; j < c.items.length; j++) apply(c.items[j], s);
    }
  }

  function onResize() { measure(); update(); }

  return {
    add: function (chapterEl, el, props) {
      if (typeof el === 'string') el = document.querySelector(el);
      if (!el) return;
      chapterOf(chapterEl).items.push({ el: el, props: props });
    },
    /* Пересчитать геометрию — звать после вставки/показа секций. */
    refresh: onResize,
    /* Сбросить слои главы (при перестройке содержимого). */
    reset: function (chapterEl) {
      var c = chapterOf(chapterEl);
      c.items = [];
    },
    start: function () {
      if (running) return;
      running = true;
      measure();
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', onResize);
      update();
    }
  };
})();
