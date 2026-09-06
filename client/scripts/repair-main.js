import fs from 'node:fs';

const file = new URL('../src/main-fixed.jsx', import.meta.url);
let source = fs.readFileSync(file, 'utf8');
source = source.replace("{l>{l}<input", "{l}<input");
// React effects must return undefined or a cleanup function, never a Promise.
source = source.replace("useEffect(load,[role]);", "useEffect(()=>{load()},[role]);");
// Keep the application visually consistent: the workspace uses a unified light theme.
if (!source.includes("import './theme-override.css';")) {
  source = source.replace("import './styles-fixed.css';", "import './styles-fixed.css';\nimport './theme-override.css';");
}
fs.writeFileSync(file, source);
console.log('OCMS: frontend source repair complete');