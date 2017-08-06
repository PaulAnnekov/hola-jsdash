#!/usr/bin/env node
let execSync = require('child_process').execSync;
let fs = require('fs');
let score = 0;
let lines = [];
const pre1 = [2, 8, 20, 28, 50, 82, 126];
const pre2 = [1066, 1145, 1222, 1301, 1378, 1456, 1531, 1607, 1682, 1758, 1835, 1910, 1986];
const sids = pre1;
const title = `Sco\tStreak\tBut/Tot\tDiam\tDrop\tMax\tRes`;

console.log(title);
sids.forEach(s=>{
  console.log(`run sid ${s}`);
  execSync(`../hola-challenge_jsdash/challenge_jsdash/game/jsdash.js --force --ai ai.js --seed ${s} --log=log_${s}.json -m`);
  console.log(`result for sid ${s}`);
  let obj = JSON.parse(fs.readFileSync(`log_${s}.json`, 'utf8'));
  score += obj.score;
  let frames_left = obj.limit_frames - obj.ai_perf.processed;
  let res = obj.outcome == 'quit' ? `Q ${frames_left}` : frames_left != 0 ? `K ${frames_left}` : ' ';
  let line = `${obj.score}\t${obj.longest_streak}\t${obj.butterflies_killed}/${obj.butterflies}\t${obj.diamonds_collected}\t${obj.ai_perf.dropped}\t${obj.ai_perf.max_ms}\t${res}`;
  lines.push(`${s}\t${line}`);
  console.log(line);
});

console.log('');
console.log(`Seed\t${title}`);
lines.forEach(l=>console.log(l));
console.log(`Total score: ${score}`);