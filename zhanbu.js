/* ============================================================================
 * 一恒体系 · 占卜 · 象数六爻（纯静态站点板块，浏览器内自算）
 * ----------------------------------------------------------------------------
 * 排盘引擎：起卦 → 装卦（宫、世应、六亲、六神、动变、伏神、神煞）→ 四柱与旬空
 *   TRI / PALACES / classify / calendar_pillars / build_shensha / build_chart /
 *   toss_lines / to_case
 * 口径：固定 UTC+8、经度 120°；新修历法（360 日岁序 + 平气月）；
 *       纳甲（乾甲壬、坤乙癸、震庚、巽辛、坎戊、离己、艮丙、兑丁）；
 *       伏神按「本宫 / 本宫错卦」飞伏；变爻六亲仍以本卦宫五行论。
 * 精度：Python math.floor → Math.floor；负数取模 → mod()；from_jd 秒数
 *       round((day-di)*86400) 用 Python 式四舍六入五取偶；日柱 (jdn+49)%60。
 * 数据：历法 winters(1499-2500) 与 64 卦名在 zhanbu-data.js（window.ZB_DATA），
 *       由排盘引擎导出；本文件不含数据，缺该脚本会在盘面直接报错。
 * ========================================================================== */
(function (root) {
  'use strict';

  /* ---------------------------------------------------------------- 数据 */
  var ZB_DATA = (root && root.ZB_DATA) || null;

  /* ---------------------------------------------------------------- 常量 */
  var STEMS = '甲乙丙丁戊己庚辛壬癸'.split('');
  var BRANCHES = '子丑寅卯辰巳午未申酉戌亥'.split('');
  var SEX = [];
  (function () { for (var i = 0; i < 60; i++) SEX.push(STEMS[i % 10] + BRANCHES[i % 12]); })();
  var VOID = ['戌亥', '申酉', '午未', '辰巳', '寅卯', '子丑'];
  var ELEM = {};
  (function () {
    var es = '水土木木土火火土金金土水';
    for (var i = 0; i < 12; i++) ELEM[BRANCHES[i]] = es.charAt(i);
  })();
  var SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  var ELEM_GROUP = { 木: '寅卯', 火: '巳午', 土: '辰戌丑未', 金: '申酉', 水: '亥子' };

  var TRI = {
    乾: { bits: [1, 1, 1], element: '金', image: '天', na: ['子', '寅', '辰', '午', '申', '戌'], stem_in: '甲', stem_out: '壬' },
    兑: { bits: [1, 1, 0], element: '金', image: '泽', na: ['巳', '卯', '丑', '亥', '酉', '未'], stem_in: '丁', stem_out: '丁' },
    离: { bits: [1, 0, 1], element: '火', image: '火', na: ['卯', '丑', '亥', '酉', '未', '巳'], stem_in: '己', stem_out: '己' },
    震: { bits: [1, 0, 0], element: '木', image: '雷', na: ['子', '寅', '辰', '午', '申', '戌'], stem_in: '庚', stem_out: '庚' },
    巽: { bits: [0, 1, 1], element: '木', image: '风', na: ['丑', '亥', '酉', '未', '巳', '卯'], stem_in: '辛', stem_out: '辛' },
    坎: { bits: [0, 1, 0], element: '水', image: '水', na: ['寅', '辰', '午', '申', '戌', '子'], stem_in: '戊', stem_out: '戊' },
    艮: { bits: [0, 0, 1], element: '土', image: '山', na: ['辰', '午', '申', '戌', '子', '寅'], stem_in: '丙', stem_out: '丙' },
    坤: { bits: [0, 0, 0], element: '土', image: '地', na: ['未', '巳', '卯', '丑', '亥', '酉'], stem_in: '乙', stem_out: '癸' }
  };
  var TRI_ORDER = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];
  var TRI_BY_BITS = {};
  (function () {
    for (var k in TRI) TRI_BY_BITS[TRI[k].bits.join('')] = k;
  })();
  var OPP = { 乾: '坤', 坤: '乾', 兑: '艮', 艮: '兑', 离: '坎', 坎: '离', 震: '巽', 巽: '震' };
  var SPIRITS = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'];
  var SPIRIT_START = { 甲: 0, 乙: 0, 丙: 1, 丁: 1, 戊: 2, 己: 3, 庚: 4, 辛: 4, 壬: 5, 癸: 5 };

  var CHONG = {}, HE = {};
  (function () {
    ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'].forEach(function (k) {
      CHONG[k] = 1; CHONG[k.charAt(1) + k.charAt(0)] = 1;
    });
    ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'].forEach(function (k) {
      HE[k] = 1; HE[k.charAt(1) + k.charAt(0)] = 1;
    });
  })();

  /* 常用神煞（十二项），逐字移植 */
  var GUI_REN = { 甲: '丑未', 乙: '子申', 丙: '亥酉', 丁: '亥酉', 戊: '丑未', 己: '子申', 庚: '丑未', 辛: '寅午', 壬: '卯巳', 癸: '卯巳' };
  var YI_MA = { 子: '寅', 丑: '亥', 寅: '申', 卯: '巳', 辰: '寅', 巳: '亥', 午: '申', 未: '巳', 申: '寅', 酉: '亥', 戌: '申', 亥: '巳' };
  var XIAN_CHI = { 子: '酉', 丑: '午', 寅: '卯', 卯: '子', 辰: '酉', 巳: '午', 午: '卯', 未: '子', 申: '酉', 酉: '午', 戌: '卯', 亥: '子' };
  var YANG_REN = { 甲: '卯', 乙: '寅', 丙: '午', 丁: '巳', 戊: '午', 己: '巳', 庚: '酉', 辛: '申', 壬: '子', 癸: '亥' };
  var LU_SHEN = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
  var JIN_YU = { 甲: '辰', 乙: '巳', 丙: '未', 丁: '申', 戊: '未', 己: '申', 庚: '戌', 辛: '亥', 壬: '丑', 癸: '寅' };
  var TIAN_YI = { 子: '卯', 丑: '亥', 寅: '卯', 卯: '亥', 辰: '丑', 巳: '未', 午: '巳', 未: '卯', 申: '亥', 酉: '丑', 戌: '未', 亥: '巳' };
  var TIAN_XI = { 子: '未', 丑: '未', 寅: '戌', 卯: '戌', 辰: '戌', 巳: '丑', 午: '丑', 未: '丑', 申: '辰', 酉: '辰', 戌: '辰', 亥: '未' };
  var SANG_CHE = { 子: '午', 丑: '午', 寅: '酉', 卯: '酉', 辰: '酉', 巳: '子', 午: '子', 未: '子', 申: '卯', 酉: '卯', 戌: '卯', 亥: '午' };

  var STEPS_365 = [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 15, 15, 16, 15, 15, 16, 15, 15, 16, 15, 15, 15, 15];
  var STEPS_366 = [15, 16, 15, 15, 15, 15, 15, 15, 15, 15, 16, 15, 15, 16, 15, 15, 16, 15, 15, 16, 15, 15, 15, 15];
  var TERM_NAMES = ['冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种',
    '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪'];
  var LINE_STATES = {
    少阳: { yang: 1, moving: 0 }, 少阴: { yang: 0, moving: 0 },
    老阳: { yang: 1, moving: 1 }, 老阴: { yang: 0, moving: 1 },
    youngYang: { yang: 1, moving: 0 }, youngYin: { yang: 0, moving: 0 },
    oldYang: { yang: 1, moving: 1 }, oldYin: { yang: 0, moving: 1 }
  };
  var COIN_VALUE = { 6: '老阴', 7: '少阳', 8: '少阴', 9: '老阳' };
  var MIN_YEAR = 1500, MAX_YEAR = 2500;
  var BASE_UTC_JD = 2437700.1666666665;
  var LINE_NAMES = ['初', '二', '三', '四', '五', '上'];

  /* 历法数据拆包：winters = jd0 + 累加差分，names = 64 卦名（乾兑离震巽坎艮坤 上下相重） */
  var WINTERS = [], NAMES = {};
  (function () {
    if (!ZB_DATA) return;
    var arr = [], acc = ZB_DATA.jd0;
    for (var i = 0; i < ZB_DATA.d.length; i++) {
      acc += ZB_DATA.d[i];
      arr.push([ZB_DATA.y0 + i + 1, acc]);
    }
    arr.unshift([ZB_DATA.y0, ZB_DATA.jd0]);
    WINTERS = arr;
    var ns = ZB_DATA.names.split(',');
    for (var u = 0; u < 8; u++) for (var l = 0; l < 8; l++) {
      NAMES[TRI_ORDER[u] + '-' + TRI_ORDER[l]] = ns[u * 8 + l];
    }
  })();

  /* ---------------------------------------------------------------- 工具 */
  function mod(x, n) { return ((x % n) + n) % n; }
  /* Python round：四舍六入，五取偶（银行家舍入） */
  function pyround(x) {
    var f = Math.floor(x), d = x - f;
    if (d > 0.5) return f + 1;
    if (d < 0.5) return f;
    return (f % 2 === 0) ? f : f + 1;
  }
  function PanError(msg) { var e = new Error(msg); e.name = 'PanError'; return e; }
  function zi(b) { return BRANCHES.indexOf(b); }
  function chongOf(b) { return BRANCHES[(zi(b) + 6) % 12]; }
  function heOf(b) {
    var HE_PAIRS = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
    return HE_PAIRS[b];
  }

  /* ---------------------------------------------------------------- 历法 */
  function isGregorian(y, m, d) {
    return y > 1582 || (y === 1582 && (m > 10 || (m === 10 && d >= 15)));
  }

  function toJd(y, m, d, hh, mi, ss) {
    hh = hh || 0; mi = mi || 0; ss = ss || 0;
    var b = 0;
    if (isGregorian(y, m, d)) {
      var a = Math.floor(y / 100);
      b = 2 - a + Math.floor(a / 4);
    }
    var yy = y, mm = m;
    if (mm <= 2) { yy -= 1; mm += 12; }
    return Math.floor(365.25 * (yy + 4716)) + Math.floor(30.6001 * (mm + 1)) + d + b
      - 1524.5 + (hh + mi / 60 + ss / 3600) / 24;
  }

  function fromJd(jd) {
    var j = jd + 0.5;
    var z = Math.floor(j);
    var f = j - z;
    var zz = z;
    if (z >= 2299161) {
      var a = Math.floor((z - 1867216.25) / 36524.25);
      zz = z + 1 + a - Math.floor(a / 4);
    }
    var a2 = zz + 1524;
    var b = Math.floor((a2 - 122.1) / 365.25);
    var c = Math.floor(365.25 * b);
    var dd = Math.floor((a2 - c) / 30.6001);
    var day = a2 - c - Math.floor(30.6001 * dd) + f;
    var di = Math.floor(day);
    var month = dd < 14 ? dd - 1 : dd - 13;
    var year = month > 2 ? b - 4716 : b - 4715;
    var secs = Math.min(86399, Math.max(0, pyround((day - di) * 86400)));
    return {
      year: year, month: month, day: di,
      hour: Math.floor(secs / 3600),
      minute: Math.floor((secs % 3600) / 60),
      second: secs % 60
    };
  }

  function jdn(y, m, d) { return Math.floor(toJd(y, m, d) + 0.5); }

  function winterWindow(jd) {
    var best = null, nxt = null;
    for (var i = 0; i < WINTERS.length; i++) {
      if (WINTERS[i][1] <= jd) best = WINTERS[i];
      else { nxt = WINTERS[i]; break; }
    }
    if (best === null) { best = WINTERS[0]; nxt = WINTERS[1]; }
    if (nxt === null) nxt = [best[0] + 1, best[1] + 365];
    var gap = Math.min(366, Math.max(365, pyround(nxt[1] - best[1])));
    return [best[1], nxt[1], gap];
  }

  function calendarPillars(date, time, tz, lon) {
    if (!WINTERS.length) throw PanError('历法数据缺失（zhanbu-data 未加载）');
    tz = (tz === undefined || tz === null) ? 8 : tz;
    lon = (lon === undefined || lon === null) ? 120 : lon;
    var dp = String(date).split('-');
    var y = parseInt(dp[0], 10), m = parseInt(dp[1], 10), d = parseInt(dp[2], 10);
    if (!(y >= MIN_YEAR && y <= MAX_YEAR)) throw PanError('日期范围限 ' + MIN_YEAR + '-01-01 至 ' + MAX_YEAR + '-12-31');
    if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) throw PanError('日期格式应为 YYYY-MM-DD');
    var tp = String(time).split(':');
    var hh = parseInt(tp[0], 10);
    var mi = tp.length > 1 ? parseInt(tp[1], 10) : 0;
    var ss = tp.length > 2 ? parseInt(tp[2], 10) : 0;
    if (!(hh >= 0 && hh <= 23 && mi >= 0 && mi <= 59 && ss >= 0 && ss <= 59)) throw PanError('时间格式应为 HH:MM[:SS]');

    var civil = toJd(y, m, d, hh, mi, ss);
    var doy = jdn(y, m, d) - jdn(y, 1, 1) + 1;
    var x = 2 * Math.PI * (doy - 81) / 364;
    var eot = 9.87 * Math.sin(2 * x) - 7.53 * Math.cos(x) - 1.5 * Math.sin(x);
    var lonCorr = 4 * (lon - 15 * tz);
    var lms = civil + lonCorr / 1440;
    var lp = fromJd(lms);

    var off = Math.floor((lms - BASE_UTC_JD) / 360);
    var yearName = STEMS[mod(off, 10)] + BRANCHES[mod(off + 2, 12)];

    var w = winterWindow(lms);
    var start = w[0], gap = w[2];
    var steps = (gap === 366) ? STEPS_366 : STEPS_365;
    var rows = [], dd = start;
    for (var i = 0; i < 24; i++) {
      rows.push([TERM_NAMES[i], dd, dd + i / 24]);
      if (i < 23) dd += steps[i];
    }
    var lichunYear = fromJd(rows[3][1]).year;
    var cy, pos, term;
    if (lms < rows[1][2]) { cy = lichunYear - 1; pos = 10; term = '大雪'; }
    else if (lms < rows[3][2]) { cy = lichunYear - 1; pos = 11; term = '小寒'; }
    else {
      var idx = 3;
      for (var k = 3; k < 24; k += 2) { if (rows[k][2] <= lms) idx = k; else break; }
      pos = Math.floor((idx - 3) / 2);
      cy = lichunYear;
      term = rows[idx][0];
    }
    var sex = mod(50 + (cy - 1962) * 12 + pos, 60);
    var monthName = SEX[sex];

    var dcyc = mod(jdn(lp.year, lp.month, lp.day) + 49, 60);
    var dayName = SEX[dcyc];

    var hy, hm, hd;
    if (lp.hour !== 23) { hy = lp.year; hm = lp.month; hd = lp.day; }
    else {
      var nx = fromJd(toJd(lp.year, lp.month, lp.day) + 1 + 0.3);
      hy = nx.year; hm = nx.month; hd = nx.day;
    }
    var hcycle = mod(jdn(hy, hm, hd) + 49, 60);
    var hb = (lp.hour === 23 || lp.hour === 0) ? 0 : Math.floor((lp.hour + 1) / 2);
    var hs = mod(mod(mod(hcycle, 10), 5) * 2 + hb, 10);
    var hourName = STEMS[hs] + BRANCHES[hb];

    return {
      pillars: { year: yearName, month: monthName, day: dayName, hour: hourName },
      dayVoid: VOID[Math.floor(dcyc / 10)],
      dayCycle: dcyc,
      lms: lms,
      parts: lp,
      monthTerm: term,
      civilJd: civil,
      localMeanSolarJd: lms,
      equationOfTime: eot
    };
  }

  /* ---------------------------------------------------------------- 装卦 */
  function relation(palaceElem, lineElem) {
    if (lineElem === palaceElem) return '兄弟';
    if (SHENG[lineElem] === palaceElem) return '父母';
    if (SHENG[palaceElem] === lineElem) return '子孙';
    if (KE[lineElem] === palaceElem) return '官鬼';
    if (KE[palaceElem] === lineElem) return '妻财';
    throw PanError('五行生克异常');
  }

  var PALACES = {};
  (function buildPalaces() {
    var STAGE_SPEC = [['本宫', [], 6], ['一世', [1], 1], ['二世', [1, 2], 2], ['三世', [1, 2, 3], 3],
      ['四世', [1, 2, 3, 4], 4], ['五世', [1, 2, 3, 4, 5], 5], ['游魂', [1, 2, 3, 5], 4], ['归魂', [5], 3]];
    for (var pi = 0; pi < TRI_ORDER.length; pi++) {
      var pname = TRI_ORDER[pi], base = TRI[pname].bits;
      var doubled = base.concat(base);
      for (var si = 0; si < STAGE_SPEC.length; si++) {
        var stage = STAGE_SPEC[si][0], changes = STAGE_SPEC[si][1], shi = STAGE_SPEC[si][2];
        var bits = [];
        for (var i = 0; i < 6; i++) {
          bits.push(changes.indexOf(i + 1) >= 0 ? (1 - doubled[i]) : doubled[i]);
        }
        PALACES[bits.join('')] = [pname, stage, shi, shi <= 3 ? shi + 3 : shi - 3];
      }
    }
  })();

  function classify(bits, branches) {
    var stage = PALACES[bits.join('')][1];
    if (stage === '游魂' || stage === '归魂') return stage;
    var pairs = [[0, 3], [1, 4], [2, 5]];
    var allFuyin = true, allChong = true, allHe = true;
    for (var i = 0; i < pairs.length; i++) {
      var a = branches[pairs[i][0]], b = branches[pairs[i][1]];
      if (a !== b) allFuyin = false;
      if (a === b || !CHONG[a + b]) allChong = false;
      if (a === b || !HE[a + b]) allHe = false;
    }
    if (allFuyin) return '伏吟';
    if (allChong) return '六冲';
    if (allHe) return '六合';
    return '';
  }

  function buildShensha(cal, shi, shiYang) {
    var dayStem = cal.pillars.day.charAt(0), dayBranch = cal.pillars.day.charAt(1);
    var monthBranch = cal.pillars.month.charAt(1);
    var gs = BRANCHES[((shiYang ? 0 : 6) + shi - 1) % 12];
    var ge = ELEM[gs];
    return {
      贵人: GUI_REN[dayStem].split(''),
      驿马: YI_MA[dayBranch],
      咸池: XIAN_CHI[dayBranch],
      阳刃: YANG_REN[dayStem],
      禄神: LU_SHEN[dayStem],
      天医: TIAN_YI[monthBranch],
      天喜: TIAN_XI[monthBranch],
      丧车: SANG_CHE[monthBranch],
      金舆: JIN_YU[dayStem],
      卦身: gs,
      香闺: ELEM_GROUP[KE[ge]],
      床帐: ELEM_GROUP[SHENG[ge]].split('')
    };
  }

  function buildChart(date, time, lineStates, question, tz, lon) {
    if (!lineStates || lineStates.length !== 6) throw PanError('六爻必须正好 6 个');
    var norm = [];
    for (var i = 0; i < 6; i++) {
      var s = lineStates[i];
      if (typeof s === 'string') {
        var key = LINE_STATES[s];
        if (!key) throw PanError('爻状态只能是 少阳/少阴/老阳/老阴：' + s);
        norm.push({ yang: key.yang, moving: key.moving });
      } else {
        norm.push({ yang: s ? 1 : 0, moving: 0 });
      }
    }
    var cal = calendarPillars(date, time, tz, lon);
    var bits = [], chbits = [];
    for (var j = 0; j < 6; j++) {
      bits.push(norm[j].yang);
      chbits.push(norm[j].moving ? (1 - norm[j].yang) : norm[j].yang);
    }
    var lower = TRI_BY_BITS[bits.slice(0, 3).join('')];
    var upper = TRI_BY_BITS[bits.slice(3, 6).join('')];
    var chlower = TRI_BY_BITS[chbits.slice(0, 3).join('')];
    var chupper = TRI_BY_BITS[chbits.slice(3, 6).join('')];
    var pal = PALACES[bits.join('')];
    var palace = pal[0], stage = pal[1], shi = pal[2], ying = pal[3];
    var chpal = PALACES[chbits.join('')];
    var chpalace = chpal[0], chstage = chpal[1], chshi = chpal[2], chying = chpal[3];
    var pe = TRI[palace].element;
    var che = TRI[chpalace].element;
    var s0 = SPIRIT_START[cal.pillars.day.charAt(0)];
    var branches = TRI[lower].na.slice(0, 3).concat(TRI[upper].na.slice(3, 6));
    /* 变卦六爻纳甲（按变卦自身上下经卦取，内外干分用）；六亲仍依主卦宫，见 01-base「硬规则」 */
    var chBranches = TRI[chlower].na.slice(0, 3).concat(TRI[chupper].na.slice(3, 6));

    var lines = [], mainRel = {};
    for (var no = 1; no <= 6; no++) {
      var t = no <= 3 ? lower : upper;
      var ct = no <= 3 ? chlower : chupper;
      var naIdx = (no - 1) % 3 + (no <= 3 ? 0 : 3);
      var br = TRI[t].na[naIdx];
      var stem = no <= 3 ? TRI[t].stem_in : TRI[t].stem_out;
      var elem = ELEM[br];
      var rel = relation(pe, elem);
      mainRel[rel] = 1;
      var chBr = TRI[ct].na[naIdx];
      var chStem = no <= 3 ? TRI[ct].stem_in : TRI[ct].stem_out;
      var halfOwn = no <= 3 ? lower : upper;
      var ht = (halfOwn === palace) ? OPP[palace] : palace;
      var hbr = TRI[ht].na[naIdx];
      var hstem = no <= 3 ? TRI[ht].stem_in : TRI[ht].stem_out;
      var hrel = relation(pe, ELEM[hbr]);
      var moving = norm[no - 1].moving;
      var yang = bits[no - 1];
      lines.push({
        lineNo: no,
        yang: yang,
        moving: !!moving,
        state: (yang && moving) ? 'oldYang' : moving ? 'oldYin' : yang ? 'youngYang' : 'youngYin',
        marker: (yang && moving) ? 'O' : moving ? 'X' : '',
        branch: br, stem: stem, stemBranch: stem + br, element: elem, relation: rel,
        role: no === shi ? '世' : (no === ying ? '应' : ''),
        spirit: SPIRITS[(s0 + no - 1) % 6],
        changedBranch: chBr, changedStem: chStem, changedElement: ELEM[chBr],
        changedRelation: relation(pe, ELEM[chBr]),
        changedRole: no === chshi ? '世' : (no === chying ? '应' : ''),
        hidden: {
          stem: hstem, branch: hbr, element: ELEM[hbr], relation: hrel,
          hiddenTrigram: ht,
          source: ht === OPP[palace] ? '本宫错卦' : '本宫',
          fromPalace: ht === palace
        }
      });
    }
    for (var li = 0; li < lines.length; li++) {
      var ln = lines[li];
      ln.hidden.missingRelation = (ln.hidden.source === '本宫' && !mainRel[ln.hidden.relation]);
    }
    var hasChange = false;
    for (var mi = 0; mi < 6; mi++) if (norm[mi].moving) hasChange = true;

    var hexName = NAMES[upper + '-' + lower];
    return {
      question: question || '', date: date, time: time, tz: tz || 8, lon: lon || 120,
      calendar: cal,
      shensha: buildShensha(cal, shi, lines[shi - 1].yang),
      hexagram: {
        name: hexName, upper: upper, lower: lower,
        hasChange: hasChange,
        changedName: hasChange ? NAMES[chupper + '-' + chlower] : '',
        palace: { palace: palace, stage: stage, shi: shi, ying: ying, element: pe },
        changedPalace: { palace: chpalace, stage: chstage, shi: chshi, ying: chying, element: che },
        movingLines: (function () {
          var arr = [];
          for (var q = 0; q < 6; q++) if (norm[q].moving) arr.push(q + 1);
          return arr;
        })(),
        nature: classify(bits, branches),
        changedNature: hasChange ? classify(chbits, chBranches) : '',
        lines: lines
      }
    };
  }

  function toCase(chart) {
    var cal = chart.calendar, h = chart.hexagram;
    var yao = [];
    for (var i = h.lines.length - 1; i >= 0; i--) {
      var ln = h.lines[i];
      var item = {
        位: ln.lineNo, 六神: ln.spirit, 六亲: ln.relation, 支: ln.branch,
        世应: ln.role, 动: ln.moving
      };
      if (ln.moving) item.变 = { 六亲: ln.changedRelation, 支: ln.changedBranch };
      item.伏 = { 六亲: ln.hidden.relation, 支: ln.hidden.branch };
      if (ln.hidden.missingRelation) item.伏.缺 = true;
      yao.push(item);
    }
    var p = cal.pillars;
    return {
      钥语: chart.question || '（未填钥语）',
      时间: chart.date + ' ' + chart.time.slice(0, 5),
      干支: p.year + '年 ' + p.month + '月 ' + p.day + '日 ' + p.hour + '时',
      年支: p.year.charAt(1),
      月建: p.month.charAt(1),
      日辰: p.day.charAt(1),
      空亡: cal.dayVoid.split(''),
      卦名: h.name,
      宫: h.palace.palace + '宫',
      卦性: h.nature,
      变卦: h.changedName,
      神煞: chart.shensha || {},
      爻: yao
    };
  }

  /* 三枚铜钱：3(阳面) / 2(阴面)，和值 6 老阴 · 7 少阳 · 8 少阴 · 9 老阳 */
  function tossLines(rng) {
    var out = [];
    for (var i = 0; i < 6; i++) {
      var v = 0;
      for (var c = 0; c < 3; c++) v += (rng() < 0.5 ? 3 : 2);
      out.push(COIN_VALUE[v]);
    }
    return out;
  }

  root.YH = root.YH || { boards: {} };
  root.YH.boards = root.YH.boards || {};

  root.YH.boards.zhanbu = {
    mount: function (rootEl) { mount(rootEl); },
    engine: {
      calendarPillars: calendarPillars,
      buildChart: buildChart,
      toCase: toCase,
      tossLines: tossLines
    }
  };

  var W = root;

  /* ==========================================================================
   *  页面
   * ======================================================================== */

  function YH() { return root.YH || {}; }
  function esc(s) {
    var y = YH();
    if (typeof y.esc === 'function') return y.esc(s);
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function h2(n, t) {
    var y = YH();
    if (typeof y.h2 === 'function') return y.h2(n, t);
    return '<h2 class="h2"><span class="n">' + n + '</span>' + esc(t) + '</h2>';
  }
  function toast(msg) {
    var y = YH();
    if (typeof y.toast === 'function') { y.toast(msg); return; }
    if (root.console && root.console.log) root.console.log('[zhanbu] ' + msg);
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* 固定 UTC+8 的当下（浏览器本地时区不影响起卦时间）
   * getTime() 是绝对时刻，直接 +8h 再用 getUTC* 读，就是北京时间；
   * 千万别再叠加 getTimezoneOffset()，否则国内设备会少 8 小时。 */
  function nowCN() {
    var d = new Date();
    var t = d.getTime() + 8 * 3600000;
    var nd = new Date(t);
    return {
      date: nd.getUTCFullYear() + '-' + pad2(nd.getUTCMonth() + 1) + '-' + pad2(nd.getUTCDate()),
      time: pad2(nd.getUTCHours()) + ':' + pad2(nd.getUTCMinutes()) + ':' + pad2(nd.getUTCSeconds())
    };
  }

  function randBit() {
    var c = root.crypto || root.msCrypto;
    if (c && typeof c.getRandomValues === 'function') {
      var buf = new Uint32Array(1);
      try { c.getRandomValues(buf); return (buf[0] & 0x80000000) ? 1 : 0; } catch (e) { /* 回退 */ }
    }
    return Math.random() < 0.5 ? 1 : 0;
  }
  function tossOneCoin() { return randBit() ? 3 : 2; }

  var MANUAL_DEFAULT = ['少阳', '少阳', '少阳', '少阳', '少阳', '少阳'];

  function mount(rootEl) {
    if (!rootEl) return;
    if (!WINTERS.length) {
      rootEl.innerHTML = '<div class="card"><div class="hint">历法数据未加载：请确认页面已引入 <b>zhanbu-data.js</b>（且在本脚本之前）。</div></div>';
      if (root.console && root.console.error) root.console.error('[zhanbu] window.ZB_DATA 缺失');
      return;
    }
    var state = { topic: 'career', manual: MANUAL_DEFAULT.slice(), tossing: false, chart: null, question: '' };

    var html = [];
    html.push('<div class="zb-wrap">');
    /* 输入卡 */
    html.push('<section class="card zb-card" id="zbInCard">');
    html.push('<div class="zb-field">');
    html.push('<label class="zb-lab" for="zbQ">心里默问的一件事 <em class="zb-req">必填</em></label>');
    html.push('<input id="zbQ" class="zb-q" type="text" maxlength="80" autocomplete="off" placeholder="例如：35岁男李某某在北京，想问自己的感情未来发展趋势（写清性别、年龄、姓名、所在地）">');
    html.push('<div class="zb-qhelp">请写清：性别 · 年龄 · 姓名 · 所在地 + 想问的事，起卦后不能改。</div>');
    html.push('</div>');
    html.push('<div class="zb-field">');
    html.push('<label class="zb-lab" for="zbTopic">问事类型</label>');
    html.push('<select id="zbTopic" class="zb-sel">');
    var topicOrder = [['career', '事业'], ['wealth', '财运'], ['love', '感情'], ['marry', '婚姻'],
      ['health', '健康'], ['study', '学业'], ['travel', '出行'], ['lost', '失物'], ['other', '其他']];
    for (var i = 0; i < topicOrder.length; i++) {
      html.push('<option value="' + topicOrder[i][0] + '"' + (i === 0 ? ' selected' : '') + '>' + topicOrder[i][1] + '</option>');
    }
    html.push('</select>');
    html.push('</div>');
    html.push('<div class="zb-actions">');
    html.push('<button type="button" class="btn zb-btn-main" id="zbTossBtn">三枚铜钱起卦</button>');
    html.push('<button type="button" class="btn-ghost zb-btn-alt" id="zbManualBtn">手动指定</button>');
    html.push('</div>');
    html.push('<div class="zb-hint-line">铜钱以阳面（3）与阴面（2）计，和值 6 老阴 · 7 少阳 · 8 少阴 · 9 老阳。起卦时间取当下 UTC+8。</div>');
    html.push('<div class="zb-toss" id="zbToss" hidden></div>');
    html.push('</section>');

    /* 手动指定 */
    html.push('<section class="card zb-card zb-manual" id="zbManual" hidden>');
    html.push('<div class="zb-mhead"><span class="zb-mt">手动指定六爻</span><button type="button" class="mini zb-reset" id="zbReset">全是静爻</button></div>');
    html.push('<div class="zb-mrows" id="zbMRows"></div>');
    html.push('<div class="zb-actions zb-actions-2">');
    html.push('<button type="button" class="btn zb-btn-main" id="zbManualGo">按此六爻起卦</button>');
    html.push('<button type="button" class="btn-ghost zb-btn-alt" id="zbManualCancel">收起</button>');
    html.push('</div>');
    html.push('</section>');

    /* 输出 */
    html.push('<div class="zb-out" id="zbOut"></div>');
    html.push('</div>');
    rootEl.innerHTML = html.join('');

    var $ = function (id) { return rootEl.querySelector('#' + id); };
    var elQ = $('zbQ'), elTopic = $('zbTopic'), elToss = $('zbToss'), elOut = $('zbOut');
    var elManual = $('zbManual'), elMRows = $('zbMRows');
    var btnToss = $('zbTossBtn'), btnManual = $('zbManualBtn'), btnManualGo = $('zbManualGo');
    var btnReset = $('zbReset'), btnCancel = $('zbManualCancel');

    /* 两个起卦入口共用的必填校验：不足 2 字一律拦住 */
    function readQuestion() {
      var q = (elQ.value || '').trim();
      if (q.length < 2) {
        toast('请先写下心里要问的事：性别、年龄、姓名、所在地 + 想问的事');
        elQ.classList.add('err');
        if (elQ.focus) elQ.focus();
        return '';
      }
      elQ.classList.remove('err');
      return q;
    }

    /* ---- 手动指定渲染 ---- */
    function paintManual() {
      var rows = [];
      for (var no = 6; no >= 1; no--) {
        var st = state.manual[no - 1];
        rows.push('<div class="zb-mrow">');
        rows.push('<span class="zb-mpos">' + LINE_NAMES[no - 1] + '爻</span>');
        rows.push('<span class="zb-mseg">');
        ['少阳', '少阴', '老阳', '老阴'].forEach(function (opt) {
          rows.push('<button type="button" class="zb-mopt' + (st === opt ? ' on' : '') + '" data-no="' + no + '" data-st="' + opt + '">' + opt + '</button>');
        });
        rows.push('</span>');
        rows.push('<span class="zb-mbar' + (st === '少阳' || st === '老阳' ? ' yang' : '') + '">' +
          ((st === '少阳' || st === '老阳') ? '<i class="zb-b1"></i>' : '<i class="zb-b0"></i><i class="zb-b0"></i>') + '</span>');
        rows.push('</div>');
      }
      elMRows.innerHTML = rows.join('');
      var btns = elMRows.querySelectorAll('.zb-mopt');
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function (ev) {
          var no = parseInt(ev.currentTarget.getAttribute('data-no'), 10);
          var st = ev.currentTarget.getAttribute('data-st');
          state.manual[no - 1] = st;
          paintManual();
        });
      }
    }

    function setBusy(busy) {
      state.tossing = busy;
      btnToss.disabled = busy;
      btnManual.disabled = busy;
      btnManualGo.disabled = busy;
      btnToss.textContent = busy ? '起卦中…' : '三枚铜钱起卦';
    }

    /* ---- 铜钱动效 ---- */
    function paintTossRows(done, cur) {
      var out = [];
      for (var i = 0; i < 6; i++) {
        var row = done[i];
        out.push('<div class="zb-trow' + (i === cur ? ' cur' : '') + (row ? ' done' : '') + '">');
        out.push('<span class="zb-tpos">' + LINE_NAMES[i] + '爻</span>');
        out.push('<span class="zb-tcoins">');
        if (row) {
          for (var c = 0; c < 3; c++) {
            out.push('<span class="zb-coin ' + (row.coins[c] === 3 ? 'yang' : 'yin') + '">' + (row.coins[c] === 3 ? '正' : '背') + '</span>');
          }
        } else {
          for (var c2 = 0; c2 < 3; c2++) out.push('<span class="zb-coin ph">—</span>');
        }
        out.push('</span>');
        out.push('<span class="zb-tval">' + (row ? row.value + ' ' + row.name : '') + '</span>');
        out.push('<span class="zb-tsym">' + (row ? (row.name === '老阳' ? '○' : row.name === '老阴' ? '×' : '') : '') + '</span>');
        out.push('</div>');
      }
      elToss.innerHTML = out.join('');
    }

    function doToss() {
      if (state.tossing) return;
      var q = readQuestion();
      if (!q) return;
      setBusy(true);
      elToss.hidden = false;
      elToss.classList.add('on');
      var done = [], i = 0;
      paintTossRows(done, 0);
      var tick = function () {
        var coins = [tossOneCoin(), tossOneCoin(), tossOneCoin()];
        var v = coins[0] + coins[1] + coins[2];
        done.push({ coins: coins, value: v, name: COIN_VALUE[v] });
        paintTossRows(done, i + 1 > 5 ? -1 : i + 1);
        i++;
        if (i < 6) {
          root.setTimeout(tick, 130);
        } else {
          root.setTimeout(function () {
            setBusy(false);
            var states = done.map(function (d) { return d.name; });
            cast(states, q);
          }, 200);
        }
      };
      root.setTimeout(tick, 30);
    }

    /* ---- 出盘 ---- */
    function cast(states, q) {
      var now = nowCN();
      var chart;
      try {
        chart = buildChart(now.date, now.time, states, q);
      } catch (e) {
        toast('起卦失败：' + e.message);
        return;
      }
      state.chart = chart;
      renderOut(chart, state.topic);
    }

    /* ---- 卦盘 ---- */
    function lineSymbolHTML(ln) {
      if (ln.yang) return '<span class="zb-line"><i class="zb-bar full"></i></span>';
      return '<span class="zb-line"><i class="zb-bar half"></i><i class="zb-bar half"></i></span>';
    }

    /* 神煞：值可能是单支、双支字符串（如「辰戌」）或数组；统一拆成地支 */
    function shenshaBranches(v) {
      if (v === undefined || v === null) return [];
      if (Object.prototype.toString.call(v) === '[object Array]') return v.slice();
      var s = String(v), out = [];
      for (var i = 0; i < s.length; i++) {
        if (BRANCHES.indexOf(s.charAt(i)) >= 0) out.push(s.charAt(i));
      }
      return out;
    }
    function shenshaHTML(chart) {
      var ss = chart.shensha || {}, items = [];
      for (var n in ss) {
        var bs = shenshaBranches(ss[n]), labels = [];
        for (var i = 0; i < bs.length; i++) {
          for (var no = 1; no <= 6; no++) {
            if (chart.hexagram.lines[no - 1].branch === bs[i]) labels.push(LINE_NAMES[no - 1] + '爻');
          }
        }
        items.push('<div class="zb-ssi"><b>' + esc(n) + '</b>' + esc(bs.join('')) +
          (labels.length ? ' <span class="zb-ssp">· ' + esc(labels.join('、')) + '</span>' : '') + '</div>');
      }
      return '<div class="zb-ss"><div class="zb-ss-t">神煞备注<span class="zb-ss-tn">按主卦爻位</span></div><div class="zb-ss-g">' + items.join('') + '</div></div>';
    }

    var WX_CLASS = { 木: 'mu', 火: 'huo', 土: 'tu', 金: 'jin', 水: 'shui' };
    function wxHTML(el) {
      if (!el) return '';
      return '<i class="zb-wx zb-wx-' + (WX_CLASS[el] || 'tu') + '">' + esc(el) + '</i>';
    }

    /* 世应小字（主卦金字、变卦暗一档） */
    function roleHTML(role, dim) {
      if (!role) return '';
      return '<em class="zb-role' + (role === '世' ? ' shi' : ' ying') + (dim ? ' zb-role2' : '') + '">' + esc(role) + '</em>';
    }
    /* 旬空：只看日辰旬空，主卦、变卦的支都可能落空 */
    function boardHTML(chart) {
      var H = chart.hexagram, pl = chart.calendar.pillars;
      var hasCh = !!H.hasChange;
      var chp = H.changedPalace || {};
      var dayVoid = chart.calendar.dayVoid || '';
      function kongHTML(branch) {
        return dayVoid.indexOf(branch) >= 0 ? '<i class="zb-kong" title="旬空">空</i>' : '';
      }
      var head = [];
      head.push('<div class="zb-bhead">');
      /* 主卦一行、变卦一行：窄屏不会挤成乱换行 */
      head.push('<div class="zb-hrow"><span class="zb-hlbl">主卦</span>' +
        '<span class="zb-hname">' + esc(H.name) + '</span>' +
        '<span class="zb-tag">' + esc(H.palace.palace + '宫·' + H.palace.element) + '</span>' +
        (H.palace.stage !== '本宫' && H.nature !== H.palace.stage ? '<span class="zb-tag">' + esc(H.palace.stage) + '</span>' : '') +
        (H.nature && H.nature !== H.palace.stage ? '<span class="zb-tag zb-tag-nat">' + esc(H.nature) + '</span>' : '') +
        (!hasCh ? '<span class="zb-tag zb-tag-quiet">六爻安静</span>' : '') +
        '</div>');
      if (hasCh) {
        head.push('<div class="zb-hrow"><span class="zb-hlbl zb-hlbl2">变卦</span>' +
          '<span class="zb-hname2">' + esc(H.changedName) + '</span>' +
          '<span class="zb-tag">' + esc(chp.palace + '宫·' + chp.element) + '</span>' +
          (chp.stage && chp.stage !== '本宫' ? '<span class="zb-tag">' + esc(chp.stage) + '</span>' : '') +
          (H.changedNature && H.changedNature !== chp.stage ? '<span class="zb-tag zb-tag-nat">' + esc(H.changedNature) + '</span>' : '') +
          '</div>');
      }
      head.push('<div class="zb-mrow2">');
      head.push('<span class="zb-gz">' + esc(pl.year + '年 ' + pl.month + '月 ' + pl.day + '日 ' + pl.hour + '时') + '</span>');
      head.push('<span class="zb-void">空亡 ' + esc(chart.calendar.dayVoid) + '</span>');
      head.push('<span class="zb-qtime">' + esc(chart.date + ' ' + chart.time.slice(0, 5)) + ' UTC+8</span>');
      head.push('</div>');
      if (chart.question) head.push('<div class="zb-kq">钥语：' + esc(chart.question) + '</div>');
      head.push('</div>');

      var rows = [];
      for (var no = 6; no >= 1; no--) {
        var ln = H.lines[no - 1];
        rows.push('<div class="zb-row' + (ln.moving ? ' mov' : '') + '">');
        /* 六神按爻位，主变同位同神，只列一次 */
        rows.push('<span class="zb-spirit">' + esc(ln.spirit) + '</span>');
        rows.push('<span class="zb-fus' + (ln.hidden.missingRelation ? ' miss' : '') + '">' +
          '<i class="zb-f1">' + esc(ln.hidden.relation) + '</i>' +
          '<i class="zb-f2">' + esc(ln.hidden.stem + ln.hidden.branch) + wxHTML(ln.hidden.element) + '</i></span>');
        rows.push('<span class="zb-main">' +
          '<i class="zb-f1">' + esc(ln.relation) + roleHTML(ln.role, false) + '</i>' +
          '<i class="zb-f2">' + esc(ln.stem + ln.branch) + wxHTML(ln.element) + kongHTML(ln.branch) + '</i></span>');
        rows.push('<span class="zb-sym">' + lineSymbolHTML(ln) + '<em class="zb-mk">' +
          (ln.marker === 'O' ? '○' : ln.marker === 'X' ? '×' : '') + '</em></span>');
        if (hasCh) {
          rows.push('<span class="zb-chg">' +
            '<i class="zb-f1">' + esc(ln.changedRelation) + roleHTML(ln.changedRole, true) + '</i>' +
            '<i class="zb-f2">' + esc(ln.changedStem + ln.changedBranch) + wxHTML(ln.changedElement) + kongHTML(ln.changedBranch) + '</i></span>');
          rows.push('<span class="zb-sym zb-sym2">' + lineSymbolHTML({ yang: ln.moving ? 1 - ln.yang : ln.yang }) + '<em class="zb-mk"></em></span>');
        }
        rows.push('</div>');
      }

      var legend = '<div class="zb-legend"><span>六神</span><span>伏神</span>' +
        '<span class="zb-lg zb-lg-main">主卦</span>' +
        (hasCh ? '<span class="zb-lg zb-lg-chg">变卦</span>' : '') + '</div>';
      var tips = '<div class="zb-tips"><span>○ 老阳动</span><span>× 老阴动</span>' +
        '<span class="zb-tipwx">五行：' + wxHTML('木') + wxHTML('火') + wxHTML('土') + wxHTML('金') + wxHTML('水') + '</span>' +
        (hasCh ? '<span>六神按爻位，主变同位同神</span>' : '') + '</div>';
      return '<div class="zb-board' + (hasCh ? '' : ' quiet') + '">' + head.join('') +
        '<div class="zb-rows">' + legend + rows.join('') + '</div>' + tips + '</div>';
    }

    /* 微信联系卡：页面上不再生成断卦结论，改为引导一对一 */
    var TOPIC_LABEL = { career: '事业', wealth: '财运', love: '感情', marry: '婚姻', health: '健康', study: '学业', travel: '出行', lost: '失物', other: '其他' };

    function contactCard(chart, topicKey) {
      var p4 = chart.calendar.pillars;
      var copyText = '一恒体系 · 占卜\n问事：' + (TOPIC_LABEL[topicKey] || '其他') +
        '\n钥语：' + (chart.question || '（未填）') +
        '\n起卦：' + chart.date + ' ' + String(chart.time).slice(0, 5) + '（UTC+8）' +
        '\n四柱：' + p4.year + '年 ' + p4.month + '月 ' + p4.day + '日 ' + p4.hour + '时' +
        '\n卦：' + chart.hexagram.name + '（' + chart.hexagram.palace.palace + '宫·' + chart.hexagram.palace.stage + '）' +
        (chart.hexagram.changedName ? ' → ' + chart.hexagram.changedName : '（六爻安静）') +
        '\n空亡：' + chart.calendar.dayVoid;

      var host = rootEl.ownerDocument.createElement('div');
      host.className = 'zb-gate';
      var y = YH();
      if (y && typeof y.contact === 'function') {
        y.contact(host, {
          title: '解卦与时机',
          text: '盘面已经排出来了。这一卦怎么解、什么时候应，要结合你的钥语逐条推，页面上不展开——加微信，把这次的盘面发我，我按你问的事一对一说。',
          copyText: copyText,
          wxKeyword: '占卦'
        });
        return host;
      }
      host.innerHTML = '<div class="lock">' +
        '<div class="lk-t">解卦与时机</div>' +
        '<p class="lk-p">这一卦怎么解、什么时候应，要结合钥语逐条推。</p>' +
        '<div class="lk-wx"><div class="wx-t">加微信，回复「占卦」</div><div class="wx-id">xy1618fff</div></div>' +
        '</div>';
      return host;
    }

    function renderOut(chart, topicKey) {
      var html = [];
      html.push(h2(1, '卦盘'));
      html.push(boardHTML(chart));
      html.push(shenshaHTML(chart));
      elOut.innerHTML = html.join('');
      elOut.appendChild(contactCard(chart, topicKey));
    }

    /* ---- 事件 ---- */
    btnToss.addEventListener('click', function () {
      hideManual();
      doToss();
    });
    btnManual.addEventListener('click', function () {
      elManual.hidden = false;
      paintManual();
      if (elManual.scrollIntoView) {
        try { elManual.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) { }
      }
    });
    btnCancel.addEventListener('click', hideManual);
    btnReset.addEventListener('click', function () {
      state.manual = MANUAL_DEFAULT.slice();
      paintManual();
      toast('已重置为六个少阳（全静卦）');
    });
    btnManualGo.addEventListener('click', function () {
      var q = readQuestion();
      if (!q) return;
      var now = nowCN();
      var chart;
      try {
        chart = buildChart(now.date, now.time, state.manual.slice(), q);
      } catch (e) {
        toast('起卦失败：' + e.message);
        return;
      }
      state.chart = chart;
      hideManual();
      elToss.hidden = true;
      renderOut(chart, elTopic.value);
    });
    elTopic.addEventListener('change', function () {
      state.topic = elTopic.value;
      if (state.chart) renderOut(state.chart, state.topic);
    });
    elQ.addEventListener('input', function () {
      elQ.classList.remove('err');
    });

    function hideManual() { elManual.hidden = true; }

    paintManual();
  }

})(window);
