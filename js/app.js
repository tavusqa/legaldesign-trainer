/* app.js — движок тренажёра. Не знает ни одного спора по имени: содержание
   приходит из cases.js, схемы — из viz.js, скролл-анимация — scrolly.js.

   Устройство страницы — одна непрерывная лента, как в спецпроекте pravo.ru:
     глава-интро (скролл) → выбор дела → глава-фабула (скролл, строится из
     cases.js) → выбор позиции (доступен только ПОСЛЕ фабулы — он ниже неё
     по потоку) → сборка документа → готовый документ → решение суда.
   Назад можно проскроллить в любой момент: главы отматываются в обратную
   сторону, экраны тренажёра остаются на своих местах в ленте. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var state = { caseIdx: -1, side: 'plaintiff', argIdx: 0, answers: [], picked: [] };

  /* Микрокопия шага подтверждения — своя на каждом доводе, как в оригинале. */
  var CONFIRM = [
    { q: 'Судья точно поймёт всё правильно?', ok: 'Да, продолжить' },
    { q: 'Уверены в своём решении?', ok: 'Вполне' },
    { q: 'Так судье точно будет всё понятно.', ok: 'Отлично' }
  ];

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }
  function cur() { return window.CASES[state.caseIdx]; }
  function side() { return cur().sides[state.side]; }
  function money(n) { return Viz.money(n) + ' ₽'; }
  function scrollToEl(el, instant) {
    var top = el.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({ top: top, behavior: instant ? 'auto' : 'smooth' });
  }

  /* ==================================================== сцена интро ====== */
  /* Судебная сцена: здание суда с колоннами → весы Фемиды → документ. */
  function buildIntroScene() {
    var i, s;

    /* --- здание суда --- */
    s = '';
    /* дальние силуэты города-фона, приглушённые */
    for (i = 0; i < 14; i++) {
      var bh = 60 + ((i * 97) % 130);
      s += '<rect x="' + (i * 90 - 30) + '" y="' + (560 - bh) + '" width="64" height="' + bh +
           '" fill="#111a2e"/>';
    }
    /* лестница */
    for (i = 0; i < 4; i++) {
      s += '<rect x="' + (300 - i * 24) + '" y="' + (560 + i * 18) + '" width="' + (600 + i * 48) +
           '" height="18" fill="' + (i % 2 ? '#1a2440' : '#1f2b4a') + '"/>';
    }
    /* стилобат и колоннада */
    s += '<rect x="320" y="300" width="560" height="260" fill="url(#g-stone)"/>';
    for (i = 0; i < 6; i++) {
      var cx = 352 + i * 100;
      s += '<rect x="' + cx + '" y="316" width="30" height="224" rx="3" fill="#31405f"/>' +
           '<rect x="' + (cx - 5) + '" y="308" width="40" height="12" rx="2" fill="#3a4a6d"/>' +
           '<rect x="' + (cx - 5) + '" y="536" width="40" height="12" rx="2" fill="#3a4a6d"/>' +
           '<rect x="' + (cx + 4) + '" y="316" width="6" height="224" fill="#243252"/>';
    }
    /* антаблемент и фронтон */
    s += '<rect x="308" y="272" width="584" height="30" fill="#3a4a6d"/>' +
         '<path d="M300 272 L600 176 L900 272 Z" fill="#2b3a5e" stroke="#43547a" stroke-width="2"/>';
    /* дверной проём */
    s += '<rect x="560" y="442" width="80" height="98" rx="3" fill="#0b1220"/>' +
         '<text x="600" y="666" text-anchor="middle" fill="#5b6b93" font-size="15" ' +
         'font-family="Georgia,serif" letter-spacing="6">АРБИТРАЖНЫЙ СУД</text>';
    $('#sc-court').innerHTML = s;

    /* --- весы Фемиды (коромысло качается отдельной группой) --- */
    s = '<rect x="588" y="180" width="10" height="290" rx="4" fill="url(#g-brass)"/>' +
        '<circle cx="593" cy="470" r="9" fill="url(#g-brass)"/>' +
        '<circle cx="593" cy="172" r="14" fill="none" stroke="#c9a227" stroke-width="5"/>';
    s += '<g id="sc-beam">' +
         '<rect x="380" y="196" width="426" height="8" rx="4" fill="url(#g-brass)"/>';
    [400, 786].forEach(function (bx) {
      s += '<line x1="' + bx + '" y1="204" x2="' + (bx - 26) + '" y2="286" stroke="#c9a227" stroke-width="2.5"/>' +
           '<line x1="' + bx + '" y1="204" x2="' + (bx + 26) + '" y2="286" stroke="#c9a227" stroke-width="2.5"/>' +
           '<path d="M' + (bx - 40) + ' 286 a40 22 0 0 0 80 0 z" fill="url(#g-brass)"/>';
    });
    s += '</g>';
    $('#sc-scales').innerHTML = s;

    /* --- документ: сплошной текст против схемы --- */
    s = '<rect x="410" y="66" width="380" height="540" rx="6" fill="#fbf7ee" stroke="#e2d8bf"/>' +
        '<rect x="410" y="66" width="380" height="52" rx="6" fill="#f3edde"/>' +
        '<text x="600" y="99" text-anchor="middle" fill="#1b2030" font-size="15" font-weight="700" ' +
        'font-family="Georgia,serif">ОТЗЫВ НА ИСКОВОЕ ЗАЯВЛЕНИЕ</text>';
    /* плотный текст */
    s += '<g id="sc-doc-text">';
    for (i = 0; i < 12; i++) {
      s += '<rect x="446" y="' + (146 + i * 18) + '" width="' + (308 - (i % 4) * 34) +
           '" height="6" rx="3" fill="#d9cfb4"/>';
    }
    s += '</g>';
    /* схема, проявляющаяся поверх текста */
    s += '<g id="sc-doc-chart">' +
         '<rect x="440" y="150" width="320" height="196" rx="6" fill="#fff" stroke="#e2d8bf"/>' +
         '<rect x="458" y="180" width="284" height="22" rx="4" fill="#f3edde" stroke="#e2d8bf"/>' +
         '<rect x="530" y="174" width="96" height="34" rx="4" fill="#f6dcd7" stroke="#b3382e"/>' +
         '<text x="578" y="164" text-anchor="middle" fill="#b3382e" font-size="12" font-weight="700" ' +
         'font-family="Arial">70 дней простоя</text>';
    [458, 530, 626, 700].forEach(function (tx) {
      s += '<line x1="' + tx + '" y1="202" x2="' + tx + '" y2="214" stroke="#9aa0ae" stroke-width="1.5"/>';
    });
    s += '<text x="458" y="234" fill="#5b6070" font-size="11" font-family="Arial">сен</text>' +
         '<text x="626" y="234" fill="#5b6070" font-size="11" font-family="Arial">дек</text>' +
         '<text x="726" y="234" fill="#5b6070" font-size="11" font-family="Arial">фев</text>' +
         '<rect x="458" y="258" width="284" height="64" rx="6" fill="#f3edde"/>' +
         '<text x="600" y="286" text-anchor="middle" fill="#1b2030" font-size="13" font-weight="700" ' +
         'font-family="Arial">70 × 15 000 ₽ = 1 050 000 ₽</text>' +
         '<text x="600" y="306" text-anchor="middle" fill="#5b6070" font-size="11" ' +
         'font-family="Arial">исключаются из расчёта истца</text></g>';
    /* строки после схемы и печать */
    for (i = 0; i < 5; i++) {
      s += '<rect x="446" y="' + (386 + i * 18) + '" width="' + (308 - (i % 3) * 40) +
           '" height="6" rx="3" fill="#d9cfb4"/>';
    }
    s += '<circle cx="500" cy="540" r="34" fill="none" stroke="#b3382e" stroke-width="2" opacity=".6"/>' +
         '<circle cx="500" cy="540" r="26" fill="none" stroke="#b3382e" stroke-width="1" opacity=".6"/>' +
         '<line x1="600" y1="546" x2="748" y2="546" stroke="#1b2030" stroke-width="1.5"/>' +
         '<text x="674" y="566" text-anchor="middle" fill="#5b6070" font-size="10" ' +
         'font-family="Arial">подпись представителя</text>';
    $('#sc-doc').innerHTML = s;
  }

  /* Ключевые кадры интро. Блоки живут в окнах [i, i+1] с перехлёстом —
     в любой точке прокрутки на экране всегда что-то видно (без «пустых» зон). */
  function animateIntro() {
    var ch = $('#ch-intro');

    Scrolly.add(ch, '#sc-court', {
      opacity: { at: [0, 1.7, 2.4], to: [1, 1, 0.14] },
      scale:   { at: [0, 2.4], to: [1, 1.34] },
      y:       { at: [0, 2.4], to: [0, 120] }
    });
    Scrolly.add(ch, '#sc-scales', {
      opacity: { at: [0.68, 1.05, 1.75, 2.1], to: [0, 1, 1, 0] },
      scale:   { at: [0.68, 2.1], to: [0.86, 1.02] }
    });
    Scrolly.add(ch, '#sc-beam', {
      rotate:  { at: [0.95, 1.8], to: [-7, 0] }  /* весы приходят в равновесие */
    });
    /* документ занимает правую половину сцены; тексты in-1/in-2 — слева */
    Scrolly.add(ch, '#sc-doc', {
      opacity: { at: [1.7, 2.1, 3.2, 3.55], to: [0, 1, 1, 0] },
      x:       { at: [0, 99], to: [function (v) { return v.w > 900 ? v.w * 0.2 : 0; },
                                   function (v) { return v.w > 900 ? v.w * 0.2 : 0; }] },
      y:       { at: [1.7, 3.4], to: [70, -10] },
      scale:   { at: [1.7, 3.4], to: [0.92, 1] }
    });
    Scrolly.add(ch, '#sc-doc-text',  { opacity: { at: [2.35, 2.75], to: [1, 0.18] } });
    Scrolly.add(ch, '#sc-doc-chart', { opacity: { at: [2.35, 2.8], to: [0, 1] } });
    Scrolly.add(ch, '#veil-light',   { opacity: { at: [3.05, 3.6], to: [0, 1] } });

    Scrolly.add(ch, '#in-0', { opacity: { at: [0, 0.45, 0.82], to: [1, 1, 0] },
                               y: { at: [0, 0.85], to: [0, -46] } });
    Scrolly.add(ch, '#in-1', { opacity: { at: [0.92, 1.22, 1.78, 2.12], to: [0, 1, 1, 0] },
                               y: { at: [0.92, 2.12], to: [46, -46] } });
    Scrolly.add(ch, '#in-2', { opacity: { at: [1.96, 2.28, 2.86, 3.2], to: [0, 1, 1, 0] },
                               y: { at: [1.96, 3.2], to: [46, -46] } });
    Scrolly.add(ch, '#in-3', { opacity: { at: [3.45, 3.85], to: [0, 1] },
                               y: { at: [3.45, 4.0], to: [46, 0] } });
  }

  /* Подсказка «листайте» видна только у самого верха страницы. */
  function watchHint() {
    var hint = $('#hint');
    window.addEventListener('scroll', function () {
      hint.classList.toggle('is-hidden', window.pageYOffset > window.innerHeight * 0.6);
    }, { passive: true });
  }

  /* ===================================================== выбор дела ====== */
  function renderCases() {
    $('#cases-list').innerHTML = window.CASES.map(function (c, i) {
      return '<button class="case' + (i === state.caseIdx ? ' is-chosen' : '') +
        '" data-i="' + i + '" type="button">' +
        '<span class="case-n">Дело ' + (i + 1) + '</span>' +
        '<div class="case-t">' + esc(c.title) + '</div>' +
        '<p class="case-d">' + esc(c.short) + '</p>' +
        '<span class="case-a">Цена иска — ' + money(c.amount) + '</span></button>';
    }).join('');
  }

  /* ============================================ глава-фабула по делу ===== */
  /* Блоки: титул дела → факты (по одному на экран) → истец → ответчик.
     Высота главы кратна числу блоков; выбор позиции лежит ПОСЛЕ главы. */
  function buildStory() {
    var c = cur(), ch = $('#ch-story'), host = $('#story-blocks');
    var blocks = [];

    blocks.push(
      '<div class="story-card">' +
        '<p class="story-tag">Шаг 2 · фабула дела</p>' +
        '<h2>' + esc(c.short) + '</h2>' +
        '<p class="story-court">' + esc(c.court) + ' · дело № ' + esc(c.number) + '</p>' +
        '<p class="story-amount">Цена иска — <b>' + money(c.amount) + '</b></p>' +
      '</div>');

    c.facts.forEach(function (f, i) {
      blocks.push(
        '<div class="story-card">' +
          '<p class="story-tag">Обстоятельства · ' + (i + 1) + ' из ' + c.facts.length + '</p>' +
          '<p>' + esc(f) + '</p>' +
        '</div>');
    });

    ['plaintiff', 'defendant'].forEach(function (k) {
      var p = c.parties[k];
      blocks.push(
        '<div class="party ' + (k === 'plaintiff' ? 'party_p' : 'party_d') + '">' +
          '<span class="party-role">' + (k === 'plaintiff' ? 'Позиция истца' : 'Позиция ответчика') + '</span>' +
          '<div class="party-name">' + esc(p.name) + '</div>' +
          '<p class="party-sub">' + esc(p.role) + '</p>' +
          '<p class="party-claim">' + esc(p.claim) + '</p>' +
          '<p class="party-quote">«' + esc(p.quote) + '»</p>' +
        '</div>');
    });

    var n = blocks.length;
    ch.style.height = (n * 100 + 50) + 'vh';
    host.innerHTML = blocks.map(function (b, i) {
      return '<div class="blk" id="st-' + i + '">' + b + '</div>';
    }).join('');

    /* эмблема-фон: кольцо с весами, едва заметная, с лёгким параллаксом */
    $('#sc-emblem').innerHTML =
      '<g opacity=".13" stroke="#c9a227" fill="none">' +
      '<circle cx="600" cy="350" r="235" stroke-width="3"/>' +
      '<circle cx="600" cy="350" r="215" stroke-width="1"/>' +
      '<line x1="600" y1="215" x2="600" y2="465" stroke-width="7"/>' +
      '<line x1="472" y1="252" x2="728" y2="252" stroke-width="7"/>' +
      '<path d="M452 252 l30 62 h-60 z M748 252 l-30 62 h60 z" fill="#c9a227" stroke="none"/>' +
      '<line x1="545" y1="465" x2="655" y2="465" stroke-width="7"/></g>';

    Scrolly.reset(ch);
    Scrolly.add(ch, '#sc-emblem', {
      scale: { at: [0, n], to: [1, 1.16] },
      rotate: { at: [0, n], to: [-2, 2] }
    });
    blocks.forEach(function (_, i) {
      var last = i === n - 1;
      var props = {
        opacity: last
          ? { at: [i - 0.2, i + 0.12], to: [0, 1] }        /* последний уезжает вместе со сценой */
          : i === 0
            ? { at: [0, 0.78, 1.14], to: [1, 1, 0] }
            : { at: [i - 0.2, i + 0.12, i + 0.78, i + 1.14], to: [0, 1, 1, 0] },
        y: { at: [i - 0.2, i + 1.14], to: [54, -54] }
      };
      if (i === 0) props.y = { at: [0, 1.14], to: [0, -54] };
      if (last) props.y = { at: [i - 0.2, i + 0.5], to: [54, 0] };
      /* истец въезжает слева, ответчик справа — как в спецпроекте */
      if (i === n - 2) props.x = { at: [i - 0.2, i + 0.2], to: [function (v) { return -v.w * 0.06; }, 0] };
      if (last) props.x = { at: [i - 0.2, i + 0.2], to: [function (v) { return v.w * 0.06; }, 0] };
      Scrolly.add(ch, '#st-' + i, props);
    });
    Scrolly.refresh();
  }

  function renderSideChoice() {
    var c = cur();
    $('#side-cards').innerHTML = ['plaintiff', 'defendant'].map(function (k) {
      var p = c.parties[k], s = c.sides[k];
      return '<button class="side" data-side="' + k + '" type="button">' +
        '<span class="side-role">' + (k === 'plaintiff' ? 'За истца' : 'За ответчика') + '</span>' +
        '<div class="side-name">' + esc(p.name) + '</div>' +
        '<p class="side-sub">' + esc(p.role) + '</p>' +
        '<p class="side-hint"><b>' + esc(s.label) + '.</b> ' + esc(s.hint) + '</p></button>';
    }).join('');
  }

  function selectCase(i, keepScroll) {
    state.caseIdx = i;
    state.side = null;
    renderCases();
    $('#case-flow').hidden = false;
    $('#post-side').hidden = true;
    $('#sec-final').hidden = true;
    $('#sec-results').hidden = true;
    buildStory();
    renderSideChoice();
    if (!keepScroll) scrollToEl($('#ch-story'));
  }

  /* ======================================================= тренажёр ====== */
  function startGame(k, instant) {
    state.side = k;
    state.argIdx = 0;
    state.answers = [];
    state.picked = [];
    $('#post-side').hidden = false;
    $('#sec-final').hidden = true;
    $('#sec-results').hidden = true;
    renderArg();
    Scrolly.refresh();
    scrollToEl($('#sec-game'), instant);
  }

  function renderArg() {
    var s = side(), a = s.args[state.argIdx];
    $('#game-role').textContent = s.label + ' · ' + s.docKind.toLowerCase();
    $('#game-progress').textContent = 'Довод ' + (state.argIdx + 1) + ' из ' + s.args.length;
    $('#doc-head-title').textContent = a.heading;
    $('#doc-body').innerHTML =
      a.docText.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
      '<h4>' + esc(a.vizTitle) + '</h4>' +
      '<div class="doc-slot" id="slot">место для визуализации — выберите её справа</div>';
    renderChooser(0);
  }

  function renderChooser(i) {
    var a = side().args[state.argIdx], o = a.options[i];
    $('#game-choice').innerHTML =
      '<p class="prompt">' + esc(a.prompt) + '</p>' +
      '<div class="slider-dots">' + a.options.map(function (_, k) {
        return '<i class="' + (k === i ? 'is-active' : '') + '"></i>'; }).join('') + '</div>' +
      '<p class="opt-title">Вариант ' + (i + 1) + '</p>' +
      '<p class="opt-caption">' + esc(o.caption) + '</p>' +
      '<div class="viz-row">' +
        '<button class="arrow js-prev" type="button" aria-label="Предыдущий">‹</button>' +
        '<div class="viz-frame js-pick">' + Viz.render(o.viz) + '</div>' +
        '<button class="arrow js-next" type="button" aria-label="Следующий">›</button>' +
      '</div>' +
      '<p class="pick-note">Нажмите на визуализацию, чтобы вставить её в документ</p>';
    $('#game-choice').dataset.i = i;
  }

  function pick(i) {
    var a = side().args[state.argIdx], o = a.options[i], slot = $('#slot'), body = $('#doc-body');
    slot.classList.add('is-filled');
    slot.innerHTML = Viz.render(o.viz);
    /* Плавную прокрутку браузер не доводит в фоне — в конце доводим сами. */
    body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
    state.answers[state.argIdx] = o.stars;
    state.picked[state.argIdx] = i;
    setTimeout(function () {
      body.scrollTop = body.scrollHeight;
      renderConfirm();
    }, 560);
  }

  function renderConfirm() {
    var c = CONFIRM[Math.min(state.argIdx, CONFIRM.length - 1)];
    $('#game-choice').innerHTML =
      '<div class="confirm"><p>' + esc(c.q) + '</p>' +
      '<button class="btn js-confirm" type="button">' + esc(c.ok) + '</button>' +
      '<button class="confirm-back js-rethink" type="button">Подумаю ещё</button></div>';
  }

  function nextArg() {
    if (state.argIdx < side().args.length - 1) {
      state.argIdx++;
      renderArg();
      scrollToEl($('#sec-game'));
    } else renderFinal();
  }

  /* ================================================ готовый документ ===== */
  function renderFinal() {
    var c = cur(), s = side(), me = c.parties[state.side],
        foe = c.parties[state.side === 'plaintiff' ? 'defendant' : 'plaintiff'];
    $('#final-kind').textContent = s.docKind;
    var html = '<div class="paper-head"><div><b>' + esc(me.name) + '</b><br>' +
      esc(me.role) + '</div><div style="text-align:right">' + esc(c.court) + '<br>дело № ' +
      esc(c.number) + '</div></div>' +
      '<dl class="paper-req">' +
        '<dt>' + (state.side === 'plaintiff' ? 'Истец' : 'Ответчик') + '</dt><dd>' + esc(me.name) + '</dd>' +
        '<dt>' + (state.side === 'plaintiff' ? 'Ответчик' : 'Истец') + '</dt><dd>' + esc(foe.name) + '</dd>' +
        '<dt>Цена иска</dt><dd>' + money(c.amount) + '</dd></dl>' +
      '<p class="no-indent">' + esc(s.intro) + '</p>';

    s.args.forEach(function (a, k) {
      var o = a.options[state.picked[k]];
      html += '<h3>' + esc(a.heading) + '. ' + esc(a.docTitle) + '</h3>' +
        a.docText.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
        '<h4>' + esc(a.vizTitle) + '</h4>' + Viz.render(o.viz);
    });

    html += '<p class="no-indent"><b>На основании изложенного и в соответствии с действующим ' +
      'законодательством Российской Федерации, прошу:</b></p><p>' + esc(s.request) + '</p>' +
      '<div class="paper-sign">Представитель ' +
      (state.side === 'plaintiff' ? 'истца' : 'ответчика') + '<br>' + esc(me.name) + '</div>';
    $('#final-paper').innerHTML = html;
    $('#sec-final').hidden = false;
    Scrolly.refresh();
    scrollToEl($('#sec-final'));
  }

  /* =================================================== решение суда ====== */
  function renderResults() {
    var c = cur(), s = side();
    var total = state.answers.reduce(function (a, b) { return a + b; }, 0);
    var end = s.endings.filter(function (e) { return total >= e.min; })[0] || s.endings[s.endings.length - 1];

    var rows = s.args.map(function (a, k) {
      var st = state.answers[k];
      return '<div class="stars-row" data-arg="' + k + '">' +
        '<span class="stars-name">' + esc(a.heading) + '</span>' +
        '<span class="stars">' + [1, 2, 3].map(function (n) {
          return '<i class="' + (n <= st ? 'on' : '') + '"></i>'; }).join('') + '</span></div>';
    }).join('');

    var law = (window.CASE_LAW && window.CASE_LAW[c.id]) || [];
    $('#verdict').innerHTML =
      '<div class="verdict-box">' +
        '<p class="verdict-court">' + esc(c.court) + ' · дело № ' + esc(c.number) + '</p>' +
        '<p class="verdict-h">' + esc(end.title) + '</p>' +
        '<p class="verdict-v">' + esc(end.verdict) + '</p>' + rows +
        '<p class="stars-hint">Нажмите на довод, чтобы увидеть разбор и лучший вариант подачи</p>' +
        '<p class="verdict-text">' + esc(end.text) + '</p>' +
        (law.length ? '<div class="law"><b>Правовые позиции по этому спору</b><ul>' +
          law.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul></div>' : '') +
      '</div>';
    $('#sec-results').hidden = false;
    Scrolly.refresh();
    scrollToEl($('#sec-results'));
  }

  function openArgReview(k) {
    var a = side().args[k], mine = a.options[state.picked[k]];
    var best = a.options.reduce(function (x, y) { return y.stars > x.stars ? y : x; });
    var same = mine === best;
    $('#modal-body').innerHTML =
      '<h3>' + esc(a.heading) + '. ' + esc(a.docTitle) + '</h3>' +
      '<div class="modal-grid">' +
        '<div><span class="badge ' + (same ? '' : 'badge_grey') + '">' +
          (same ? 'Ваш выбор — лучший вариант' : 'Ваш выбор') + '</span>' +
          Viz.render(mine.viz) + '<p>' + esc(mine.review) + '</p></div>' +
        (same ? '' : '<div><span class="badge">Лучший вариант</span>' +
          Viz.render(best.viz) + '<p>' + esc(best.review) + '</p></div>') +
      '</div>';
    $('#modal').classList.add('is-active');
  }

  /* ===================================================== обработчики ===== */
  document.addEventListener('click', function (e) {
    var t = e.target, hit = function (s) { return t.closest(s); };

    if (hit('.case')) selectCase(+hit('.case').dataset.i);
    else if (hit('.side')) startGame(hit('.side').dataset.side);
    else if (hit('.js-recap')) scrollToEl($('#ch-story'));
    else if (hit('.js-prev')) {
      var n = side().args[state.argIdx].options.length;
      renderChooser((+$('#game-choice').dataset.i + n - 1) % n);
    } else if (hit('.js-next')) {
      var m = side().args[state.argIdx].options.length;
      renderChooser((+$('#game-choice').dataset.i + 1) % m);
    } else if (hit('.js-pick')) pick(+$('#game-choice').dataset.i);
    else if (hit('.js-confirm')) nextArg();
    else if (hit('.js-rethink')) { renderArg(); scrollToEl($('#sec-game')); }
    else if (hit('.js-submit')) renderResults();
    else if (hit('.stars-row')) openArgReview(+hit('.stars-row').dataset.arg);
    else if (hit('.js-other-side')) startGame(state.side === 'plaintiff' ? 'defendant' : 'plaintiff');
    else if (hit('.js-other-case')) scrollToEl($('#sec-cases'));
    else if (hit('.js-info')) {
      $('#modal-body').innerHTML = '<h3>О документе</h3><p>Вид документа адаптирован под ' +
        'стилистику тренажёра и отличается от реального процессуального документа. ' +
        'Дела вымышлены, совпадения случайны.</p>';
      $('#modal').classList.add('is-active');
    }
    else if (hit('.js-modal-close') || t.id === 'modal') $('#modal').classList.remove('is-active');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') $('#modal').classList.remove('is-active');
    if ($('#post-side').hidden) return;
    var gc = $('#game-choice');
    if (!gc || gc.dataset.i === undefined) return;
    var opts = side().args[state.argIdx].options.length, i = +gc.dataset.i;
    if (isNaN(i)) return;
    if (e.key === 'ArrowLeft') renderChooser((i + opts - 1) % opts);
    if (e.key === 'ArrowRight') renderChooser((i + 1) % opts);
  });

  /* ================================ отладочный хук для скриншот-прогонов == */
  /* #case=0&side=defendant&picks=1,0,2&go=final&y=2400 — привести страницу
     к нужному состоянию без кликов. В обычной работе хук не участвует. */
  function applyHash() {
    var h = location.hash.replace(/^#/, '');
    if (!h) return;
    var q = {};
    h.split('&').forEach(function (kv) {
      var p = kv.split('='); q[p[0]] = decodeURIComponent(p[1] || '');
    });
    if (q.case !== undefined) selectCase(+q.case, true);
    if (q.side) startGame(q.side, true);
    if (q.picks) {
      q.picks.split(',').forEach(function (p, k) {
        state.argIdx = k;
        var o = side().args[k].options[+p];
        state.answers[k] = o.stars;
        state.picked[k] = +p;
      });
      state.argIdx = side().args.length - 1;
      if (q.go === 'final' || q.go === 'results') renderFinal();
      if (q.go === 'results') renderResults();
    }
    if (q.y !== undefined) {
      var dbg = document.createElement('div');
      dbg.style.cssText = 'position:fixed;top:4px;left:4px;z-index:99;background:#000;' +
        'color:#0f0;font:11px monospace;padding:2px 6px;opacity:.8';
      document.body.appendChild(dbg);
      window.onerror = function (m, s, l) { dbg.textContent += ' ERR:' + m + '@' + l; };
      var jump = function () {
        window.scrollTo({ top: +q.y, behavior: 'instant' }); /* мимо smooth-скролла */
        Scrolly.refresh();
        dbg.textContent = 'y=' + window.pageYOffset + ' h=' + document.body.scrollHeight +
          ' in1op=' + getComputedStyle(document.getElementById('in-1')).opacity;
      };
      if (document.readyState === 'complete') jump();
      else window.addEventListener('load', function () { setTimeout(jump, 50); });
    }
  }

  /* ============================================================ старт ==== */
  buildIntroScene();
  animateIntro();
  watchHint();
  renderCases();
  Scrolly.start();
  applyHash();
})();
