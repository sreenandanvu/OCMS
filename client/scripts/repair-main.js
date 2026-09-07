import fs from 'node:fs';

const file = new URL('../src/main-fixed.jsx', import.meta.url);
let source = fs.readFileSync(file, 'utf8');

// Preserve the legacy source fixes required by the existing application.
source = source.replace('{l>{l}<input', '{l}<input');
source = source.replace('useEffect(load,[role]);', 'useEffect(()=>{load()},[role]);');

// Load the structured administrator workspace from its own module.
if (!source.includes("import AdminModule from './admin/AdminModule.jsx';")) {
  source = source.replace(
    "import './styles-fixed.css';",
    "import './styles-fixed.css';\nimport AdminModule from './admin/AdminModule.jsx';",
  );
}

// Route all administrator pages to the structured admin module.
const pageStart = 'function Page({user,page,go}){';
const pageEnd = 'function Dashboard({user,go}){';
const start = source.indexOf(pageStart);
const end = source.indexOf(pageEnd);

if (start !== -1 && end !== -1) {
  const replacement = `function Page({user,page,go}){\n  if(user.role==='admin')return <AdminModule page={page}/>;\n  if(page==='dashboard')return <Dashboard user={user} go={go}/>;\n  if(user.role==='student')return <StudentPage page={page} user={user} go={go}/>;\n  if(user.role==='faculty'&&page==='exams')return <FacultyResults/>;\n  if(page==='attendance')return <AttendancePage role={user.role}/>;\n  if(page==='leaves')return <LeavePage role={user.role}/>;\n  if(page==='reports')return <Reports/>;\n  return <CrudPage type={page} role={user.role}/>;\n}\n`;
  source = source.slice(0, start) + replacement + source.slice(end);
}

// Keep the theme override available in the generated source.
if (!source.includes("import './theme-override.css';")) {
  source = source.replace(
    "import './styles-fixed.css';",
    "import './styles-fixed.css';\nimport './theme-override.css';",
  );
}

fs.writeFileSync(file, source);
console.log('OCMS: frontend source repair and admin routing complete');
