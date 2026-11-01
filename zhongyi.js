/* 一恒中医体系 · 中医调理 / 辨证自查
 * 纯静态、浏览器内计算；无框架、无外链、无网络请求。
 * 依赖：window.ZY_DATA（zhongyi-data.js）；可选 window.YH.esc / YH.toast / YH.copy / YH.contact。
 */
(function (root) {
  'use strict';

  var DATA = root.ZY_DATA || { groups: [], symptoms: [], types: {} };
  var GROUPS = DATA.groups || [];
  var SYMPTOMS = DATA.symptoms || [];
  var TYPES = DATA.types || {};
  var TYPE_NAMES = Object.keys(TYPES);
  var BY_ID = {};
  var ORDER = {};
  SYMPTOMS.forEach(function (s, i) { BY_ID[s.id] = s; ORDER[s.id] = i; });

  var WX_ID = (root.YH && (root.YH.wx || root.YH.WX)) || 'xy1618fff';
  var REP_FOOT = '本页依据症状倾向生成，仅供健康参考，不替代面诊与诊断；具体方药与剂量须由执业医师面诊后决定。';

  /* ---------------- 基础工具 ---------------- */

  function esc(s) {
    s = (s == null ? '' : String(s));
    if (root.YH && typeof root.YH.esc === 'function') {
      try {
        var v = root.YH.esc(s);
        if (typeof v === 'string') return v;
      } catch (e) { /* fall through */ }
    }
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(msg) {
    if (root.YH && typeof root.YH.toast === 'function') {
      try { root.YH.toast(msg); return; } catch (e) { /* ignore */ }
    }
  }

  function round1(n) { return Math.round(n * 10) / 10; }

  function closest(el, sel) {
    while (el && el !== root.document) {
      if (el.nodeType === 1 && el.matches && el.matches(sel)) return el;
      el = el.parentNode;
    }
    return null;
  }

  function listHTML(items, cls) {
    return '<ul class="' + (cls || 'zy-list') + '">' +
      items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
  }

  /* ---------------- 辨证引擎 ---------------- */

  function diagnose(selectedIds, extra) {
    extra = (extra && typeof extra === 'object') ? extra : {};
    var special = extra.special || [];
    if (typeof special === 'string') special = [special];

    var ids = [], seen = {}, i, j;
    (selectedIds || []).forEach(function (id) {
      if (typeof id === 'string' && BY_ID[id] && !seen[id]) { seen[id] = 1; ids.push(id); }
    });
    var count = ids.length;

    var scores = {}, cover = {};
    TYPE_NAMES.forEach(function (n) { scores[n] = 0; cover[n] = 0; });

    ids.forEach(function (id) {
      var w = BY_ID[id].w || {};
      Object.keys(w).forEach(function (n) {
        if (scores[n] === undefined) return;
        scores[n] += w[n];
        cover[n] += 1;
      });
    });

    // 同一证型被多条症状共同指向，才加权；避免单条偶然命中
    TYPE_NAMES.forEach(function (n) {
      if (cover[n] >= 2) scores[n] += Math.min(3, (cover[n] - 1) * 0.6);
    });

    function has(id) { return !!seen[id]; }
    function bump(name, delta) {
      if (scores[name] === undefined) return;
      scores[name] = Math.max(0, scores[name] + delta);
    }

    var rules = [];
    var coldSignal = has('paLeng') || has('weiHanShenRe') || has('shouJiaoLiang');
    var dampCold = has('daBianTang') || has('yeNiao') || has('xiaoBianQing') || has('shouJiaoLiang');
    var yellow = has('taiHuang') || has('taiHuangRun');

    if (yellow && coldSignal && dampCold) {
      bump('上热下寒', 2); bump('肾阳虚', 1.5); bump('寒湿困脾', 1);
      bump('湿热蕴结', -1.5); bump('肝郁化火', -1); bump('胃热', -1);
      rules.push('苔黄但怕冷、手足凉或便溏，先按寒热错杂看，不把苔黄直接当实火');
    }
    if (has('shangReXiaHan')) {
      bump('上热下寒', 2);
      rules.push('上身热、下身冷同时出现，是上热下寒的典型格局');
    }
    if (has('sheYu') || has('maiSe')) {
      bump('血瘀', 1.5);
      rules.push('舌暗紫或有瘀斑、脉涩，提示血行不畅');
    }
    if (has('daoHan') && (has('shouJiaoXinRe') || has('kouGan')) && (has('taiBoLuo') || has('sheHong'))) {
      bump('阴虚火旺', 2);
      rules.push('盗汗、口干或手足心热，加舌红少苔，指向阴虚内热');
    }
    if (has('taiHuangNi') && (has('daBianNian') || has('mianYouDou') || has('kouNian'))) {
      bump('湿热蕴结', 2);
      rules.push('苔黄腻加便黏、面油或口黏，是湿热互结的指纹');
    }
    if (has('daBianTang') && (has('shePang') || has('taiBaiNi')) && has('faLi')) {
      bump('脾虚湿盛', 2);
      rules.push('便溏加舌胖齿痕或苔白腻，再加乏力，指向脾虚湿盛');
    }
    if (has('kouKu') && (has('liangXieZhang') || has('fanZao')) && (has('taiHuang') || has('sheHong'))) {
      bump('肝郁化火', 1.5);
      rules.push('口苦加胁胀或易怒，再加舌红苔黄，是肝郁化火');
    }
    if (has('sheJianHong') && has('xiaoBianHuang') && has('ruShuiNan')) {
      bump('心火亢盛', 1.5);
      rules.push('舌尖红、小便黄、入睡难同现，心火下移小肠');
    }
    if (has('yeNiao') && has('yaoLeng')) {
      bump('肾阳虚', 2);
      rules.push('夜尿多加腰膝冷，是肾阳虚的定位');
    }
    if (has('taiBaiNi') && (has('tiPang') || has('touZhong'))) {
      bump('痰湿内阻', 1.5);
      rules.push('苔白厚腻加体胖或头重，指向痰湿');
    }

    if (extra.drinkTemp === 'hot' && yellow) {
      if (coldSignal) {
        bump('肾阳虚', 1); bump('寒湿困脾', 1); bump('湿热蕴结', -1);
        rules.push('你说想喝热水：苔黄更可能是假热，清热药要慎');
      }
    } else if (extra.drinkTemp === 'cold' && coldSignal) {
      rules.push('你想喝冷水，但又有怕冷、手足凉或便溏：按寒热错杂处理，不单纯清热也不单纯温补');
    }

    var ranking = TYPE_NAMES.map(function (n) {
      return { name: n, score: round1(scores[n]), cover: cover[n] };
    }).sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return TYPE_NAMES.indexOf(a.name) - TYPE_NAMES.indexOf(b.name);
    });

    var top = ranking[0] || { name: '', score: 0, cover: 0 };
    var second = ranking[1] || { name: '', score: 0, cover: 0 };
    var margin = top.score - second.score;
    var primaryName = (count > 0 && top.score > 0) ? top.name : '';
    var confidence, pct, note;

    if (count < 3 || !top.name || top.score <= 0) {
      confidence = '信息不足';
      pct = Math.min(38, Math.round(16 + Math.max(0, top.score) * 3));
      note = '只勾了 ' + count + ' 项，样本太少。先补舌象、二便、睡眠，再补 2–3 项就能定方向。';
    } else if (top.score >= 8 && margin >= 3 && top.cover >= 3) {
      confidence = '倾向明显';
      pct = Math.min(94, Math.round(52 + margin * 4 + Math.min(18, top.cover * 2)));
      note = '主证与第二名的分差较大，且有多条症状共同指向。';
    } else {
      confidence = '有一定倾向';
      pct = Math.min(88, Math.round(50 + margin * 4 + Math.min(18, top.cover * 2)));
      note = '方向有了，但主证与兼证拉得不算开。先按主证调，7 天后复评。';
    }

    var secondary = ranking.slice(1).filter(function (x) {
      return x.score >= Math.max(2, top.score * 0.35);
    }).slice(0, 3).map(function (x) { return x.name; });

    var evidenceDetail = [];
    if (top.name) {
      var topType = TYPES[top.name];
      var picked = ids.filter(function (id) {
        return BY_ID[id].w && BY_ID[id].w[top.name] > 0;
      }).map(function (id) {
        return { id: id, name: BY_ID[id].name, weight: BY_ID[id].w[top.name], order: ORDER[id] };
      }).sort(function (a, b) {
        if (b.weight !== a.weight) return b.weight - a.weight;
        return a.order - b.order;
      }).slice(0, 5);
      picked.forEach(function (p) {
        var why = (topType.signs && topType.signs[p.name]) || '与本证型的典型指纹相符';
        evidenceDetail.push({ id: p.id, name: p.name, text: why, weight: p.weight });
      });
    }

    var outScores = {};
    ranking.forEach(function (x) { outScores[x.name] = x.score; });

    return {
      primary: primaryName,
      secondary: secondary,
      scores: outScores,
      ranking: ranking,
      confidence: confidence,
      confidencePct: pct,
      evidence: evidenceDetail.map(function (e) { return e.name + ' → ' + e.text; }),
      evidenceDetail: evidenceDetail,
      rules: rules,
      count: count,
      coverage: top.cover,
      margin: round1(margin),
      note: note,
      extra: extra
    };
  }

  /* ---------------- 报告（gate 的 render） ---------------- */

  function safetyText(extra) {
    var special = (extra && extra.special) || [];
    if (typeof special === 'string') special = [special];
    var parts = ['本方案依据症状倾向生成，不是面诊，也不能替代医生的诊断与检查。'];
    if (special.indexOf('western') >= 0) {
      parts.push('你标记了正在服西药：中药与西药间隔 1–2 小时；抗凝、降压、降糖、免疫抑制剂四类须监测，不自行停西药。');
    } else {
      parts.push('正在服西药者，中药与西药间隔 1–2 小时，不自行停西药。');
    }
    parts.push('孕妇、哺乳期、儿童、老人、肝肾功能不全者，方剂与剂量须经医师确认。');
    parts.push('出现胸痛、呼吸困难、剧烈腹痛、高热不退、呕血黑便、意识改变、单侧肢体无力或不明出血，立即就医。');
    return parts.join('');
  }

  function rxLine(label, text, danger) {
    return '<div class="zy-rxline' + (danger ? ' zy-danger' : '') + '"><b>' + esc(label) + '</b><span>' + text + '</span></div>';
  }

  function secHead(n, title, hint) {
    return '<div class="zy-sec-h"><span class="zy-sec-n">' + esc(n) + '</span><h3>' + esc(title) + '</h3><em>' + esc(hint) + '</em></div>';
  }

  /* ---------------- 调护方向（不含方药） ---------------- */

  function buildCare(r) {
    var t = TYPES[r.primary];
    if (!t) return '';
    var h = [];
    h.push('<div class="zy-care">');

    h.push('<div class="zy-sec">');
    h.push(secHead('一', '外治与食疗', '不抓药也能做的'));
    h.push('<h4 class="zy-subh">外治</h4>');
    h.push(listHTML(t.external.map(function (x) { return esc(x); })));
    h.push('<h4 class="zy-subh">食疗</h4>');
    h.push(listHTML(t.diet.map(function (x) { return esc(x); })));
    h.push('<p class="zy-p">外治与食疗是打底：皮肤破损、发热、孕期时先停外治；艾灸后 2 小时不碰冷水。</p>');
    h.push('</div>');

    h.push('<div class="zy-sec">');
    h.push(secHead('二', '忌口 · 情志', '把非药物层做完'));
    h.push('<h4 class="zy-subh">忌口与生活</h4>');
    h.push(listHTML(t.avoid.map(function (x) { return esc(x); })));
    h.push('<h4 class="zy-subh">情志动作</h4>');
    h.push('<div class="zy-emotion"><b>' + esc(t.emotion.title) + '</b>' + esc(t.emotion.action) + '</div>');
    h.push('</div>');

    h.push('<div class="zy-safety"><b>安全提示</b> ' + safetyText(r.extra) + '</div>');
    h.push('<div class="zy-rep-foot"><b>一 恒 中 医 体 系</b>' + esc(REP_FOOT) + '</div>');
    h.push('</div>');
    return h.join('');
  }

  /* ---------------- 页面渲染 ---------------- */

  var state = { sel: {}, drink: '', special: {}, last: null, lastIds: null, copyText: '' };

  function chipHTML(s) {
    return '<button type="button" class="zy-chip" data-id="' + s.id + '" aria-pressed="false"' +
      (s.tip ? ' title="' + esc(s.tip) + '"' : '') + '>' + esc(s.name) + '</button>';
  }

  function groupsHTML() {
    return GROUPS.map(function (g) {
      var list = SYMPTOMS.filter(function (s) { return s.g === g.id; });
      if (!list.length) return '';
      var open = g.id === 'cold' ? ' open' : '';
      return '<details class="zy-grp" data-g="' + g.id + '"' + open + '>' +
        '<summary class="zy-sum">' +
        '<span class="zy-gname">' + esc(g.name) + '</span>' +
        '<span class="zy-ghint">' + esc(g.hint || '') + '</span>' +
        '<span class="zy-gn" data-gn="' + g.id + '">0/' + list.length + '</span>' +
        '<span class="zy-chev"></span>' +
        '</summary>' +
        '<div class="zy-chips">' + list.map(chipHTML).join('') + '</div>' +
        '</details>';
    }).join('');
  }

  function shellHTML() {
    var h = [];
    /* 板块标题由 app.js 的 boardhead 统一渲染，这里不再放 hero 大标题 */
    h.push('<div class="zy-hero">');
    h.push('<div class="zy-orn"><i></i></div>');
    h.push('<div class="zy-meta"><span>' + GROUPS.length + ' 组 · ' + SYMPTOMS.length + ' 项</span><span>约 2 分钟</span><span>浏览器内计算</span></div>');
    h.push('</div>');

    h.push('<div class="zy-warn"><b>先看这一条</b>');
    h.push('<p><em>仅供健康参考</em>，不替代面诊与诊断，也不构成用药建议。急症、剧痛、高热、出血、意识改变，请立即就医。孕妇、哺乳期、儿童、慢病及正在服药者，方剂与剂量须经医师确认。</p>');
    h.push('<details class="zy-rf"><summary>出现这些情况，先去医院</summary>');
    h.push('<ul><li>胸痛、胸闷持续不缓解，或呼吸困难</li><li>剧烈腹痛、呕血、黑便</li><li>高热超过 3 天不退</li><li>意识改变、单侧肢体无力、言语不清</li><li>不明原因出血，或体重短期骤降</li><li>精神症状加重，或有自伤念头</li></ul>');
    h.push('</details></div>');

    h.push('<div class="zy-steps">');
    h.push('<div class="zy-step"><b>01</b><span>勾症状</span><i></i></div>');
    h.push('<div class="zy-step"><b>02</b><span>看倾向</span><i></i></div>');
    h.push('<div class="zy-step"><b>03</b><span>看调护</span><i></i></div>');
    h.push('</div>');

    h.push('<div class="zy-panel">');
    h.push('<div class="zy-bar">');
    h.push('<div class="zy-count"><span>已选</span><b data-role="count">0</b><em>项</em></div>');
    h.push('<div class="zy-bar-r"><div class="zy-meter"><i data-role="meter"></i></div><button type="button" class="zy-clear" data-role="clear">清空</button></div>');
    h.push('</div>');
    h.push('<div data-role="groups">' + groupsHTML() + '</div>');
    h.push('<div class="zy-extra">');
    h.push('<h4>两个加问 <em>可不答，答了更准</em></h4>');
    h.push('<p>想喝热水还是冷水？这一条决定“真热”还是“假热”。</p>');
    h.push('<div class="zy-seg" data-k="drink"><button type="button" data-v="hot">想喝热水</button><button type="button" data-v="cold">想喝冷水</button><button type="button" data-v="none">都行 / 没注意</button></div>');
    h.push('<p>有没有需要特别避开的情况？可多选。</p>');
    h.push('<div class="zy-seg" data-k="special"><button type="button" data-v="none">无</button><button type="button" data-v="pregnant">怀孕 / 哺乳</button><button type="button" data-v="western">在服西药</button></div>');
    h.push('<div class="zy-note" data-role="hint" hidden></div>');
    h.push('</div>');
    h.push('</div>');

    h.push('<div class="zy-cta"><button type="button" class="zy-go" data-role="go" disabled>');
    h.push('<span><span data-role="go-label">先勾选症状</span><small>至少 1 项；3 项以上才能定方向</small></span>');
    h.push('<span class="zy-go-n" data-role="go-n">未选</span>');
    h.push('</button></div>');

    h.push('<section class="zy-result" data-role="result" hidden></section>');
    h.push('<footer class="zy-foot"><b>一 恒 中 医 体 系</b>辨证自查 · 浏览器内计算 · 不采集、不上传任何信息</footer>');
    return h.join('');
  }

  function refresh(rootEl) {
    var n = Object.keys(state.sel).length;
    var countEl = rootEl.querySelector('[data-role="count"]');
    if (countEl) countEl.textContent = n;
    var meter = rootEl.querySelector('[data-role="meter"]');
    if (meter) meter.style.width = Math.min(100, n / 8 * 100) + '%';

    var go = rootEl.querySelector('[data-role="go"]');
    var goN = rootEl.querySelector('[data-role="go-n"]');
    var goLabel = rootEl.querySelector('[data-role="go-label"]');
    if (go) go.disabled = n === 0;
    if (goN) goN.textContent = n ? (n + ' 项') : '未选';
    if (goLabel) goLabel.textContent = n === 0 ? '先勾选症状' : (state.last ? '重新辨证' : '开始辨证');

    GROUPS.forEach(function (g) {
      var total = 0, sel = 0;
      SYMPTOMS.forEach(function (s) {
        if (s.g !== g.id) return;
        total += 1;
        if (state.sel[s.id]) sel += 1;
      });
      var el = rootEl.querySelector('[data-gn="' + g.id + '"]');
      if (el) {
        el.textContent = sel + '/' + total;
        el.classList.toggle('zy-has', sel > 0);
      }
    });

    var hint = rootEl.querySelector('[data-role="hint"]');
    if (hint) {
      if (state.sel.taiHuang || state.sel.taiHuangRun) {
        hint.hidden = false;
        hint.innerHTML = '你选了苔黄：<b>想喝热水还是冷水</b>，是分辨真热与假热的关键。';
      } else {
        hint.hidden = true;
        hint.innerHTML = '';
      }
    }

    var drinkBtns = rootEl.querySelectorAll('.zy-seg[data-k="drink"] button');
    for (var i = 0; i < drinkBtns.length; i++) {
      drinkBtns[i].classList.toggle('zy-on', drinkBtns[i].getAttribute('data-v') === state.drink);
    }
    var spBtns = rootEl.querySelectorAll('.zy-seg[data-k="special"] button');
    for (var j = 0; j < spBtns.length; j++) {
      var v = spBtns[j].getAttribute('data-v');
      var on = v === 'none' ? Object.keys(state.special).length === 0 : !!state.special[v];
      spBtns[j].classList.toggle('zy-on', on);
    }
  }

  function resultBadgeClass(c) {
    if (c === '倾向明显') return 'zy-high';
    if (c === '有一定倾向') return 'zy-mid';
    return 'zy-low';
  }

  function renderInsufficient(rootEl, r) {
    var host = rootEl.querySelector('[data-role="result"]');
    var h = [];
    h.push('<div class="zy-rhead"><div class="zy-rhead-main"><div class="zy-res-k">辨 证 倾 向</div><div class="zy-rt">还定不下来</div><p class="zy-rsub">不是没有方向，是信息还不够。</p></div>');
    h.push('<div class="zy-ring" style="--p:' + r.confidencePct + '"><b>' + r.confidencePct + '<i>%</i></b><span>把握度</span></div></div>');
    h.push('<div class="zy-badges"><span class="zy-badge zy-low">信息不足</span><span class="zy-badge">已选 ' + r.count + ' 项</span></div>');
    h.push('<div class="zy-insufficient">');
    h.push('<h3>再补 2–3 项，方向就清楚了</h3>');
    h.push('<p>' + esc(r.note) + '</p>');
    if (r.primary) {
      h.push('<p>目前略微偏向：<b>' + esc(r.primary) + '</b>。' + (TYPES[r.primary] ? esc(TYPES[r.primary].oneLine) : '') + '</p>');
    }
    h.push('<p>优先补：<b>舌质、舌苔、大便、小便、睡眠</b>。这几组最能拉开证型之间的距离。</p>');
    h.push('<button type="button" class="zy-again" data-role="more">继续补选</button>');
    h.push('</div>');
    host.innerHTML = h.join('');
    host.hidden = false;
  }

  function renderResult(rootEl, r) {
    var t = TYPES[r.primary];
    if (!t) return;
    var host = rootEl.querySelector('[data-role="result"]');
    var secName = r.secondary[0];
    var h = [];

    h.push('<div class="zy-rhead">');
    h.push('<div class="zy-rhead-main"><div class="zy-res-k">辨 证 倾 向</div><div class="zy-rt">' + esc(t.name) + '</div><p class="zy-rsub">' + esc(t.oneLine) + '</p></div>');
    h.push('<div class="zy-ring" style="--p:' + r.confidencePct + '"><b>' + r.confidencePct + '<i>%</i></b><span>把握度</span></div>');
    h.push('</div>');

    h.push('<div class="zy-badges">');
    h.push('<span class="zy-badge ' + resultBadgeClass(r.confidence) + '">' + esc(r.confidence) + '</span>');
    h.push('<span class="zy-badge">已选 ' + r.count + ' 项</span>');
    if (secName) h.push('<span class="zy-badge">兼 ' + esc(secName) + '</span>');
    h.push('<span class="zy-badge">' + esc(t.location) + '</span>');
    h.push('</div>');

    h.push('<div class="zy-portrait">' + esc(t.portrait) + '</div>');

    h.push('<div class="zy-tags"><span class="zy-tag zy-main">主证 ' + esc(t.name) + '</span>');
    if (secName) h.push('<span class="zy-tag">兼证 ' + esc(secName) + '</span>');
    h.push('<span class="zy-tag">' + esc(t.nature) + '</span></div>');

    h.push('<div class="zy-sec">');
    h.push('<div class="zy-sec-h"><span class="zy-sec-n">据</span><h3>为什么是它</h3><em>你勾的 → 指向</em></div>');
    h.push('<ul class="zy-ev">');
    r.evidenceDetail.forEach(function (e) {
      h.push('<li><b>' + esc(e.name) + '</b> → ' + esc(e.text) + '</li>');
    });
    if (!r.evidenceDetail.length) h.push('<li>目前勾选的症状与各证型的指纹都不强，先补舌象与二便。</li>');
    h.push('</ul>');
    var noteParts = [];
    if (r.rules.length) noteParts.push(r.rules.join('；') + '。');
    noteParts.push('判断方式：每个症状按权重指向若干证型，同一证型被 2 项以上命中才加组合分；主证取总分最高，兼证取次高。');
    h.push('<div class="zy-note">' + esc(noteParts.join('')) + '</div>');
    h.push('</div>');

    h.push('<div class="zy-sec">');
    h.push('<div class="zy-sec-h"><span class="zy-sec-n">先</span><h3>先做这 3 件事</h3><em>不用等抓药</em></div>');
    h.push('<ol class="zy-advice">' + t.advice.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>');
    h.push('</div>');

    h.push('<div class="zy-warn zy-warn-sm"><b>安全提醒</b><p>仅供健康参考，不替代面诊与诊断。急症、剧痛、高热、出血、意识改变请立即就医；孕妇、哺乳期、儿童、慢病及正在服药者，方剂与剂量须经医师确认。</p></div>');

    h.push(buildCare(r));
    h.push('<div data-role="contact"></div>');
    h.push('<button type="button" class="zy-again" data-role="again">症状有变，重新辨证</button>');
    host.innerHTML = h.join('');
    host.hidden = false;

    mountContact(host.querySelector('[data-role="contact"]'), r);
  }

  function mountContact(host, r) {
    if (!host) return;
    var t = TYPES[r.primary];
    var ids = state.lastIds || Object.keys(state.sel);
    var copyTxt = (function () {
      var symTxt = ids.map(function (id) { var s = BY_ID[id]; return s ? s.name : id; }).join('、');
      var tendency = t ? t.name + (r.secondary && r.secondary.length ? '（兼 ' + r.secondary.slice(0, 2).join('、') + '）' : '') : '';
      return '一恒体系 · 中医自查\n症状：' + symTxt + '\n倾向：' + tendency + '（把握度 ' + r.confidencePct + '%）';
    })();
    state.copyText = copyTxt;

    var opts = {
      title: '具体方药与剂量',
      text: '这一页给的是辨证方向与日常调护。方药与剂量要结合体质加减，不在页面上展开——加微信 ' + WX_ID + '，把上面的辨证结果发我，按你的情况单独说。',
      copyText: copyTxt,
      wxKeyword: '调理'
    };

    var contact = root.YH && root.YH.contact;
    if (typeof contact === 'function') {
      try { contact(host, opts); return; } catch (e) { /* 下面的兜底卡 */ }
    }
    host.innerHTML = '<div class="zy-lock">' +
      '<div class="zy-lock-k">具 体 方 药</div>' +
      '<h3>' + esc(opts.title) + '</h3>' +
      '<p class="zy-lock-p">' + esc(opts.text) + '</p>' +
      '<div class="zy-wxbox"><div class="zy-wxt">加微信，回复「调理」</div>' +
      '<div class="zy-wxid">' + esc(WX_ID) + '<button type="button" class="zy-copy" data-wx="' + esc(WX_ID) + '">复制</button></div>' +
      '<div class="zy-wxtip">把辨证结果发我，省得重新说一遍。</div></div>' +
      '<button type="button" class="zy-unlock" data-role="copyres">复制本次辨证结果</button>' +
      '</div>';
  }

  function copyText(txt, btn, msg) {
    function done() {
      if (btn) {
        var old = btn.textContent;
        btn.textContent = '已复制';
        setTimeout(function () { btn.textContent = old; }, 1500);
      }
      toast(msg || '微信号已复制');
    }
    function fallback() {
      var ta = root.document.createElement('textarea');
      ta.value = txt;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      root.document.body.appendChild(ta);
      ta.select();
      try { root.document.execCommand('copy'); } catch (e) { /* ignore */ }
      root.document.body.removeChild(ta);
    }
    if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
      root.navigator.clipboard.writeText(txt).then(done, function () { fallback(); done(); });
    } else {
      fallback();
      done();
    }
  }

  function scrollToEl(el) {
    if (!el) return;
    try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    catch (e) { try { el.scrollIntoView(); } catch (e2) { /* ignore */ } }
  }

  function showCta(rootEl, show) {
    var cta = rootEl.querySelector('.zy-cta');
    if (cta) cta.hidden = !show;
  }

  function runDiagnose(rootEl) {
    var ids = Object.keys(state.sel);
    if (!ids.length) { toast('先勾选 1–2 项身体感受'); return; }
    var extra = {
      drinkTemp: state.drink || '',
      special: Object.keys(state.special)
    };
    var r = diagnose(ids, extra);
    state.last = r;
    state.lastIds = ids;
    if (r.confidence === '信息不足') {
      renderInsufficient(rootEl, r);
    } else {
      renderResult(rootEl, r);
    }
    refresh(rootEl);
    showCta(rootEl, false);
    var host = rootEl.querySelector('[data-role="result"]');
    scrollToEl(host);
  }

  function bind(rootEl) {
    rootEl.addEventListener('click', function (e) {
      var chip = closest(e.target, '.zy-chip');
      if (chip && rootEl.contains(chip)) {
        var id = chip.getAttribute('data-id');
        if (state.sel[id]) delete state.sel[id];
        else state.sel[id] = 1;
        chip.classList.toggle('zy-on', !!state.sel[id]);
        chip.setAttribute('aria-pressed', state.sel[id] ? 'true' : 'false');
        if (state.last) showCta(rootEl, true);
        refresh(rootEl);
        return;
      }

      var clear = closest(e.target, '[data-role="clear"]');
      if (clear) {
        state.sel = {};
        state.last = null;
        state.lastIds = null;
        var chips = rootEl.querySelectorAll('.zy-chip');
        for (var i = 0; i < chips.length; i++) {
          chips[i].classList.remove('zy-on');
          chips[i].setAttribute('aria-pressed', 'false');
        }
        var res = rootEl.querySelector('[data-role="result"]');
        if (res) { res.hidden = true; res.innerHTML = ''; }
        showCta(rootEl, true);
        refresh(rootEl);
        return;
      }

      var go = closest(e.target, '[data-role="go"]');
      if (go && !go.disabled) { runDiagnose(rootEl); return; }

      var seg = closest(e.target, '.zy-seg button');
      if (seg) {
        var k = seg.parentNode.getAttribute('data-k');
        var v = seg.getAttribute('data-v');
        if (k === 'drink') {
          state.drink = state.drink === v ? '' : v;
        } else if (k === 'special') {
          if (v === 'none') {
            state.special = {};
          } else if (state.special[v]) {
            delete state.special[v];
          } else {
            state.special[v] = 1;
          }
        }
        if (state.last) showCta(rootEl, true);
        refresh(rootEl);
        return;
      }

      var copy = closest(e.target, '.zy-copy');
      if (copy) { copyText(copy.getAttribute('data-wx') || WX_ID, copy); return; }

      var copyres = closest(e.target, '[data-role="copyres"]');
      if (copyres) { copyText(state.copyText || '', copyres, '辨证结果已复制'); return; }

      var more = closest(e.target, '[data-role="more"]');
      if (more) {
        var panel = rootEl.querySelector('.zy-panel');
        scrollToEl(panel);
        return;
      }

      var again = closest(e.target, '[data-role="again"]');
      if (again) {
        showCta(rootEl, true);
        var p = rootEl.querySelector('.zy-panel');
        scrollToEl(p);
        return;
      }
    });
  }

  function mount(rootEl) {
    if (!rootEl) return;
    if (!SYMPTOMS.length || !TYPE_NAMES.length) {
      rootEl.innerHTML = '<div class="zy-warn"><b>数据未加载</b><p>请先引入 zhongyi-data.js，再引入 zhongyi.js。</p></div>';
      return;
    }
    state = { sel: {}, drink: '', special: {}, last: null, lastIds: null, copyText: '' };
    rootEl.classList.add('zy-root');
    rootEl.innerHTML = shellHTML();
    bind(rootEl);
    refresh(rootEl);
  }

  function reportFor(primary, ids, extra) {
    var r = diagnose(ids || [], extra);
    if (primary && TYPES[primary]) r.primary = primary;
    return buildCare(r);
  }

  root.YH = root.YH || {};
  root.YH.boards = root.YH.boards || {};
  root.YH.boards.zhongyi = {
    mount: mount,
    engine: { diagnose: diagnose, TYPES: TYPES, SYMPTOMS: SYMPTOMS },
    reportFor: reportFor
  };
})(window);
