const fs = require('fs');
const quiz = require('../../content/quiz-cat.json');
const stress = require('../../content/stress-cat.json');
let md = '';
md += '\n---\n\n## 16. 猫册题库（v0 内容本体）\n\n';
md += '### 16.1 计分与维度归属\n\n';
md += '- **30 题 = 15 维 × 2 题**，每题 3 个选项，A/B/C 分别对应 L/M/H（1/2/3 分）。\n';
md += '- **反向题 5 题**（第 4、8、12、18、24 题），计分 `points = 4 - p` 翻转；每维至多 1 题反向。\n';
md += '- **D8 同类社交含单宠兜底场景**（第 15、16 题），单宠家庭可作答。\n';
md += '- 题干全部满足 §7 契约：可观察行为、时间锚定、中性措辞、无褒贬成对选项。\n\n';
md += '### 16.2 30 题正文\n\n';
md += '| 题号 | 维度 | 反向 | 题干 | A（L，1 分） | B（M，2 分） | C（H，3 分） |\n';
md += '|---|---|---|---|---|---|---|\n';
quiz.forEach(q => {
  md += '| ' + q.id + ' | ' + q.dim + ' | ' + (q.reverse ? '✓' : '') + ' | ' + q.q + ' | ' + q.options[0] + ' | ' + q.options[1] + ' | ' + q.options[2] + ' |\n';
});
md += '\n### 16.3 压力信号 4 题\n\n';
md += '压力信号独立于 15 维，**不进入人格向量、不参与类型匹配**（§6.2）。4 题 = 猫 2 个核心指标 × 2 场景。\n\n';
md += '| 题号 | 指标 | 题干 | A（0 分） | B（50 分） | C（100 分） |\n';
md += '|---|---|---|---|---|---|\n';
stress.questions.forEach(q => {
  md += '| ' + q.id + ' | ' + q.indicator + ' | ' + q.q + ' | ' + q.options[0] + ' | ' + q.options[1] + ' | ' + q.options[2] + ' |\n';
});
md += '\n> 指标出处：S1 不当位置排泄（赫尔辛基 2021 Litterbox issues）；S2 过度舔毛（赫尔辛基 2021 Excessive grooming）。\n\n';
md += '### 16.4 两档文案\n\n';
md += '压力指数 0–100（4 题各 0/50/100），**0–49 为正常范围，50–100 为建议关注**。\n\n';
stress.levels.forEach(l => {
  md += '**' + l.label + '**：' + l.text + '\n\n';
});
md += '> 两档文案均不含「诊断 / 异常 / 障碍 / 病症」等词，不给原因推断与处置方案；「建议关注」只指向专业人士。\n';
fs.appendFileSync('./docs/PRD.md', md);
console.log('chapter 16 appended', md.length, 'chars');
