import fs from 'node:fs';

const file = new URL('../src/main-fixed.jsx', import.meta.url);
let source = fs.readFileSync(file, 'utf8');
source = source.replace("{l>{l}<input", "{l}<input");
// React effects must return undefined or a cleanup function, never a Promise.
source = source.replace("useEffect(load,[role]);", "useEffect(()=>{load()},[role]);");
// Remove demo credentials from the public login screen.
source = source.replace("{role==='admin'&&!register&&<div className=\"demo\"><b>Demo administrator</b><br/>admin@ocms.com · admin123</div>}", "");
// Add a persistent light/dark toggle to the login page and every authenticated page.
if (!source.includes('function ThemeToggle()')) {
  const themeToggle = `function ThemeToggle(){const [dark,setDark]=useState(()=>localStorage.getItem('ocms_theme')==='dark');useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';localStorage.setItem('ocms_theme',dark?'dark':'light')},[dark]);return <button type=\"button\" className=\"theme-toggle\" onClick={()=>setDark(v=>!v)} title={dark?'Switch to light mode':'Switch to dark mode'}>{dark?'☀ Light':'☾ Dark'}</button>}\n`;
  source = source.replace('function App(){', themeToggle + 'function App(){');
}
if (!source.includes('<ThemeToggle/>')) {
  source = source.replace('<div className="header-user"><span className="role-pill">', '<div className="header-user"><ThemeToggle/><span className="role-pill">');
}
if (!source.includes('<ThemeToggle/>') || source.indexOf('<ThemeToggle/>') === source.lastIndexOf('<ThemeToggle/>')) {
  // Add the same control to the login card without changing the existing form structure.
  source = source.replace('<div className="login-card"><div className="logo">', '<div className="login-card"><div className="login-theme"><ThemeToggle/></div><div className="logo">');
}
if (!source.includes("import './theme-override.css';")) {
  source = source.replace("import './styles-fixed.css';", "import './styles-fixed.css';\nimport './theme-override.css';");
}
fs.writeFileSync(file, source);
console.log('OCMS: frontend source repair complete');
