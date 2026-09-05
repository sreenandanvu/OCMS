import fs from 'node:fs';

const file = new URL('../src/main-fixed.jsx', import.meta.url);
let source = fs.readFileSync(file, 'utf8');
source = source.replace("{l>{l}<input", "{l}<input");
fs.writeFileSync(file, source);
console.log('OCMS: frontend source repair complete');
