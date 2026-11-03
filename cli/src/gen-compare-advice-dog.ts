const fs = require('fs');
const advice = {
  D11: {
    suggestion:
      '双方在个人空间或护食上都到 H 档时，建议把饭盆分开、固定各自的餐位，并给每只狗留一个能单独休息的角落；进食和休息时不让另一只靠近。若已经出现打斗或拒食，请咨询兽医或行为专业人士。',
  },
};
fs.writeFileSync('./content/compare-advice-dog.json', JSON.stringify(advice, null, 2));
console.log('saved compare-advice-dog.json');
