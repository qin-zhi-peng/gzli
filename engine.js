/* 一恒命理 · 历法引擎（浏览器版，纯 JS，无依赖）
 * 口径与服务端 Python 引擎一致：新修 360 日岁序 / 平气月 / 紫微新修 / 近似星历
 * 数据：window.ML_DATA（data.js）
 * 入口：ML.compute({date:"2000-03-15", hour:7, minute:30, gender:"男"})
 */
(function (root) {
  'use strict';
  var D = root.ML_DATA;
  var STEMS = D.stems, BRANCHES = D.branches, TERMS = D.terms;
  var ZODIAC = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
  var MAJOR_BRANCHES = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];
  var PALACE_NAMES = ['命宫','兄弟宫','夫妻宫','子女宫','财帛宫','疾厄宫','迁移宫','仆役宫','官禄宫','田宅宫','福德宫','父母宫'];
  var ZIWEI_SERIES = [['紫微',0],['天机',-1],['太阳',-3],['武曲',-4],['天同',-5],['廉贞',-8]];
  var TIANFU_SERIES = [['天府',0],['太阴',1],['贪狼',2],['巨门',3],['天相',4],['天梁',5],['七杀',6],['破军',10]];
  var FIVE_STEM = {'甲':1,'乙':1,'丙':2,'丁':2,'戊':3,'己':3,'庚':4,'辛':4,'壬':5,'癸':5};
  var FIVE_BRANCH = {'子':1,'丑':1,'午':1,'未':1,'寅':2,'卯':2,'申':2,'酉':2,'辰':3,'巳':3,'戌':3,'亥':3};
  var FIVE_MAP = {1:{el:'木',n:3,cn:'木三局'},2:{el:'金',n:4,cn:'金四局'},3:{el:'水',n:2,cn:'水二局'},4:{el:'火',n:6,cn:'火六局'},5:{el:'土',n:5,cn:'土五局'}};
  var FOUR = {'甲':{禄:'廉贞',权:'破军',科:'武曲',忌:'太阳'},'乙':{禄:'天机',权:'天梁',科:'紫微',忌:'太阴'},
              '丙':{禄:'天同',权:'天机',科:'文昌',忌:'廉贞'},'丁':{禄:'太阴',权:'天同',科:'天机',忌:'巨门'},
              '戊':{禄:'贪狼',权:'太阴',科:'右弼',忌:'天机'},'己':{禄:'武曲',权:'贪狼',科:'天梁',忌:'文曲'},
              '庚':{禄:'太阳',权:'武曲',科:'太阴',忌:'天同'},'辛':{禄:'巨门',权:'太阳',科:'文曲',忌:'文昌'},
              '壬':{禄:'天梁',权:'紫微',科:'左辅',忌:'武曲'},'癸':{禄:'破军',权:'巨门',科:'太阴',忌:'贪狼'}};
  var KUIYUE = {'甲':['丑','未'],'戊':['丑','未'],'庚':['丑','未'],'乙':['子','申'],'己':['子','申'],'辛':['午','寅'],'壬':['卯','巳'],'癸':['卯','巳'],'丙':['亥','酉'],'丁':['亥','酉']};
  var LUCUN = {'甲':'寅','乙':'卯','丙':'巳','丁':'午','戊':'巳','己':'午','庚':'申','辛':'酉','壬':'亥','癸':'子'};
  var JIELU = {'甲':['申','酉'],'己':['申','酉'],'乙':['午','未'],'庚':['午','未'],'丙':['辰','巳'],'辛':['辰','巳'],'丁':['寅','卯'],'壬':['寅','卯'],'戊':['子','丑'],'癸':['子','丑']};
  var GUANFU = {'甲':['未','酉'],'乙':['辰','申'],'丙':['巳','子'],'丁':['寅','亥'],'戊':['卯','卯'],'己':['酉','寅'],'庚':['亥','午'],'辛':['酉','巳'],'壬':['戌','午'],'癸':['午','巳']};
  var TIANCHU = {'甲':'巳','丁':'巳','乙':'午','戊':'午','辛':'午','丙':'子','己':'申','庚':'寅','壬':'酉','癸':'亥'};
  var MASTER = {'子':'贪狼','丑':'巨门','寅':'禄存','卯':'文曲','辰':'廉贞','巳':'武曲','午':'破军','未':'武曲','申':'廉贞','酉':'文曲','戌':'禄存','亥':'巨门'};
  var BODYMASTER = {'子':'铃星','丑':'天相','寅':'天梁','卯':'天同','辰':'文昌','巳':'天机','午':'火星','未':'天相','申':'天梁','酉':'天同','戌':'文昌','亥':'天机'};
  var MONTH_BRANCHES = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];
  var YUEJIE = ['申','申','戌','戌','子','子','寅','寅','辰','辰','午','午'];
  var TIANWU = ['巳','申','寅','亥','巳','申','寅','亥','巳','申','寅','亥'];
  var TIANYUE = ['戌','巳','辰','寅','未','卯','亥','未','寅','午','戌','寅'];
  var YINSHA = ['寅','子','戌','申','午','辰','寅','子','戌','申','午','辰'];
  var MANSIONS = [[200,'角','寿星'],[212,'亢','寿星'],[221,'氐','大火'],[236,'房','大火'],[241,'心','大火'],[246,'尾','析木'],[264,'箕','析木'],[275,'斗','星纪'],[301,'牛','星纪'],[309,'女','玄枵'],[321,'虚','玄枵'],[331,'危','玄枵'],[345,'室','娵訾'],[362,'壁','娵訾'],[371,'奎','降娄'],[387,'娄','降娄'],[399,'胃','大梁'],[413,'昴','大梁'],[424,'毕','大梁'],[440,'觜','实沈'],[442,'参','实沈'],[451,'井','鹑首'],[481,'鬼','鹑首'],[485,'柳','鹑火'],[500,'星','鹑火'],[507,'张','鹑火'],[525,'翼','鹑尾'],[543,'轸','鹑尾']];
  var SIGNS = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼'];
  var JIE = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];   // 二十四气里的「节」：小寒…大雪

  function mod(x, n) { return ((x % n) + n) % n; }
  function rad(d) { return d * Math.PI / 180; }
  function deg(r) { return r * 180 / Math.PI; }
  function sind(x) { return Math.sin(rad(x)); }
  function cosd(x) { return Math.cos(rad(x)); }
  function zi(b) { return BRANCHES.indexOf(b); }
  function mb(i) { return MAJOR_BRANCHES[mod(i, 12)]; }
  function zAt(start, off) { return BRANCHES[mod(zi(start) + off, 12)]; }
  /* Python round：四舍六入，五取偶（银行家舍入） */
  function pyround(x) {
    var f = Math.floor(x), d = x - f;
    if (d > 0.5) return f + 1;
    if (d < 0.5) return f;
    return (f % 2 === 0) ? f : f + 1;
  }

  // ---------- 历法基础 ----------
  function jdn(y, m, d) {
    var a = Math.floor((14 - m) / 12), y2 = y + 4800 - a, m2 = m + 12 * a - 3;
    return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
  }
  function fromJdn(J) {
    var a = J + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor(146097 * b / 4);
    var d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * d / 4), m = Math.floor((5 * e + 2) / 153);
    return { year: 100 * b + d - 4800 + Math.floor(m / 10), month: m + 3 - 12 * Math.floor(m / 10),
             day: e - Math.floor((153 * m + 2) / 5) + 1 };
  }
  function winterList() {
    var arr = [];
    for (var y in D.winters) arr.push([+y, D.winters[y][0], D.winters[y][1]]);
    arr.sort(function (a, b) { return a[0] - b[0]; });
    return arr;
  }
  var WINTERS = winterList();

  function windowOf(lms) {
    var probe = lms - 0.5, pick = WINTERS[0];
    for (var i = 0; i < WINTERS.length; i++) { if (WINTERS[i][2] <= probe) pick = WINTERS[i]; else break; }
    var idx = WINTERS.indexOf(pick), next = WINTERS[idx + 1] || [pick[0] + 1, pick[1] + 365, pick[2] + 365];
    var gap = Math.min(366, Math.max(365, Math.round(next[1] - pick[1])));
    return { year: pick[0], start: pick[1], next: next[1], gap: gap };
  }

  function pingQi(lms) {
    var w = windowOf(lms), steps = w.gap === 366 ? D.steps366 : D.steps365;
    var rows = [], dd = w.start;
    for (var i = 0; i < 24; i++) {
      rows.push({ name: TERMS[i], day: dd, cmp: dd + i / 24 });
      if (i < 23) dd += steps[i];
    }
    var lichunYear = fromJdn(Math.floor(rows[3].day + 0.5)).year;
    var cycleYear, pos;
    if (lms < rows[1].cmp) { cycleYear = lichunYear - 1; pos = 10; }
    else if (lms < rows[3].cmp) { cycleYear = lichunYear - 1; pos = 11; }
    else {
      var idx = 3;
      for (var k = 3; k < 24; k += 2) { if (rows[k].cmp <= lms) idx = k; else break; }
      pos = Math.floor((idx - 3) / 2); cycleYear = lichunYear;
    }
    var absOff = (cycleYear - 1962) * 12 + pos, sex = mod(50 + absOff, 60);
    return { rows: rows, pos: pos, cycleYear: cycleYear, sex: sex, monthName: sexName(sex), branch: BRANCHES[sex % 12], w: w };
  }
  function sexName(i) { return STEMS[i % 10] + BRANCHES[i % 12]; }

  function lunarDayOf(J) {
    for (var i = 0; i < D.lunar.length; i++) {
      var m = D.lunar[i];
      if (J >= m[0] && J < m[0] + m[1]) return { day: J - m[0] + 1, month: m[2], leap: m[3] === 1, len: m[1] };
    }
    return { day: 1, month: 1, leap: false, len: 30 };
  }

  // ---------- 紫微 ----------
  function palaceStem(monthStem, monthBranch, branch) {
    var step = mod(zi(branch) - zi(monthBranch), 12);
    return STEMS[mod(monthStem + step, 10)];
  }
  function bureauOf(gz) {
    var s = FIVE_STEM[gz[0]], b = FIVE_BRANCH[gz[1]], n = s + b; if (n > 5) n -= 5;
    return FIVE_MAP[n];
  }
  function starStart(bureau, day) {
    var borrow = mod(bureau - day % bureau, bureau);
    var q = Math.floor((day + borrow) / bureau) % 12, base = q - 1;
    var zw = borrow % 2 === 0 ? mod(base + borrow, 12) : mod(base - borrow, 12);
    return { ziwei: zw, tianfu: mod(-zw, 12), borrow: borrow, q: q };
  }
  var TRINE = function (b) {
    if ('寅午戌'.indexOf(b) >= 0) return '寅午戌';
    if ('申子辰'.indexOf(b) >= 0) return '申子辰';
    if ('巳酉丑'.indexOf(b) >= 0) return '巳酉丑';
    return '亥卯未';
  };
  var GUGUA = {'寅':['巳','丑'],'卯':['巳','丑'],'辰':['巳','丑'],'巳':['申','辰'],'午':['申','辰'],'未':['申','辰'],'申':['亥','未'],'酉':['亥','未'],'戌':['亥','未'],'亥':['寅','戌'],'子':['寅','戌'],'丑':['寅','戌']};
  var FEILIAN = {'子':'申','丑':'酉','寅':'戌','卯':'巳','辰':'午','巳':'未','午':'寅','未':'卯','申':'辰','酉':'亥','戌':'子','亥':'丑'};
  var POSUI = {'子':'巳','午':'巳','卯':'巳','酉':'巳','寅':'酉','申':'酉','巳':'酉','亥':'酉','辰':'丑','戌':'丑','丑':'丑','未':'丑'};
  var TIANMA = {'寅午戌':'申','申子辰':'寅','巳酉丑':'亥','亥卯未':'巳'};
  var HUAGAI = {'申子辰':'辰','巳酉丑':'丑','寅午戌':'戌','亥卯未':'未'};
  var XIANCHI = {'申子辰':'酉','巳酉丑':'午','寅午戌':'卯','亥卯未':'子'};
  var HUO = {'申子辰':['寅','戌'],'寅午戌':['丑','卯'],'巳酉丑':['卯','戌'],'亥卯未':['酉','戌']};

  function allStars(yearGz, monthPos, lifeB, bodyB, hourB, gender) {
    var ys = yearGz[0], yb = yearGz[1], stars = [];
    if (BRANCHES.indexOf(yb) < 0) { yb = '子'; }
    if (STEMS.indexOf(ys) < 0) { ys = '甲'; }
    function add(n, b, cat) { stars.push({ n: n, b: b, cat: cat || '' }); }
    var tr = TRINE(yb), yi = zi(yb), hi = zi(hourB), lifeI = zi(lifeB);
    // 年支类
    add('天马', TIANMA[tr], '吉'); add('天空', zAt(yb, 1)); add('天哭', zAt('午', -yi)); add('天虚', zAt('午', yi));
    add('龙池', zAt('辰', yi)); add('凤阁', zAt('戌', -yi)); var hl = zAt('卯', -yi);
    add('红鸾', hl, '吉'); add('天喜', zAt(hl, 6), '吉');
    add('孤辰', GUGUA[yb][0]); add('寡宿', GUGUA[yb][1]); add('蜚廉', FEILIAN[yb]); add('破碎', POSUI[yb]);
    add('华盖', HUAGAI[tr]); add('咸池', XIANCHI[tr]);
    add('天才', zAt(lifeB, yi), '吉'); add('天寿', zAt(bodyB, yi), '吉');
    // 时支类
    add('文曲', zAt('辰', hi), '吉'); add('文昌', zAt('戌', -hi), '吉'); add('地劫', zAt('亥', hi)); add('地空', zAt('亥', -hi));
    add('台辅', zAt('午', hi), '吉'); add('封诰', zAt('寅', -hi), '吉');
    add('火星', zAt(HUO[tr][0], hi)); add('铃星', zAt(HUO[tr][1], hi));
    // 年干类
    add('天魁', KUIYUE[ys][0], '吉'); add('天钺', KUIYUE[ys][1], '吉');
    var lu = LUCUN[ys]; add('禄存', lu, '吉'); add('擎羊', zAt(lu, 1)); add('陀罗', zAt(lu, -1));
    add('截路', JIELU[ys][0]); add('空亡', JIELU[ys][1]);
    add('天官', GUANFU[ys][0], '吉'); add('天福', GUANFU[ys][1], '吉'); add('天厨', TIANCHU[ys], '吉');
    // 固定宫位
    add('天伤', BRANCHES[mod(lifeI - 7, 12)]); add('天使', BRANCHES[mod(lifeI - 5, 12)]);
    // 月序 8 颗（monthPos 0..11 = 寅..丑）
    var m = monthPos % 12;
    add('左辅', zAt('辰', m), '吉'); add('右弼', zAt('戌', -m), '吉');
    add('天刑', zAt('酉', m)); add('天姚', zAt('丑', m)); add('月解', YUEJIE[m], '吉');
    add('天巫', TIANWU[m], '吉'); add('天月', TIANYUE[m]); add('阴煞', YINSHA[m]);
    return stars;
  }

  function ziwei(birth) {
    var lms = birth.lms, pq = pingQi(lms);
    var monthBranch = pq.branch, monthStemIdx = pq.sex % 10;
    var hourB = birth.hourBranch;
    var midx = zi(monthBranch), lifeI = mod(midx - zi(hourB), 12), bodyI = mod(midx + zi(hourB), 12);
    var lifeB = BRANCHES[lifeI], bodyB = BRANCHES[bodyI];
    var lifeGz = palaceStem(monthStemIdx, monthBranch, lifeB) + lifeB;
    var bu = bureauOf(lifeGz);
    var lunar = lunarDayOf(birth.lmsJdn);
    var st = starStart(bu.n, lunar.day);
    var majors = [];
    ZIWEI_SERIES.forEach(function (x) { majors.push({ n: x[0], b: mb(st.ziwei + x[1]) }); });
    TIANFU_SERIES.forEach(function (x) { majors.push({ n: x[0], b: mb(st.tianfu + x[1]) }); });
    var year = STEMS[mod(birth.off, 10)] + BRANCHES[mod(birth.off + 2, 12)];
    var stars = majors.concat(allStars(year, pq.pos, lifeB, bodyB, hourB));
    // 四化
    var f = FOUR[year[0]], mut = {};
    [['禄', 'lu'], ['权', 'quan'], ['科', 'ke'], ['忌', 'ji']].forEach(function (k) {
      var name = f[k[0]], hit = stars.filter(function (s) { return s.n === name; })[0];
      if (hit) { hit.m = k[0]; mut[k[0]] = { star: name, branch: hit.b }; }
    });
    // 宫位
    var palaces = [];
    for (var i = 0; i < 12; i++) {
      var b = BRANCHES[i], name = PALACE_NAMES[mod(lifeI - i, 12)];
      palaces.push({ b: b, name: name, stem: palaceStem(monthStemIdx, monthBranch, b),
        stars: stars.filter(function (s) { return s.b === b; }) });
    }
    // 大限
    var yang = birth.off % 10 % 2 === 0, male = birth.gender === '男';
    var step = (yang && male) || (!yang && !male) ? 1 : -1;
    var ranges = [];
    for (var k2 = 0; k2 < 12; k2++) {
      ranges.push({ i: k2, b: BRANCHES[mod(lifeI + step * k2, 12)], r: [bu.n + 10 * k2, bu.n + 10 * k2 + 9],
        startJd: birth.birthJd + (bu.n + 10 * k2 - 1) * 360 });
    }
    return { lifeB: lifeB, bodyB: bodyB, lifeGz: lifeGz, bureau: bu, lunar: lunar, start: st,
      majors: majors, stars: stars, mut: mut, palaces: palaces, ranges: ranges,
      mingzhu: MASTER[year[1]], shenzhu: BODYMASTER[year[1]], year: year, month: pq.monthName, monthBranch: monthBranch };
  }

  // ---------- 星历 ----------
  function sunLon(jd) {
    var T = (jd - 2451545.0) / 36525.0;
    var L = mod(280.46646 + 36000.76983 * T + 0.0003032 * T * T, 360);
    var M = mod(357.52911 + 35999.05029 * T - 0.0001537 * T * T, 360);
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sind(M) + (0.019993 - 0.000101 * T) * sind(2 * M) + 0.000289 * sind(3 * M);
    var om = 125.04 - 1934.136 * T;
    return mod(L + C - 0.00569 - 0.00478 * sind(om), 360);
  }
  function moonPos(jd) {
    var T = (jd - 2451545.0) / 36525.0;
    var Lp = mod(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T, 360);
    var Dd = mod(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T, 360);
    var M = mod(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T, 360);
    var Mp = mod(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T, 360);
    var F = mod(93.2720950 + 483202.0175233 * T - 0.0036539 * T * T, 360);
    var lon = mod(Lp + 6.289 * sind(Mp) + 1.274 * sind(2 * Dd - Mp) + 0.658 * sind(2 * Dd) + 0.214 * sind(2 * Mp) - 0.186 * sind(M) - 0.114 * sind(2 * F), 360);
    var lat = 5.128 * sind(F) + 0.280 * sind(Mp + F) + 0.277 * sind(Mp - F) + 0.173 * sind(2 * Dd - F) + 0.055 * sind(2 * Dd - Mp + F);
    var dist = 385001 - 20905 * cosd(Mp) - 3699 * cosd(2 * Dd - Mp) - 2956 * cosd(2 * Dd) - 570 * cosd(2 * Mp) + 246 * cosd(2 * Mp - 2 * Dd);
    return { lon: lon, lat: lat, dist: dist };
  }
  function jupiterGeo(jd) {
    var d = jd - 2451545.0, a = 5.2028, e = 0.0483, om = 273.867, Om = 100.464, i = 1.304, M0 = 19.65, n = 0.0830912;
    var M = mod(M0 + n * d, 360), E = M;
    for (var k = 0; k < 8; k++) { var f = E - e * deg(Math.sin(rad(E))) - M; var fp = 1 - e * Math.cos(rad(E)); E = E - f / fp; }
    var xv = a * (cosd(E) - e), yv = a * Math.sqrt(1 - e * e) * sind(E);
    var v = deg(Math.atan2(yv, xv)), r = Math.hypot(xv, yv);
    var lonH = mod(v + om + Om, 360), latH = i * sind(mod(lonH - Om, 360));
    // 地球日心
    var ls = sunLon(jd), T = (jd - 2451545.0) / 36525.0, g = mod(357.52772 + 35999.05034 * T, 360);
    var re = 1.000001018 * (1 - 0.0167086 * 0.0167086) / (1 + 0.0167086 * cosd(g));
    var le = mod(ls + 180, 360);
    var x = r * cosd(latH) * cosd(lonH) - re * cosd(le), y = r * cosd(latH) * sind(lonH) - re * sind(le), z = r * sind(latH);
    return { lon: mod(deg(Math.atan2(y, x)), 360), lat: deg(Math.atan2(z, Math.hypot(x, y))), dist: Math.sqrt(x * x + y * y + z * z) };
  }
  function eq(lon, lat, jd) {
    var T = (jd - 2451545.0) / 36525.0, eps = 23.4392911 - 0.0130042 * T;
    var ra = deg(Math.atan2(sind(lon) * cosd(eps) - Math.tan(rad(lat)) * sind(eps), cosd(lon)));
    var dec = deg(Math.asin(sind(lat) * cosd(eps) + cosd(lat) * sind(eps) * sind(lon)));
    return { ra: mod(ra, 360), dec: dec };
  }
  function altAz(ra, dec, jd, lat, lon) {
    var T = (jd - 2451545.0) / 36525.0;
    var gmst = mod(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000.0, 360);
    var H = mod(gmst + lon - ra, 360);
    var alt = deg(Math.asin(sind(lat) * sind(dec) + cosd(lat) * cosd(dec) * cosd(H)));
    var az = mod(deg(Math.atan2(-cosd(dec) * sind(H), sind(dec) * cosd(lat) - cosd(dec) * sind(lat) * cosd(H))), 360);
    return { alt: alt, az: az };
  }
  function mansion(lon) {
    lon = mod(lon, 360); var uw = lon < MANSIONS[0][0] ? lon + 360 : lon, best = MANSIONS[MANSIONS.length - 1];
    for (var i = 0; i < MANSIONS.length; i++) {
      var s = MANSIONS[i][0], e = i + 1 < MANSIONS.length ? MANSIONS[i + 1][0] : MANSIONS[0][0] + 360;
      if (s <= uw && uw < e) { best = MANSIONS[i]; break; }
    }
    return { name: best[1] + '宿', ci: best[2] };
  }
  function phaseName(e) {
    if (e < 11.25 || e >= 348.75) return '朔（新月）';
    if (e < 78.75) return '蛾眉月（上弦前）'; if (e < 101.25) return '上弦'; if (e < 168.75) return '盈凸月';
    if (e < 191.25) return '望（满月）'; if (e < 258.75) return '亏凸月'; if (e < 281.25) return '下弦'; return '残月（下弦后）';
  }
  function skyAt(jd, lat, lon) {
    var s = sunLon(jd), se = eq(s, 0, jd), sa = altAz(se.ra, se.dec, jd, lat, lon);
    var mo = moonPos(jd), me = eq(mo.lon, mo.lat, jd), ma = altAz(me.ra, me.dec, jd, lat, lon);
    var jl = jupiterGeo(jd), je = eq(jl.lon, jl.lat, jd), ja = altAz(je.ra, je.dec, jd, lat, lon);
    var jl2 = jupiterGeo(jd + 1).lon, dlon = mod(jl2 - jl.lon + 180, 360) - 180;
    var elong = mod(mo.lon - s, 360), illum = (1 - cosd(elong)) / 2, age = elong / 360 * 29.530588;
    var r = 5.2;
    return {
      sun: { lon: s, dec: se.dec, alt: sa.alt, az: sa.az, m: mansion(s), sign: SIGNS[Math.floor(s / 30)] },
      moon: { lon: mo.lon, lat: mo.lat, dec: me.dec, alt: ma.alt, az: ma.az, m: mansion(mo.lon), sign: SIGNS[Math.floor(mo.lon / 30)],
        dist: mo.dist, elong: elong, illum: illum, age: age, phase: phaseName(elong) },
      jupiter: { lon: jl.lon, lat: jl.lat, dec: je.dec, alt: ja.alt, az: ja.az, m: mansion(jl.lon), sign: SIGNS[Math.floor(jl.lon / 30)],
        dist: jl.dist, retro: dlon < 0, dm: dlon, mag: Math.round((-9.4 + 5 * Math.log10(r * jl.dist)) * 100) / 100,
        elong: (function (x) { return x <= 180 ? x : 360 - x; })(mod(jl.lon - s, 360)) }
    };
  }

  // ---------- 十神 ----------
  var WX = {'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};
  var SHENG = {'木':'火','火':'土','土':'金','金':'水','水':'木'};
  var KE = {'木':'土','土':'水','水':'火','火':'金','金':'木'};
  function tenGod(day, other) {
    if (!day || !other) return '';
    var a = WX[day], b = WX[other];
    var samePolarity = (STEMS.indexOf(day) % 2) === (STEMS.indexOf(other) % 2);
    if (a === b) return samePolarity ? '比肩' : '劫财';
    if (SHENG[a] === b) return samePolarity ? '食神' : '伤官';
    if (KE[a] === b) return samePolarity ? '偏财' : '正财';
    if (KE[b] === a) return samePolarity ? '七杀' : '正官';
    return samePolarity ? '偏印' : '正印';
  }

  // ---------- 主入口 ----------
  function compute(o) {
    var date = o.date, hh = o.hour, mi = o.minute || 0, gender = o.gender === '女' ? '女' : '男';
    var lon = 120, lat = 30, tz = 8;
    var y = +date.slice(0, 4), mo = +date.slice(5, 7), da = +date.slice(8, 10);
    var J = jdn(y, mo, da);
    var civil = (J - 0.5) + (hh + mi / 60) / 24;   // 当地钟表时（当 JD 用）
    var lms = civil + (lon - 15 * tz) / 360;        // 历法帧：当地平太阳时
    var utc = civil - tz / 24;                      // 天文帧：真 UTC
    var lp = fromJdn(Math.floor(lms + 0.5));
    var lmsJdn = jdn(lp.year, lp.month, lp.day);
    var tpart = (lms + 0.5) % 1;           // 0..1
    var hourFrac = mod((hh + mi / 60) + (lon - 15 * tz) / 15, 24);
    var hourBranch = (hourFrac >= 23 || hourFrac < 1) ? '子' : BRANCHES[Math.min(11, Math.floor((hourFrac + 1) / 2))];
    var off = Math.floor((lms - D.base) / 360);
    var pq = pingQi(lms);
    // ---------- 四柱新修大运：起运日 + 每运 3600 天 ----------
    // 起运按整点计（分钟不参与），基准是该日当地 0 点的 JD
    var birthHourJd = (J - 0.5) + hh / 24;
    var yangYear = mod(off, 10) % 2 === 0, male = gender === '男';
    var forward = (yangYear && male) || (!yangYear && !male);
    var termJd = 0, termIdx = 0, termDay = 0, ji, jx;
    if (forward) {
      for (ji = 0; ji < JIE.length; ji++) {
        jx = JIE[ji];
        // 大雪（表尾）按「下一个冬至前 15 天」回正，与 Python 引擎 _term_offsets 一致
        var candDay = (jx === 23) ? (pq.w.start + pq.w.gap - 15) : pq.rows[jx].day;
        var candJd = candDay + jx / 24;
        if (candJd > birthHourJd) { termDay = candDay; termJd = candJd; termIdx = jx; break; }
      }
      // 出生在当年大雪之后：参照下一年小寒
      if (!termIdx) { termDay = pq.w.next + 15; termJd = termDay + 1 / 24; termIdx = 1; }
    } else {
      for (ji = 0; ji < JIE.length; ji++) {
        jx = JIE[ji];
        var candDay2 = (jx === 23) ? (pq.w.start + pq.w.gap - 15) : pq.rows[jx].day;
        var candJd2 = candDay2 + (jx - 1) / 24;
        if (candJd2 < birthHourJd) { termDay = candDay2; termJd = candJd2; termIdx = jx; }
      }
      // 出生在小寒之前：参照上一年大雪
      if (!termIdx) { termDay = pq.w.start - 15; termJd = termDay + 22 / 24; termIdx = 23; }
    }
    var diff = Math.abs(birthHourJd - termJd);
    // 逆排且出生日与参照节同一天：按当天的整点差计
    if (!forward && termIdx) {
      var bDay = fromJdn(Math.floor(birthHourJd + 0.5));
      var tDay = fromJdn(Math.floor(termDay + 0.5));
      if (bDay.year === tDay.year && bDay.month === tDay.month && bDay.day === tDay.day) diff = (24 - termIdx) / 24;
    }
    var jyDays = pyround(diff * 120);
    var jiaoJd = Math.floor(birthHourJd + 0.5) + jyDays;
    var dayun = [];
    for (var dk = 0; dk < 8; dk++) {
      var startJd = jiaoJd + 3600 * dk, endJd = startJd + 3599;
      var pi = mod(pq.sex + (forward ? dk + 1 : -(dk + 1)), 60);
      var sAge = Math.floor(jyDays / 360) + 10 * dk;
      dayun.push({
        pillar: STEMS[pi % 10] + BRANCHES[pi % 12],
        startAge: sAge,
        endAge: sAge + 9,
        start: fromJdn(startJd),
        end: fromJdn(endJd),
        sky: skyAt(startJd - 0.5 - 8 / 24, lat, lon)
      });
    }
    var dcyc = mod(lmsJdn + 49, 60);
    var effHourIdx = zi(hourBranch);
    var hs = mod(mod(dcyc % 10, 5) * 2 + effHourIdx, 10);
    var birth = { lms: lms, lmsJdn: lmsJdn, off: off, hourBranch: hourBranch, gender: gender, birthJd: lms };
    var year = STEMS[mod(off, 10)] + BRANCHES[mod(off + 2, 12)];
    var pillars = [year, pq.monthName, sexName(dcyc), STEMS[hs] + hourBranch];
    var zw = ziwei(birth);
    var sky = skyAt(utc, lat, lon);
    // 每个大限起点的天体状态
    zw.ranges.forEach(function (r) {
      var jdStart = r.startJd;
      var p = fromJdn(Math.floor(jdStart + 0.5));
      var sk = skyAt(jdStart - tz / 24, lat, lon);
      r.sky = sk;
      r.dateText = p.year + '-' + ('0' + p.month).slice(-2) + '-' + ('0' + p.day).slice(-2);
    });
    var gods = pillars.map(function (p, i) { return i === 2 ? '日元' : tenGod(pillars[2][0], p[0]); });
    return { pillars: pillars, gods: gods, year: year, off: off, lms: lms, gender: gender, month: pq.monthName, monthBranch: pq.branch,
      lunar: zw.lunar, ziwei: zw, sky: sky, place: { lon: lon, lat: lat }, lmsJdn: lmsJdn,
      dayun: dayun, qiyunDays: jyDays,
      gregorian: date + ' ' + ('0' + hh).slice(-2) + ':' + ('0' + mi).slice(-2) };
  }

  root.ML = {
    compute: compute, skyAt: skyAt, jdn: jdn, fromJdn: fromJdn,
    pingQiRows: function (lms) { return pingQi(lms).rows; },
    addDays: function (lms, d) { return lms + d; },
    tenGod: tenGod,
    _debug: { pingQi: pingQi, lunarDayOf: lunarDayOf }
  };
})(window);
