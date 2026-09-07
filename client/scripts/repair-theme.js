import fs from 'node:fs';

const file = new URL('../src/main-fixed.jsx', import.meta.url);
let source = fs.readFileSync(file, 'utf8');

const themeFunction = `function ThemeToggle(){\n  const [dark,setDark]=useState(document.documentElement.dataset.theme==='dark'||localStorage.getItem('ocms_theme')==='dark');\n  useEffect(()=>{\n    document.documentElement.dataset.theme=dark?'dark':'light';\n    localStorage.setItem('ocms_theme',dark?'dark':'light');\n  },[dark]);\n  return <button type="button" className="theme-toggle" onClick={()=>setDark(v=>!v)}>{dark?'☀ Light':'◐ Dark'}</button>;\n}\n`;

if (!source.includes('function ThemeToggle(){')) {
  source = source.replace('function App(){', `${themeFunction}function App(){`);
}

const headerMarker = '<div className="header-user"><span className="role-pill">';
if (source.includes(headerMarker) && !source.includes('<ThemeToggle/>')) {
  source = source.replace(headerMarker, '<div className="header-user"><ThemeToggle/><span className="role-pill">');
}

fs.writeFileSync(file, source);
console.log('OCMS: post-login theme toggle enabled');
