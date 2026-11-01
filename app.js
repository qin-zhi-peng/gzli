/* 一恒体系 · 总领
 * 职责：hash 路由（#/ #/mingli #/zhanbu #/zhongyi）、总领首页、
 *       三板块共用工具（esc / h2 / toast / copy / contact 微信联系卡）、板块脚本按需加载。
 * 板块模块契约：window.YH.boards.<id> = { mount: function(rootEl){} }
 * 加载契约：首页只拉本文件；进板块时按 SCRIPTS 里的依赖顺序拉脚本。
 */
(function () {
  'use strict';

  var YH = window.YH = window.YH || {};
  YH.boards = YH.boards || {};

  var WX = { id: 'xy1618fff', qr: 'qr.png', keywords: ['报告', '占卦', '调理'] };
  YH.WX = WX;

  var $view = document.getElementById('view');

  /* ---------------- 小工具 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  YH.esc = esc;
  YH.h2 = function (n, t) { return '<h2 class="h2"><span class="n">' + esc(n) + '</span>' + t + '</h2>'; };

  var toastEl = null;
  YH.toast = function (msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove('on'); }, 1800);
  };

  /* 复制：clipboard 失败（未聚焦/非 https）时回退 execCommand，绝不能只是「假装复制了」 */
  function copyToClipboard(t, btn, msg) {
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-999px';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e) { }
    }
    function done() {
      if (btn) { var old = btn.textContent; btn.textContent = '已复制'; setTimeout(function () { btn.textContent = old; }, 1500); }
      YH.toast(msg || '已复制');
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(done, function () { fallback(); done(); });
      } else { fallback(); done(); }
    } catch (e) { fallback(); done(); }
  }
  YH.copy = copyToClipboard;

  YH.go = function (hash) {
    if (location.hash === hash) { render(); window.scrollTo(0, 0); }
    else location.hash = hash;
  };

  /* ---------------- 微信联系卡（三个板块共用） ---------------- */
  function wxBlock(keyword) {
    return '' +
      '<div class=lk-wx>' +
        '<div class=wx-info>' +
          '<div class=wx-t>加微信 · 一对一</div>' +
          '<div class=wx-id>' + esc(WX.id) + '<button type=button class=mini data-copy>' + '复制' + '</button></div>' +
          '<div class=wx-tip>加微信回复「' + esc(keyword) + '」，直接说你的情况</div>' +
          '<div class=wx-tip style=opacity:.78>把出生时间 / 卦象 / 症状发我，省得重新描述。</div>' +
        '</div>' +
        '<img class=wx-qr src="' + WX.qr + '" alt=一恒微信二维码 loading=lazy decoding=async onerror="this.style.display=\'none\'">' +
      '</div>';
  }

  /* 页面上不生成完整内容（四柱六步、断卦、方药），统一引导微信一对一。
   * opts = { title, text, copyText, wxKeyword }；text 里若已含微信号，这里不再重复拼。 */
  YH.contact = function (host, opts) {
    if (!host) return;
    opts = opts || {};
    var copyBlock = opts.copyText
      ? '<div class="lkrow" style="margin-top:10px"><button type="button" class="mini lk-copy">复制本次结果</button>' +
        '<span style="font-size:11.5px;color:var(--dim)">加微信后直接粘贴给我，省得再描述</span></div>'
      : '';
    host.innerHTML = '' +
      '<div class="lock">' +
        '<div class="lk-t">' + esc(opts.title || '进一步沟通') + '</div>' +
        (opts.text ? '<p class="lk-p">' + esc(opts.text) + '</p>' : '') +
        wxBlock(opts.wxKeyword || '报告') +
        copyBlock +
      '</div>';
    var copyBtn = host.querySelector('.lk-copy');
    if (copyBtn) copyBtn.addEventListener('click', function () { YH.copy(opts.copyText, copyBtn, '已复制，加微信直接粘贴'); });
    host.addEventListener('click', function (e) {
      if (e.target && e.target.hasAttribute('data-copy')) { YH.copy(WX.id, e.target, '微信号已复制'); }
    });
  };

  /* ---------------- 路由表 ---------------- */
  var BOARD = {
    mingli: {
      id: 'mingli', name: '命理', kicker: '命理 · 四柱与紫微',
      h1: '先看结构，<em>再看大运</em>',
      p: '输入出生时间，出四柱、十神、紫微十二宫与十二段大限，再给一句简要结论。全部在浏览器里推算，不上传。'
    },
    zhanbu: {
      id: 'zhanbu', name: '占卜', kicker: '占卜 · 象数六爻',
      h1: '心里有件事，<em>起一卦</em>',
      p: '把要问的事想清楚，三枚铜钱摇六次，落成卦盘：六亲、六神、世应、动变、伏神、旬空都在盘上。'
    },
    zhongyi: {
      id: 'zhongyi', name: '中医调理', kicker: '中医调理 · 辨证自查',
      h1: '先看身体，<em>再谈调理</em>',
      p: '勾选当下真实的感受，别按理想的自己勾。先看寒热虚实与脏腑偏向，再谈调理思路。'
    }
  };

  var ICONS = {
    mingli: '<svg class="ic" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round">' +
      '<rect x="5" y="9" width="6.5" height="26" rx="2.2"/><rect x="14.2" y="9" width="6.5" height="26" rx="2.2"/>' +
      '<rect x="23.3" y="9" width="6.5" height="26" rx="2.2"/><rect x="32.5" y="9" width="6.5" height="26" rx="2.2"/>' +
      '<circle cx="8.25" cy="15" r="1.1" fill="currentColor" stroke="none"/><circle cx="26.55" cy="29" r="1.1" fill="currentColor" stroke="none"/></svg>',
    zhanbu: '<svg class="ic" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<line x1="7" y1="7" x2="35" y2="7"/>' +
      '<line x1="7" y1="13.4" x2="18.5" y2="13.4"/><line x1="25.5" y1="13.4" x2="35" y2="13.4"/>' +
      '<line x1="7" y1="19.8" x2="35" y2="19.8"/>' +
      '<line x1="7" y1="26.2" x2="18.5" y2="26.2"/><line x1="25.5" y1="26.2" x2="35" y2="26.2"/>' +
      '<line x1="7" y1="32.6" x2="35" y2="32.6"/>' +
      '<line x1="7" y1="39" x2="18.5" y2="39"/><line x1="25.5" y1="39" x2="35" y2="39"/>' +
      '<circle cx="39.5" cy="7" r="1.8" fill="currentColor" stroke="none"/></svg>',
    zhongyi: '<svg class="ic" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round">' +
      '<rect x="6" y="8" width="32" height="28" rx="3"/><line x1="6" y1="17.3" x2="38" y2="17.3"/><line x1="6" y1="26.6" x2="38" y2="26.6"/>' +
      '<line x1="16.7" y1="8" x2="16.7" y2="36"/><line x1="27.3" y1="8" x2="27.3" y2="36"/></svg>'
  };

  var CARDS = [
    {
      id: 'mingli', kicker: '结构 · 四柱与紫微',
      title: '命理', sub: '你手里有什么牌',
      p: '出生时间定四柱：日主、十神、六亲、财官，再加紫微十二宫与十二段大限，最后给一句简要结论。',
      meta: '约 3 秒出盘 · 免费', cta: '进入排盘'
    },
    {
      id: 'zhanbu', kicker: '当下 · 象数六爻',
      title: '占卜', sub: '这一把该怎么出',
      p: '心里默问一件事，三枚铜钱摇六次。盘面上是六亲、六神、世应、动变、伏神与旬空。',
      meta: '两次点击 · 免费', cta: '起一卦'
    },
    {
      id: 'zhongyi', kicker: '底子 · 中医调理',
      title: '中医调理', sub: '身体接不接得住',
      p: '勾选当下的身体感受：寒热、汗、二便、睡眠、舌象。看证候偏向，给调理思路。',
      meta: '约 2 分钟 · 免费', cta: '开始自查'
    }
  ];

  /* ---------------- 首页 ---------------- */
  function homeHTML() {
    var cards = CARDS.map(function (c) {
      return '<a class="bcard" href="#/' + c.id + '">' +
        ICONS[c.id] +
        '<h3>' + esc(c.title) + '<small>' + esc(c.kicker) + '</small></h3>' +
        '<p>' + esc(c.p) + '</p>' +
        '<div class="meta">' + esc(c.meta) + '</div>' +
        '<div class="go">' + esc(c.cta) + '<span class="arw">→</span></div>' +
        '</a>';
    }).join('');

    return '' +
      '<div class="hero">' +
        '<div class="sealbig" aria-hidden="true"><span>恒</span></div>' +
        '<div class="kicker">一 恒 体 系 · 总 领</div>' +
        '<h1>同一套底层<br><em>三种看法</em></h1>' +
        '<p class="lead">命理看你手里有什么牌，占卜看这一把该怎么出，中医看你此刻的身体接不接得住。</p>' +
        '<p class="lead2">三个入口，都从一次输入开始：出生时间、一件事、一组症状。<b>全部在浏览器本地推算，不上传。</b></p>' +
        '<div class="trust"><span>本地推算</span><span>不上传</span><span>不用注册</span><span>免费体验</span></div>' +
      '</div>' +

      '<div class="boards">' + cards + '</div>' +

      '<section class="sect">' +
        '<div class="sect-h"><span class="num">01</span><h2>为什么是这三样<small>一条线，不是三个摊子</small></h2></div>' +
        '<p class="sect-p">三者共用一套阴阳五行的语言，所以能对着看：命理说方向，占卜说时机，中医说到底子。</p>' +
        '<div class="sysgrid">' +
          '<div class="sys"><span class="k">结 构</span><b>命理 · 看牌面</b><span>日主是什么、六亲怎么排、财官有没有力、大运哪十年顺。看的是这一辈子大致拿了什么牌。</span></div>' +
          '<div class="sys"><span class="k">当 下</span><b>占卜 · 看出牌</b><span>这一件事此刻的势：世应谁强、用神旺不旺、动爻往哪走、什么时候应。看的是这一把怎么出。</span></div>' +
          '<div class="sys"><span class="k">底 子</span><b>中医 · 看身体</b><span>寒热虚实、脏腑气血、睡眠二便。牌再好、势再顺，底子接不住也白搭。看的是这个人现在的状态。</span></div>' +
        '</div>' +
      '</section>' +

      '<section class="sect">' +
        '<div class="sect-h"><span class="num">02</span><h2>先看盘面<small>完整报告加微信</small></h2></div>' +
        '<p class="sect-p">免费体验出盘，盘面与一句简要结论直接看，不用注册、不留信息。需要结合你本人逐项推演的部分——四柱结构、断卦与时机、方药与剂量——不在页面上生成，加微信 ' + esc(WX.id) + ' 一对一给。</p>' +
        '<div class="lock" style="margin-top:4px">' +
          '<div class="lk-t">加微信 ' + esc(WX.id) + ' · 说清你要问哪个板块</div>' +
          '<p class="lk-p">命理发出生时间，占卜发卦象或直接说事，中医说症状。盘面与简要结论页面上就有，不用等。</p>' +
          '<div style="margin:10px 0 0">' +
            '<span class="pill">命理 → 回复「报告」</span>' +
            '<span class="pill">占卜 → 回复「占卦」</span>' +
            '<span class="pill">中医 → 回复「调理」</span>' +
          '</div>' +
          wxBlock('报告') +
        '</div>' +
      '</section>' +

      '<section class="sect">' +
        '<div class="sect-h"><span class="num">03</span><h2>常见问题<small>先问清楚，再决定</small></h2></div>' +
        '<div class="faq">' +
          '<details><summary>盘面和判断准不准？</summary><p>排盘按固定历法与规则推算，同一时间输入永远出同一张盘；判断给的是倾向和概率，不是命令。它帮你看清结构，不替你做决定。</p></details>' +
          '<details><summary>要收费吗？</summary><p>体验免费，出盘、起卦、自查都不收费，盘面与简要结论直接看。完整报告加微信 ' + esc(WX.id) + ' 单独说，按你的事一项一项讲清楚。</p></details>' +
          '<details><summary>我的出生时间、症状会被收集吗？</summary><p>不会。所有推算在你自己的浏览器里完成，页面不往服务器发任何输入。只有你主动发到微信，我才看得到。</p></details>' +
          '<details><summary>为什么这三样要一起看？</summary><p>命理看你这辈子大致拿了什么牌，占卜看这一把该怎么出，中医看你现在的身体接不接得住。三者共用一套阴阳五行的语言，能对着看。</p></details>' +
          '<details><summary>中医内容能替代看医生吗？</summary><p>不能。本站只做辨证自查和调理思路，急症、持续加重、正在服药的，先去医院面诊。</p></details>' +
        '</div>' +
      '</section>' +

      '<footer class="foot">' +
        '一恒体系 · 命理 / 占卜 / 中医调理 © 2026<br>' +
        '所有排盘与判断均在浏览器本地完成，不收集、不上传你的输入。' +
        '<br>命理与占卜为传统文化体验，请勿作为重大决策的唯一依据；中医内容仅供健康参考，不替代面诊与治疗。' +
      '</footer>';
  }

  /* ---------------- 板块脚本按需加载 ---------------- */
  /* 首页只拉 app.js；进哪个板块，才按依赖顺序拉那个板块的脚本，拉过就记住。 */
  var SCRIPTS = {
    mingli: ['data.js', 'engine.js', 'report.js', 'mingli.js'],
    zhanbu: ['zhanbu-data.js', 'zhanbu.js'],
    zhongyi: ['zhongyi-data.js', 'zhongyi.js']
  };
  var META = {
    mingli: '输入出生时间，在线排四柱、十神、紫微十二宫与十二段大限，并给一句简要结论，免费、本地推算。',
    zhanbu: '心里默问一件事，三枚铜钱摇六次，出六爻卦盘：六亲、六神、世应、动变、旬空与神煞。',
    zhongyi: '勾选当下的身体感受，看寒热虚实与脏腑偏向，给辨证自查与调理思路。'
  };
  var HOME_DESC = '一恒体系总领：命理看结构，占卜看当下，中医看身体。免费在线体验四柱紫微排盘、六爻起卦、辨证自查，全部在浏览器本地推算，先看盘面与简要结论；完整报告加微信获取。';
  var loadState = {};   // '' / 'loading' / 'ready' / 'error'
  var loadWaiters = {};

  function loadBoard(id, done) {
    var st = loadState[id];
    if (st === 'ready') { done(null); return; }
    if (st === 'error') { done('error'); return; }
    if (st === 'loading') { loadWaiters[id].push(done); return; }
    loadState[id] = 'loading';
    loadWaiters[id] = [done];
    var list = SCRIPTS[id].slice();

    function flush(err) {
      var q = loadWaiters[id] || [];
      loadWaiters[id] = [];
      for (var i = 0; i < q.length; i++) {
        try { q[i](err); } catch (e) { if (window.console) console.error(e); }
      }
    }

    (function next() {
      if (!list.length) { loadState[id] = 'ready'; flush(null); return; }
      var s = document.createElement('script');
      s.src = list.shift();
      s.async = false;
      s.onload = next;
      s.onerror = function () { loadState[id] = 'error'; flush('error'); };
      document.head.appendChild(s);
    })();
  }

  function prefetch(id) {
    if (!SCRIPTS[id] || loadState[id]) return;
    loadBoard(id, function () { });
  }
  function idlePrefetch() {
    var c = navigator.connection || {};
    if (c.saveData || /2g/.test(c.effectiveType || '')) return;
    var go = function () { setTimeout(function () { prefetch('mingli'); }, 1200); };
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 2000);
  }
  document.addEventListener('pointerover', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('.bcard[href],.navlinks a[data-r]') : null;
    if (!a) return;
    var id = a.getAttribute('data-r') || (a.getAttribute('href') || '').replace(/^#\/?/, '');
    prefetch(id);
  }, true);
  document.addEventListener('touchstart', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('.bcard[href]') : null;
    if (a) prefetch((a.getAttribute('href') || '').replace(/^#\/?/, ''));
  }, { passive: true });

  /* ---------------- 渲染 ---------------- */
  function boardHead(id) {
    var b = BOARD[id];
    return '<div class="boardhead">' +
      '<a class="back" href="#/">← 回到总领</a>' +
      '<div class="kicker" style="margin-top:14px">' + esc(b.kicker) + '</div>' +
      '<h1>' + b.h1 + '</h1>' +
      '<p>' + esc(b.p) + '</p>' +
      '</div>';
  }

  function setNav(id) {
    var links = document.querySelectorAll('.navlinks a');
    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute('data-r') === id) links[i].classList.add('on');
      else links[i].classList.remove('on');
    }
  }

  function routeName() {
    var h = (location.hash || '').replace(/^#\/?/, '').replace(/\/.*$/, '');
    return BOARD[h] ? h : '';
  }

  function boardFail(id, msg) {
    var host = document.getElementById('boardRoot');
    if (!host) return;
    host.innerHTML = '<div class="card"><b style="color:var(--red2)">' + esc(BOARD[id].name) + '板块没加载出来</b>' +
      '<div class="hint">' + esc(msg || '网络可能抖了一下。') +
      ' <button type="button" class="mini" data-retry>重试</button></div></div>';
    var btn = host.querySelector('[data-retry]');
    if (btn) btn.addEventListener('click', function () { loadState[id] = ''; render(); });
  }

  function mountBoard(id, root) {
    if (!root) return;
    var mod = YH.boards[id];
    if (mod && typeof mod.mount === 'function') {
      try { mod.mount(root); }
      catch (e) {
        root.innerHTML = '<div class="card"><b style="color:var(--red2)">' + esc(BOARD[id].name) + '板块加载出错</b><div class="hint">' + esc(e && e.message ? e.message : e) + '</div></div>';
        if (window.console) console.error(e);
      }
      return;
    }
    if (loadState[id] === 'ready') { boardFail(id, '脚本已经下载，但板块没起来。刷新页面再试。'); return; }
    if (loadState[id] === 'error') { boardFail(id); return; }

    root.innerHTML = '<div class="board-load">' + esc(BOARD[id].name) + '板块加载中…</div>';
    loadBoard(id, function (err) {
      if (routeName() !== id) return;
      if (err) { boardFail(id); return; }
      var host = document.getElementById('boardRoot');
      if (host) mountBoard(id, host);
    });
  }

  function render() {
    var id = routeName();
    setNav(id);
    document.title = id ? BOARD[id].name + ' · 一恒体系' : '一恒体系 · 命理 占卜 中医调理';
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', id ? META[id] : HOME_DESC);
    if (!id) {
      $view.innerHTML = '<div class="page">' + homeHTML() + '</div>';
      idlePrefetch();
      return;
    }
    $view.innerHTML = '<div class="page">' + boardHead(id) + '<div id="boardRoot"></div></div>';
    mountBoard(id, document.getElementById('boardRoot'));
  }

  window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });
  if (!location.hash) location.hash = '#/';
  render();

  /* 跳到主内容：不靠改 hash（hash 一改就会被路由当成未知路由），直接聚焦主容器 */
  var skipLink = document.getElementById('skipLink');
  if (skipLink) skipLink.addEventListener('click', function (e) {
    e.preventDefault();
    $view.focus();
    window.scrollTo(0, 0);
  });

  var toTop = document.createElement('button');
  toTop.type = 'button';
  toTop.className = 'totop';
  toTop.setAttribute('aria-label', '回到顶部');
  toTop.textContent = '↑';
  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.body.appendChild(toTop);
  window.addEventListener('scroll', function () {
    if (window.scrollY > 700) toTop.classList.add('on'); else toTop.classList.remove('on');
  }, { passive: true });
})();
