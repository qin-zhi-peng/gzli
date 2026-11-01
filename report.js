/* 一恒命理 · 报告生成（浏览器版，规则模板）
 * 输入：ML.compute() 的结果 r
 * 输出：{ analyze: {...}, free: {summary, keys, caution} }
 * 说明：公开层只输出免费摘要——盘面 + 一句话结论 + 最多 2 条提示；
 *      完整推演不在这一层生成，页面只给摘要与加微信的入口。
 */
(function (root) {
  'use strict';
  var ML = root.ML;
  var WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  var YIN = { 甲: 0, 乙: 1, 丙: 0, 丁: 1, 戊: 0, 己: 1, 庚: 0, 辛: 1, 壬: 0, 癸: 1 }; // 0阳 1阴
  var HIDDEN = { 子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙', 午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬' };
  var HIDDEN_ALL = { 子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'], 辰: ['戊', '乙', '癸'], 巳: ['丙', '戊', '庚'], 午: ['丁', '己'], 未: ['己', '丁', '乙'], 申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'] };
  var DAY_MASTER = {
    甲: '阳木：直、讲原则、往上长。像大树，认准方向就不太拐弯。',
    乙: '阴木：柔、会绕、求生欲强。像藤蔓，顺着环境找缝往上爬。',
    丙: '阳火：外放、直给、要面子。像太阳，亮出来才有存在感。',
    丁: '阴火：细、敏感、讲究。像灯烛，照人不远但照得清。',
    戊: '阳土：稳、能扛、慢热。像山，靠得住但不太会表达。',
    己: '阴土：细、会养、能忍。像田园，什么都接得住。',
    庚: '阳金：硬、干脆、讲义气。像刀，快但容易伤人。',
    辛: '阴金：锐、精、爱惜羽毛。像首饰，看着软其实挑。',
    壬: '阳水：大、活、想得远。像江河，能装事也容易散。',
    癸: '阴水：细、沉、心里有数。像雨露，不说但都记着。'
  };
  var GOD_MEAN = {
    比肩: '自我、同辈竞争', 劫财: '争、破财、朋友多', 食神: '口福、才艺、表达', 伤官: '锋芒、不服管、创意',
    偏财: '机会钱、人情财', 正财: '稳定收入、务实', 七杀: '压力、魄力、被管', 正官: '规矩、职位、责任',
    偏印: '直觉、偏门学问', 正印: '学习、靠山、被照顾'
  };
  var STAR_MEAN = {
    紫微: '主观、要面子、能扛事', 天机: '想得多、会变通', 太阳: '外放、爱表现、付出型',
    武曲: '执行强、看重钱', 天同: '温和、爱舒服', 廉贞: '个性强、桃花重',
    天府: '稳、会存钱', 太阴: '细、顾家、情绪化', 贪狼: '欲望强、多才多艺',
    巨门: '嘴利、想得多', 天相: '会协调、讲体面', 天梁: '老成、爱管事、荫庇',
    七杀: '敢冲、硬扛', 破军: '折腾、不破不立'
  };
  var GONG_MEAN = {
    命宫: '自我与天性', 兄弟宫: '同辈与兄弟', 夫妻宫: '伴侣与亲密关系', 子女宫: '子女与作品',
    财帛宫: '挣钱方式', 疾厄宫: '身体与压力', 迁移宫: '外部机会', 仆役宫: '朋友与团队',
    官禄宫: '事业', 田宅宫: '家与资产', 福德宫: '精神生活', 父母宫: '长辈与文书'
  };
  /* 通用盘面知识表（公开层）：合冲刑与特殊柱，供盘面解读对照用 */
  var SIX_HARM = ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'];
  var SIX_CHONG = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'];
  var SAN_HE = ['申子辰', '亥卯未', '寅午戌', '巳酉丑'];
  var SAN_XING = ['寅巳申', '丑戌未', '子卯'];
  var SELF_XING = ['辰', '午', '酉', '亥'];
  var WU_HE = [['甲', '己'], ['乙', '庚'], ['丙', '辛'], ['丁', '壬'], ['戊', '癸']];
  var KUIGANG = ['庚辰', '壬辰', '戊戌', '庚戌'];
  var JINSHEN = ['乙丑', '己巳', '癸酉'];
  var YINCHA = ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥'];

  function analyze(r) {
    var p = r.pillars, day = p[2][0], dayWx = WX[day], dayYin = YIN[day];
    var gans = [p[0][0], p[1][0], p[2][0], p[3][0]];
    var zhis = [p[0][1], p[1][1], p[2][1], p[3][1]];
    // 十神（天干 3 + 地支本气 4）
    var gods = gans.map(function (g, i) { return i === 2 ? '日元' : ML.tenGod(day, g); });
    var zhiGods = zhis.map(function (z) { return ML.tenGod(day, HIDDEN[z]); });
    var all7 = gods.filter(function (g, i) { return i !== 2; }).concat(zhiGods);
    var count = {};
    all7.forEach(function (g) { count[g] = (count[g] || 0) + 1; });
    var sorted = Object.keys(count).sort(function (a, b) { return count[b] - count[a]; });
    // 财官是否成结构：只判「有没有偏差」，不下具体断语
    var caiGods = ['正财', '偏财'], guanGods = ['正官', '七杀'];
    var caiGan = gans.some(function (g, i) { return i !== 2 && caiGods.indexOf(ML.tenGod(day, g)) >= 0; });
    var caiZhi = zhis.some(function (z) { return caiGods.indexOf(ML.tenGod(day, HIDDEN[z])) >= 0; });
    var guanGan = gans.some(function (g, i) { return i !== 2 && guanGods.indexOf(ML.tenGod(day, g)) >= 0; });
    var guanZhi = zhis.some(function (z) { return guanGods.indexOf(ML.tenGod(day, HIDDEN[z])) >= 0; });
    var caiOk = caiGan && caiZhi, guanOk = guanGan && guanZhi;
    // 方向性提示：最多 2 条，只说「哪里有偏差、往哪看」，不给具体批断
    var bingo = [];
    if (!caiOk || !guanOk) bingo.push('本盘财官结构有偏差，具体走势需要结合大运流年整体判断。');
    if (count['劫财'] || count['伤官']) bingo.push('六亲星分布有明显主调，同类事情容易反复，具体怎么走要结合大运流年看。');
    return { day: day, dayWx: dayWx, dayYin: dayYin, gods: gods, zhiGods: zhiGods, count: count, sorted: sorted, bingo: bingo };
  }

  function freeOf(r, a) {
    var wx = a.dayWx, dm = DAY_MASTER[a.day] || '';
    var keys = a.sorted.slice(0, 3).map(function (g) { return g + '·' + (GOD_MEAN[g] || ''); });
    var caution = a.bingo[0] || '盘面比较顺，注意别把优势用成依赖';
    return {
      summary: '你是' + a.day + wx + '日主（' + (a.dayYin ? '阴' : '阳') + wx + '）：' + dm.split('：')[1],
      keys: keys,
      caution: caution
    };
  }

  root.REPORT = {
    build: function (r) {
      var a = analyze(r);
      return { analyze: a, free: freeOf(r, a) };
    }
  };
})(window);
