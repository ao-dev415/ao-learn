import fs from 'node:fs';

const file = 'index.html';
let s = fs.readFileSync(file, 'utf8');

// Match a "media token figures" block that starts with const imgTokens
// and ends at the addFigure(...) forEach line.
const mediaRe = /[ \t]*const imgTokens[^\n]*\n[\s\S]*?forEach\(t\s*=>\s*addFigure\(pool\[t\.i]\)\);\s*\n/g;

let seen = 0;
s = s.replace(mediaRe, (m) => (++seen === 1 ? m : '')); // keep 1st, drop the rest

fs.writeFileSync(file, s);
console.log(`[fix] kept first media block; removed ${Math.max(0, seen-1)} duplicate(s)`);
