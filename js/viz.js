/* viz.js — генераторы SVG-визуализаций для процессуального документа.
   Семь параметрических рендереров; конкретные данные лежат в cases.js.
   Всё инлайном: ни картинок, ни внешних библиотек. */
window.Viz = (function () {
  var C = {
    ink: '#0f172a', slate: '#475569', mute: '#94a3b8', line: '#e2e8f0',
    bg: '#f8fafc', accent: '#2563eb', soft: '#eff6ff',
    bad: '#ef4444', badSoft: '#fef2f2', good: '#16a34a', goodSoft: '#f0fdf4',
    warn: '#d97706', warnSoft: '#fffbeb'
  };
  var W = 640, H = 320;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  /* 1234567 -> "1 234 567" */
  function money(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  function open(h) {
    return '<svg viewBox="0 0 ' + W + ' ' + (h || H) + '" xmlns="http://www.w3.org/2000/svg" ' +
           'preserveAspectRatio="xMidYMid meet" font-family="-apple-system, Segoe UI, Roboto, Arial, sans-serif">';
  }
  function txt(x, y, s, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '"' +
      ' fill="' + (o.fill || C.ink) + '"' +
      ' font-size="' + (o.size || 13) + '"' +
      ' font-weight="' + (o.weight || 400) + '"' +
      ' text-anchor="' + (o.anchor || 'start') + '"' +
      (o.style ? ' font-style="' + o.style + '"' : '') +
      '>' + esc(s) + '</text>';
  }
  function rect(x, y, w, h, o) {
    o = o || {};
    return '<rect x="' + x + '" y="' + y + '" width="' + Math.max(0, w) + '" height="' + Math.max(0, h) + '"' +
      ' rx="' + (o.r === undefined ? 4 : o.r) + '"' +
      ' fill="' + (o.fill || 'none') + '"' +
      (o.stroke ? ' stroke="' + o.stroke + '" stroke-width="' + (o.sw || 1) + '"' : '') +
      (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + '/>';
  }
  function arrowDefs(id, color) {
    return '<defs><marker id="' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" ' +
      'markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="' + color + '"/></marker></defs>';
  }

  /* ---------- 1. Таймлайн: период начисления и выпадающий из него интервал ---------- */
  function timeline(d) {
    var x0 = 46, x1 = W - 24, y = 214, s = open();
    var n = d.months.length, step = (x1 - x0) / n;
    s += txt(x0, 34, d.title, { size: 15, weight: 700 });
    if (d.subtitle) s += txt(x0, 54, d.subtitle, { size: 12, fill: C.slate });

    /* полоса всего периода начисления */
    s += rect(x0, y - 14, x1 - x0, 28, { fill: C.soft, stroke: C.line });
    /* выделенный интервал */
    var hx = x0 + step * d.gap.from, hw = step * (d.gap.to - d.gap.from);
    s += rect(hx, y - 20, hw, 40, { fill: d.gap.tone === 'good' ? C.goodSoft : C.badSoft,
                                    stroke: d.gap.tone === 'good' ? C.good : C.bad, sw: 1.5 });
    s += txt(hx + hw / 2, y + 6, d.gap.label, { anchor: 'middle', size: 12, weight: 700,
             fill: d.gap.tone === 'good' ? C.good : C.bad });

    /* месяцы */
    d.months.forEach(function (m, i) {
      var cx = x0 + step * i + step / 2;
      s += '<line x1="' + (x0 + step * i) + '" y1="' + (y - 14) + '" x2="' + (x0 + step * i) +
           '" y2="' + (y + 14) + '" stroke="' + C.line + '"/>';
      s += txt(cx, y + 34, m, { anchor: 'middle', size: 11, fill: C.slate });
    });

    /* события над шкалой: подпись — на первую строку, где она не пересекается с
       уже поставленными (ширина оценивается по длине текста); якорь «end» только
       если текст не влезает справа. Раньше строки чередовались по индексу, и
       1-е с 3-м событием накладывались. */
    var rows = [[], [], []], placed = [];
    (d.events || []).forEach(function (e) {
      var cx = x0 + step * e.at;
      var w = Math.max(e.label.length, (e.note || '').length) * 6.1 + 4;
      var anchor = cx + 8 + w > x1 ? 'end' : 'start';
      var xs = anchor === 'end' ? cx - 8 - w : cx + 8, xe = xs + w;
      var r = 0;
      while (r < rows.length - 1 && rows[r].some(function (b) { return xs < b[1] + 10 && xe > b[0] - 10; })) r++;
      rows[r].push([xs, xe]);
      placed.push({ e: e, cx: cx, anchor: anchor, ty: 92 + r * 32 });
    });
    placed.forEach(function (p) {
      s += '<line x1="' + p.cx + '" y1="' + (p.ty + 6) + '" x2="' + p.cx + '" y2="' + (y - 20) +
           '" stroke="' + C.mute + '" stroke-dasharray="2 3"/>';
      s += '<circle cx="' + p.cx + '" cy="' + (y - 20) + '" r="4" fill="' + C.accent + '"/>';
      var dx = p.anchor === 'end' ? -8 : 8;
      s += txt(p.cx + dx, p.ty, p.e.label, { size: 11, weight: 600, anchor: p.anchor });
      if (p.e.note) s += txt(p.cx + dx, p.ty + 15, p.e.note, { size: 10.5, fill: C.slate, anchor: p.anchor });
    });

    if (d.callout) {
      s += rect(x0, y + 50, x1 - x0, 40, { fill: C.bg, stroke: C.line });
      s += txt(x0 + 12, y + 75, d.callout, { size: 13, weight: 700 });
    }
    return s + '</svg>';
  }

  /* ---------- 2. Водопад: как требование истца уменьшается по доводам ---------- */
  function waterfall(d) {
    var s = open(), x0 = 46, base = 236, maxV = d.start, top = 92;
    var steps = d.steps.length + 2;
    var bw = Math.min(84, (W - x0 - 24) / steps - 14), gap = (W - x0 - 24 - bw * steps) / (steps - 1);
    var scale = (base - top) / maxV;
    s += txt(x0, 34, d.title, { size: 15, weight: 700 });
    if (d.subtitle) s += txt(x0, 54, d.subtitle, { size: 12, fill: C.slate });

    function bar(i, top_, h, fill, stroke) {
      var x = x0 + i * (bw + gap);
      return rect(x, top_, bw, h, { fill: fill, stroke: stroke, sw: 1.2 });
    }
    var running = d.start, i = 0, s2 = '';
    /* исходное требование */
    var h0 = d.start * scale;
    s2 += bar(0, base - h0, h0, C.soft, C.accent);
    s2 += txt(x0 + bw / 2, base - h0 - 22, money(d.start), { anchor: 'middle', size: 12.5, weight: 700 });
    s2 += txt(x0 + bw / 2, base - h0 - 8, '₽', { anchor: 'middle', size: 10, fill: C.mute });
    s2 += txt(x0 + bw / 2, base + 18, d.startLabel, { anchor: 'middle', size: 10.5, fill: C.slate });

    d.steps.forEach(function (st, k) {
      i = k + 1;
      var x = x0 + i * (bw + gap);
      var h = Math.abs(st.value) * scale;
      var newRun = running - Math.abs(st.value);
      var topY = base - running * scale;
      s2 += bar(i, topY, h, C.badSoft, C.bad);
      s2 += '<line x1="' + (x - gap) + '" y1="' + topY + '" x2="' + x + '" y2="' + topY +
            '" stroke="' + C.mute + '" stroke-dasharray="3 3"/>';
      s2 += txt(x + bw / 2, topY - 8, '−' + money(Math.abs(st.value)), { anchor: 'middle', size: 12, weight: 700, fill: C.bad });
      st.label.split('\n').forEach(function (ln, li) {
        s2 += txt(x + bw / 2, base + 18 + li * 13, ln, { anchor: 'middle', size: 10.5, fill: C.slate });
      });
      running = newRun;
    });
    /* итог */
    i = d.steps.length + 1;
    var xf = x0 + i * (bw + gap), hf = running * scale;
    s2 += bar(i, base - hf, hf, C.goodSoft, C.good);
    s2 += txt(xf + bw / 2, base - hf - 22, money(running), { anchor: 'middle', size: 13, weight: 700, fill: C.good });
    s2 += txt(xf + bw / 2, base - hf - 8, '₽', { anchor: 'middle', size: 10, fill: C.mute });
    s2 += txt(xf + bw / 2, base + 18, d.endLabel, { anchor: 'middle', size: 10.5, weight: 700 });

    s += '<line x1="' + x0 + '" y1="' + base + '" x2="' + (W - 24) + '" y2="' + base + '" stroke="' + C.line + '"/>';
    return s + s2 + '</svg>';
  }

  /* ---------- 3. Цепочка: путь ресурса / обязательства между узлами ---------- */
  function chain(d) {
    var s = open(), x0 = 40;
    s += arrowDefs('ar1', C.slate) ;
    s += txt(x0, 34, d.title, { size: 15, weight: 700 });
    if (d.subtitle) s += txt(x0, 54, d.subtitle, { size: 12, fill: C.slate });
    var rows = d.rows, rowY = [128, 224];
    rows.forEach(function (row, ri) {
      var y = rowY[ri], n = row.nodes.length;
      var bw = 112, gapx = (W - x0 * 2 - bw * n) / (n - 1);
      s += rect(x0 - 14, y - 46, W - (x0 - 14) * 2, 84,
                { fill: row.tone === 'bad' ? C.badSoft : row.tone === 'good' ? C.goodSoft : C.bg,
                  stroke: row.tone === 'bad' ? C.bad : row.tone === 'good' ? C.good : C.line, r: 8 });
      s += txt(x0 - 2, y - 28, row.label, { size: 11.5, weight: 700,
               fill: row.tone === 'bad' ? C.bad : row.tone === 'good' ? C.good : C.slate });
      row.nodes.forEach(function (nd, i) {
        var x = x0 + i * (bw + gapx);
        s += rect(x, y - 12, bw, 38, { fill: '#fff', stroke: C.line });
        nd.split('\n').forEach(function (ln, li) {
          s += txt(x + bw / 2, y + 4 + li * 13, ln, { anchor: 'middle', size: 11, weight: li ? 400 : 600,
                   fill: li ? C.slate : C.ink });
        });
        if (i < n - 1) {
          s += '<line x1="' + (x + bw + 4) + '" y1="' + (y + 7) + '" x2="' + (x + bw + gapx - 6) +
               '" y2="' + (y + 7) + '" stroke="' + C.slate + '" stroke-width="1.4" marker-end="url(#ar1)"/>';
        }
      });
      if (row.note) s += txt(W - x0 + 12, y + 30, row.note, { size: 10.5, anchor: 'end', fill: C.slate });
    });
    if (d.callout) {
      s += rect(x0 - 14, 272, W - (x0 - 14) * 2, 34, { fill: C.soft, stroke: C.accent });
      s += txt(x0, 294, d.callout, { size: 12.5, weight: 700, fill: C.accent });
    }
    return s + '</svg>';
  }

  /* ---------- 4. Столбики: предъявлено против подтверждённого ---------- */
  function bars(d) {
    var x0 = 46, base = 242, top = 96;
    /* многострочные подписи не должны налезать на плашку вывода */
    var maxLines = d.items.reduce(function (m, it) {
      return Math.max(m, it.label.split('\n').length); }, 1);
    var callY = base + 18 + maxLines * 13 + 10;
    var h = Math.max(320, d.callout ? callY + 44 : callY + 8);
    var s = open(h);
    var maxV = Math.max.apply(null, d.items.map(function (i) { return i.value; }));
    var n = d.items.length, bw = Math.min(96, (W - x0 - 30) / n - 26);
    var gap = (W - x0 - 30 - bw * n) / Math.max(1, n - 1);
    s += txt(x0, 34, d.title, { size: 15, weight: 700 });
    if (d.subtitle) s += txt(x0, 54, d.subtitle, { size: 12, fill: C.slate });
    s += '<line x1="' + x0 + '" y1="' + base + '" x2="' + (W - 24) + '" y2="' + base + '" stroke="' + C.line + '"/>';
    d.items.forEach(function (it, i) {
      var h = maxV ? (it.value / maxV) * (base - top) : 0;
      var x = x0 + i * (bw + gap);
      var isHi = it.tone === 'accent';
      s += rect(x, base - h, bw, h, { fill: isHi ? C.soft : it.tone === 'bad' ? C.badSoft : C.bg,
                                      stroke: isHi ? C.accent : it.tone === 'bad' ? C.bad : C.mute, sw: 1.4, r: 3 });
      s += txt(x + bw / 2, base - h - 10, money(it.value), { anchor: 'middle', size: 13, weight: 700 });
      it.label.split('\n').forEach(function (ln, li) {
        s += txt(x + bw / 2, base + 18 + li * 13, ln, { anchor: 'middle', size: 10.5, fill: C.slate });
      });
    });
    if (d.callout) {
      s += rect(x0, callY, W - x0 - 24, 34, { fill: C.warnSoft, stroke: C.warn });
      s += txt(x0 + 12, callY + 22, d.callout, { size: 12.5, weight: 700, fill: C.warn });
    }
    return s + '</svg>';
  }

  /* ---------- 5. Две колонки: расчёт истца против расчёта ответчика ---------- */
  function split(d) {
    var s = open(), x0 = 34, colW = (W - x0 * 2 - 18) / 2;
    s += txt(x0, 34, d.title, { size: 15, weight: 700 });
    [d.left, d.right].forEach(function (col, ci) {
      var x = x0 + ci * (colW + 18), y = 62;
      var accent = ci === 0 ? C.slate : C.accent;
      s += rect(x, y, colW, 226, { fill: ci === 0 ? C.bg : C.soft, stroke: ci === 0 ? C.line : C.accent });
      s += txt(x + 12, y + 24, col.title, { size: 12.5, weight: 700, fill: accent });
      col.rows.forEach(function (r, i) {
        var ry = y + 50 + i * 26;
        s += txt(x + 12, ry, r[0], { size: 11, fill: C.slate });
        s += txt(x + colW - 12, ry, r[1], { size: 11.5, weight: 600, anchor: 'end' });
      });
      var ty = y + 200;
      s += '<line x1="' + (x + 12) + '" y1="' + (ty - 18) + '" x2="' + (x + colW - 12) + '" y2="' + (ty - 18) +
           '" stroke="' + C.line + '"/>';
      s += txt(x + 12, ty, col.totalLabel, { size: 11.5, weight: 700 });
      s += txt(x + colW - 12, ty, col.total, { size: 13.5, weight: 700, anchor: 'end', fill: accent });
    });
    return s + '</svg>';
  }

  /* ---------- 6. Таблица ---------- */
  function table(d) {
    var s = open(), x0 = 34, y = 62, rowH = 26;
    var cols = d.cols, widths = d.widths || cols.map(function () { return (W - x0 * 2) / cols.length; });
    s += txt(x0, 34, d.title, { size: 15, weight: 700 });
    s += rect(x0, y, W - x0 * 2, rowH, { fill: C.bg, stroke: C.line, r: 3 });
    var cx = x0;
    cols.forEach(function (c, i) {
      s += txt(cx + 8, y + 17, c, { size: 10.5, weight: 700, fill: C.slate });
      cx += widths[i];
    });
    d.rows.forEach(function (r, ri) {
      var ry = y + rowH + ri * rowH;
      if (ri % 2) s += rect(x0, ry, W - x0 * 2, rowH, { fill: C.bg, r: 0 });
      cx = x0;
      r.forEach(function (cell, i) {
        s += txt(cx + 8, ry + 17, cell, { size: 11, fill: i === 0 ? C.ink : C.slate });
        cx += widths[i];
      });
      s += '<line x1="' + x0 + '" y1="' + (ry + rowH) + '" x2="' + (W - x0) + '" y2="' + (ry + rowH) +
           '" stroke="' + C.line + '"/>';
    });
    return s + '</svg>';
  }

  /* ---------- 7. Простой список (намеренно слабая визуализация) ---------- */
  function list(d) {
    var s = open(), x0 = 34, y = 70;
    s += txt(x0, 34, d.title, { size: 15, weight: 700 });
    d.items.forEach(function (it, i) {
      s += '<circle cx="' + (x0 + 4) + '" cy="' + (y + i * 30 - 4) + '" r="3" fill="' + C.slate + '"/>';
      s += txt(x0 + 18, y + i * 30, it, { size: 12.5, fill: C.ink });
    });
    return s + '</svg>';
  }

  var kinds = { timeline: timeline, waterfall: waterfall, chain: chain,
                bars: bars, split: split, table: table, list: list };

  return {
    render: function (spec) {
      var fn = kinds[spec.kind];
      return fn ? fn(spec) : '<svg viewBox="0 0 10 10"></svg>';
    },
    money: money
  };
})();
