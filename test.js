#!/usr/bin/env node
let execSync = require('child_process').execSync;
let fs = require('fs');
let table = require('markdown-table');
let score = 0;
let lines = [];
const standings = [[2, 8, 20, 28, 50, 82, 126], [1066, 1145, 1222, 1301, 1378, 1456, 1531, 1607, 1682, 1758, 1835, 1910, 1986],
  [4004, 8008, 8080, 8085, 8086, 8088, 80186, 80188, 80286, 80376, 80386, 80486], [826954869, 113691004, 3925147649,
    656456903, 3442529895, 4081869093, 3845481085, 304070271, 3034053664, 87289870, 4254894498, 3806693609, 3034793830,
    4253775517, 1010559526, 2456400543, 3287234924, 4147105045, 53150700, 2736619877]];
const sids = standings[process.argv[2]-1];
const title = ['Sco', 'Streak', 'But/Tot', 'Diam', 'Drop', 'Max', 'Res'];
lines.push(['Seed'].concat(title));

console.log(title.join('\t'));
sids.forEach(s=>{
  console.log(`run sid ${s}`);
  try {
    execSync(`../hola-challenge_jsdash/challenge_jsdash/game/jsdash.js --ai ai.js --seed ${s} --log=log_${s}.json`);
  } catch(e) {
    console.log(`error for sid ${s} ${e}`);
    lines.push([s, '', '', '', '', '', '', 'E']);
    return;
  }
  console.log(`result for sid ${s}`);
  let obj = JSON.parse(fs.readFileSync(`log_${s}.json`, 'utf8'));
  score += obj.score;
  let frames_left = obj.limit_frames - obj.ai_perf.processed;
  let res = obj.outcome == 'quit' ? `Q ${frames_left}` : frames_left != 0 ? `K ${frames_left}` : ' ';
  let line = [obj.score, obj.longest_streak, `${obj.butterflies_killed}/${obj.butterflies}`, obj.diamonds_collected, obj.ai_perf.dropped, obj.ai_perf.max_ms, res];
  console.log(line.join('\t'));
  lines.push([s].concat(line));
});

console.log(table(lines, {align: ['r', 'r', 'r', 'r', 'r', 'r', 'r', 'c']}));
console.log(`Total score: ${score}`);
