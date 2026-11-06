/* 一恒体系 · 命理板块（四柱 + 紫微 + 大限）
 * 复用语料：engine.js（排盘引擎）· data.js（数据包）· report.js（报告规则）
 * 板块契约：YH.boards.mingli.mount(rootEl)
 */
(function (root) {
  'use strict';

  var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var names = ['年柱', '月柱', '日柱', '时柱'];
  var STEM_WX = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' };
  var BRANCH_WX = { '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火', '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水' };

  function mount(rootEl) {
    var YH = root.YH;   /* app.js 最后加载，只能在运行时取 */
    /* 出生小时按整点选择，与参考站颗粒度一致（大运交运日按整点推算） */
    var hourOpts = '';
    for (var oh = 0; oh < 24; oh++) {
      var zhiName = ZHI[Math.floor(((oh + 1) % 24) / 2)];
      var hourLabel = oh === 23 ? '23 点 · 晚子时' : oh + ' 点 · ' + zhiName + '时';
      hourOpts += '<option value="' + oh + '"' + (oh === 7 ? ' selected' : '') + '>' + hourLabel + '</option>';
    }
    rootEl.innerHTML = '' +
      '<div class="card">' +
        '<div class="row">' +
          '<input id="mlDate" type="date" value="2000-03-15" aria-label="出生日期">' +
          '<select id="mlHour" aria-label="出生时间">' + hourOpts + '</select>' +
          '<select id="mlGender" style="flex:0 0 86px" aria-label="性别"><option>男</option><option>女</option></select>' +
        '</div>' +
        '<button class="btn" id="mlRun">排 盘</button>' +
        '<div class="ml-dirty" id="mlDirty">参数已改，点『排盘』更新</div>' +
        '<div class="hint" style="margin:8px 0 0">默认是示例生日（2000-03-15 7 点 · 辰时）——改成你自己的出生小时再点排盘。<br>年柱＝岁序（360 日一岁）· 月柱＝平气月 · 日柱＝连续干支 · 时柱＝时辰。</div>' +
      '</div>' +
      '<div class="ml-empty" id="mlEmpty">填好出生时间与性别，点『排盘』查看四柱、紫微与十年大运。</div>' +
      '<div id="mlPillars"></div>' +
      '<div id="mlSky"></div>' +
      '<div id="mlFour"></div>' +
      '<div id="mlPal"></div>' +
      '<div id="mlDx"></div>' +
      '<div id="mlReport"></div>';

    var $d = rootEl.querySelector('#mlDate');
    var $h = rootEl.querySelector('#mlHour');
    var $g = rootEl.querySelector('#mlGender');
    var $empty = rootEl.querySelector('#mlEmpty');
    var $dirty = rootEl.querySelector('#mlDirty');
    var last = null;
    var ran = false;

    function clearPanels() {
      ['#mlPillars', '#mlSky', '#mlFour', '#mlPal', '#mlDx', '#mlReport'].forEach(function (s) {
        rootEl.querySelector(s).innerHTML = '';
      });
    }

    function markDirty() {
      if (ran) $dirty.className = 'ml-dirty on';
    }

    function run() {
      $dirty.className = 'ml-dirty';
      var y = parseInt(($d.value || '').slice(0, 4), 10);
      if (!y || y < 1900 || y > 2100) {
        $empty.hidden = true;
        clearPanels();
        rootEl.querySelector('#mlPillars').innerHTML = '<div class="card"><b style="color:var(--red2)">日期超出范围</b><div class="hint">本页数据包覆盖 1900–2100 年，请把出生日期改到这个区间。</div></div>';
        return;
      }
      try {
        var hour = +$h.value;
        var r = root.ML.compute({ date: $d.value, hour: hour, minute: 0, gender: $g.value });
        last = r;
        renderPillars(r);
        renderSky(r);
        renderFour(r);
        renderPalaces(r);
        renderDaxian(r);
        renderReport(r);
        $empty.hidden = true;
        ran = true;
      } catch (e) {
        $empty.hidden = true;
        clearPanels();
        rootEl.querySelector('#mlPillars').innerHTML = '<div class="card"><b style="color:var(--red2)">排盘失败</b><div class="hint">' +
          YH.esc(e && e.message ? e.message : e) + '（日期支持 1900–2100）</div></div>';
      }
    }

    function renderPillars(r) {
      var html = '<h2 class="h2"><span class="n">1</span>这一刻的干支</h2>' +
        '<div class="pillars">';
      r.pillars.forEach(function (p, i) {
        html += '<div class="pil' + (i === 2 ? ' day' : '') + '">' +
          '<div class="t">' + names[i] + '</div>' +
          '<div class="g">' + p + '</div></div>';
      });
      html += '</div><div class="sub">农历 ' + r.lunar.month + '月' + r.lunar.day + '日 · 岁序 ' + r.year + ' · 平气月 ' + r.month + '</div>';
      rootEl.querySelector('#mlPillars').innerHTML = html;
    }

    function renderSky(r) {
      var s = r.sky, cx = 180, cy = 150, R = 118;
      var svg = '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="#3a2f1e"/>';
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R - 22) + '" fill="none" stroke="#241d14" stroke-dasharray="2 6"/>';
      for (var i = 0; i < 12; i++) {
        var a = (i * 30) * Math.PI / 180;
        var x1 = cx + R * Math.cos(a), y1 = cy - R * Math.sin(a);
        var x2 = cx + (R + 8) * Math.cos(a), y2 = cy - (R + 8) * Math.sin(a);
        svg += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="#3a2f1e"/>';
        var zx = cx + (R + 20) * Math.cos(a), zy = cy - (R + 20) * Math.sin(a);
        svg += '<text x="' + zx.toFixed(1) + '" y="' + (zy + 4).toFixed(1) + '" font-size="11" fill="#6f665a" text-anchor="middle">' + ZHI[i] + '</text>';
      }
      function mark(lon, color, label, rr) {
        var a = lon * Math.PI / 180, x = cx + (R - 34) * Math.cos(a), y = cy - (R - 34) * Math.sin(a);
        return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + rr + '" fill="' + color + '"/>' +
          '<text x="' + x.toFixed(1) + '" y="' + (y - rr - 7).toFixed(1) + '" font-size="11.5" fill="' + color + '" text-anchor="middle">' + label + '</text>';
      }
      var aa = s.sun.lon * Math.PI / 180;
      svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + R * Math.cos(aa)).toFixed(1) + '" y2="' + (cy - R * Math.sin(aa)).toFixed(1) + '" stroke="#5a4a26" stroke-dasharray="4 4"/>';
      svg += mark(s.jupiter.lon, '#d8b46a', '木星', 7);
      svg += mark(s.moon.lon, '#cfd9e6', '月亮', 5.5);
      svg += mark(s.sun.lon, '#f0d59a', '太阳', 7);
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="#3f7ea8"/><text x="' + cx + '" y="' + (cy + 22) + '" font-size="10.5" fill="#6f665a" text-anchor="middle">地球</text>';
      svg += '<text x="8" y="16" font-size="10.5" fill="#6f665a">外圈＝黄道十二支（0°白羊起，逆时针）</text>';

      var html = '<h2 class="h2"><span class="n">2</span>出生这一刻，天上在发生什么</h2>' +
        '<div class="hint">太阳、月亮、木星各自走到黄道的哪个位置——干支就是从这三种周期里来的。</div>' +
        '<div class="sky"><svg viewBox="0 0 360 300" role="img" aria-label="出生时刻日月木星黄道位置">' + svg + '</svg>' +
        '<div class="sky3">' +
          '<div><b>太阳</b><div class="m">' + s.sun.m.name + ' · ' + s.sun.sign + '座</div><div>出生时' + (s.sun.alt > 0 ? '已升起' : '未升起') + '（' + s.sun.alt.toFixed(0) + '°）</div></div>' +
          '<div><b>月亮</b><div class="m">' + s.moon.phase + '</div><div>月龄 ' + s.moon.age.toFixed(1) + ' 天 · ' + s.moon.m.name + '</div></div>' +
          '<div><b>木星</b><div class="m">' + s.jupiter.m.name + ' · ' + s.jupiter.sign + '座</div><div>' + (s.jupiter.retro ? '在逆行' : '在顺行') + ' · 距地 ' + s.jupiter.dist.toFixed(1) + ' AU</div></div>' +
        '</div></div>';
      rootEl.querySelector('#mlSky').innerHTML = html;
    }

    function renderFour(r) {
      var gans = r.pillars.map(function (p) { return p.charAt(0); });
      var zhis = r.pillars.map(function (p) { return p.charAt(1); });
      var wxs = r.pillars.map(function (p) { return STEM_WX[p.charAt(0)] + BRANCH_WX[p.charAt(1)]; });
      var gods = r.gods || ['', '', '日元', ''];
      function rowHTML(label, vals, cls) {
        var cells = vals.map(function (c, i) {
          var day = i === 2 ? ' ft-day' : '';
          if (cls === 'god') return '<td class="ft-god' + (c === '日元' ? ' ft-yuan' : '') + day + '">' + c + '</td>';
          if (cls === 'wx') return '<td class="ft-wx' + day + '">' + c + '</td>';
          return '<td class="ft-gz' + day + '">' + c + '</td>';
        }).join('');
        return '<tr><td class="ft-lbl">' + label + '</td>' + cells + '</tr>';
      }
      var body = rowHTML('十神', gods, 'god') +
        rowHTML('天干', gans, 'gz') +
        rowHTML('地支', zhis, 'gz') +
        rowHTML('五行', wxs, 'wx');
      rootEl.querySelector('#mlFour').innerHTML = '<h2 class="h2"><span class="n">3</span>四柱排盘</h2>' +
        '<div class="hint">年柱＝岁序 · 月柱＝平气月 · 日柱＝连续干支 · 时柱＝时辰；十神以日干为基准。</div>' +
        '<div class="card tight"><table class="four-table"><thead><tr>' +
        '<th>—</th><th>年柱</th><th>月柱</th><th>日柱</th><th>时柱</th></tr></thead><tbody>' + body + '</tbody></table></div>';
    }

    function renderPalaces(r) {
      var zw = r.ziwei;
      var ORDER = [['巳', 1, 1], ['午', 1, 2], ['未', 1, 3], ['申', 1, 4], ['辰', 2, 1], ['酉', 2, 4], ['卯', 3, 1], ['戌', 3, 4], ['寅', 4, 1], ['丑', 4, 2], ['子', 4, 3], ['亥', 4, 4]];
      var map = {};
      zw.palaces.forEach(function (p) { map[p.b] = p; });
      var html = '';
      ORDER.forEach(function (o) {
        var b = o[0], p = map[b] || { stars: [], name: '' };
        var stars = (p.stars || []).map(function (s) {
          return '<span class="' + (s.m ? 'mut' : '') + '">' + s.n + (s.m ? '<sup>' + s.m + '</sup>' : '') + '</span>';
        }).join(' ');
        var life = b === zw.lifeB ? ' life' : '';
        html += '<div class="pc' + life + '" style="grid-row:' + o[1] + ';grid-column:' + o[2] + '">' +
          '<div class="pb">' + b + '·' + (p.stem || '') + '</div><div class="pn">' + (p.name || '') +
          (b === zw.lifeB ? ' 命' : '') + (b === zw.bodyB ? ' 身' : '') + '</div>' +
          '<div class="ps">' + (stars || '—') + '</div></div>';
      });
      html += '<div class="mid"><div class="y">' + zw.bureau.cn + '</div><div class="d">命宫 ' + zw.lifeB + ' · 身宫 ' + zw.bodyB +
        '<br>命主 ' + zw.mingzhu + ' · 身主 ' + zw.shenzhu + '</div></div>';
      rootEl.querySelector('#mlPal').innerHTML = '<h2 class="h2"><span class="n">4</span>紫微盘</h2>' +
        '<div class="hint">十二宫与星曜：命宫标金框，四化标在星名右上角（新修体系）。</div>' +
        '<div class="pal">' + html + '</div>';
    }

    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    function dateText(o) { return o.year + '-' + pad2(o.month) + '-' + pad2(o.day); }
    function dateNum(o) { return o.year * 10000 + o.month * 100 + o.day; }
    function todayNum() {
      var d = new Date();
      return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    }
    function skyPos(o) { return (o.lon / 360 * 100).toFixed(1) + '%'; }
    function skyLine(label, o) {
      return label + ' <b>' + o.sign + ' ' + Math.floor(o.lon) + '°（' + o.m.name + '）</b>';
    }

    function renderDaxian(r) {
      var list = r.dayun || [];
      var today = todayNum();
      var html = list.map(function (x, i) {
        var cur = today >= dateNum(x.start) && today <= dateNum(x.end);
        var s = x.sky;
        var tg = root.ML.tenGod(r.pillars[2].charAt(0), x.pillar.charAt(0));
        return '<div class="dxi' + (cur ? ' current' : '') + '">' +
          '<div class="dxh">' +
            '<span class="dxl"><b>第 ' + (i + 1) + ' 运 · ' + x.pillar + '</b>' +
              (tg ? '<em class="dxg" title="大限十神">' + tg + '</em>' : '') +
              '<i>' + x.startAge + '~' + x.endAge + ' 岁</i>' +
              (cur ? '<em class="dxtag">当前</em>' : '') + '</span>' +
            '<span class="dxr">' + dateText(x.start) + ' ~ ' + dateText(x.end) + '</span>' +
          '</div>' +
          '<div class="strip">' +
            '<span class="sun" style="left:' + skyPos(s.sun) + '"></span>' +
            '<span class="moon" style="left:' + skyPos(s.moon) + '"></span>' +
            '<span class="jup" style="left:' + skyPos(s.jupiter) + '"></span>' +
          '</div>' +
          '<div class="dxs">' + skyLine('太阳', s.sun) + ' · ' + skyLine('月亮', s.moon) + ' · ' + skyLine('木星', s.jupiter) + '</div>' +
        '</div>';
      }).join('');
      var startAge = list.length ? list[0].startAge : 0;
      rootEl.querySelector('#mlDx').innerHTML = '<h2 class="h2"><span class="n">5</span>十年大限 · 四柱大运</h2>' +
        '<div class="hint">按新修四柱起运（本盘 ' + startAge + ' 岁起运），每运 3600 天；大限干支的十神以日干为基准。每运开头时太阳、月亮、木星在黄道的位置。</div>' +
        '<div class="dx-legend"><span><i class="lgsun"></i>太阳</span><span><i class="lgmoon"></i>月亮</span><span><i class="lgjup"></i>木星</span></div>' +
        '<div class="dx">' + html + '</div>';
    }

    function renderReport(r) {
      var rep, free;
      try { rep = root.REPORT.build(r); free = rep.free; }
      catch (e) { rootEl.querySelector('#mlReport').innerHTML = ''; return; }
      var html = '<h2 class="h2"><span class="n">6</span>盘面与简要结论</h2>' +
        '<div class="card">' +
          '<div style="font-size:15px;color:var(--gold2);line-height:1.8">' + free.summary + '</div>' +
          '<div class="freekey">' + free.keys.map(function (k) {
            var seg = k.split('·');
            return '<span>' + (seg.length > 1 ? seg.slice(1).join('·') : k) + '</span>';
          }).join('') + '</div>' +
          '<div style="font-size:13px;color:#b9c8a8;margin-top:8px">⚠ 最该注意：' + free.caution + '</div>' +
        '</div>' +
        '<div id="mlCta"></div>';
      rootEl.querySelector('#mlReport').innerHTML = html;

      var host = rootEl.querySelector('#mlCta');
      var hourText = ($h.options[$h.selectedIndex] || {}).text || '';
      hourText = hourText.split('（')[0].trim();
      var copyText = '一恒体系 · 命理\n出生：' + $d.value + ' ' + hourText + ' ' + $g.value +
        '\n四柱：' + r.pillars.join(' ') +
        '\n十神：' + (r.gods || []).join(' ') +
        '\n农历 ' + r.lunar.month + '月' + r.lunar.day + '日 · 岁序 ' + r.year + ' · 平气月 ' + r.month;
      var wxId = (YH.WX && YH.WX.id) || 'xy1618fff';
      var opts = {
        title: '完整命理报告',
        text: '四柱结构 → 生命课题 → 大运流年 → 进退建议，需要结合出生时间逐项推演。加微信 ' + wxId + ' 获取。',
        copyText: copyText,
        wxKeyword: '报告'
      };
      var contact = (root.YH && root.YH.contact) || null;
      if (contact) {
        contact(host, opts);
      } else {
        host.innerHTML = '<div class="lock"><div class="lk-t">' + YH.esc(opts.title) + '</div>' +
          '<p class="lk-p">' + YH.esc(opts.text) + '</p></div>';
      }
    }

    rootEl.querySelector('#mlRun').addEventListener('click', run);
    [$d, $h, $g].forEach(function (el) {
      el.addEventListener('input', markDirty);
      el.addEventListener('change', markDirty);
    });
  }

  root.YH = root.YH || {};
  root.YH.boards = root.YH.boards || {};
  root.YH.boards.mingli = { mount: mount };
})(window);
