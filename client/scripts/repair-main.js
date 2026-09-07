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

// Load the redesigned login styles.
if (!source.includes("import './login-redesign.css';")) {
  source = source.replace(
    "import './styles-fixed.css';",
    "import './styles-fixed.css';\nimport './login-redesign.css';",
  );
}

// Replace the legacy login screen with the polished split-screen portal.
const loginStart = 'function Login({onLogin}){';
const loginEnd = 'function App(){';
const loginStartIndex = source.indexOf(loginStart);
const loginEndIndex = source.indexOf(loginEnd);

if (loginStartIndex !== -1 && loginEndIndex !== -1 && loginEndIndex > loginStartIndex) {
  const loginReplacement = `function Login({onLogin}){\n  const [role,setRole]=useState('student');\n  const [register,setRegister]=useState(false);\n  const [form,setForm]=useState({name:'',email:'',password:''});\n  const [error,setError]=useState('');\n  const [busy,setBusy]=useState(false);\n  const [dark,setDark]=useState(localStorage.getItem('ocms_theme')==='dark');\n\n  useEffect(()=>{\n    document.documentElement.dataset.theme=dark?'dark':'light';\n    localStorage.setItem('ocms_theme',dark?'dark':'light');\n  },[dark]);\n\n  const chooseRole=r=>{\n    setRole(r);\n    setRegister(false);\n    setError('');\n    setForm({name:'',email:r==='admin'?'admin@ocms.com':'',password:r==='admin'?'admin123':''});\n  };\n\n  const submit=async e=>{\n    e.preventDefault();\n    setBusy(true);\n    setError('');\n    try{\n      const d=await api('/auth/'+(register?'register':'login'),{method:'POST',body:JSON.stringify({...form,role})});\n      localStorage.setItem('ocms_token',d.token);\n      localStorage.setItem(key,JSON.stringify(d.user));\n      onLogin(d.user);\n    }catch(err){setError(err.message)}finally{setBusy(false)}\n  };\n\n  return <div className="login-redesign">\n    <section className="login-showcase">\n      <div className="brand-lockup"><span className="brand-o">O</span><div>CMS<small>ONLINE COLLEGE MANAGEMENT SYSTEM</small></div></div>\n      <div className="showcase-copy">\n        <span className="showcase-kicker">SMART CAMPUS PLATFORM</span>\n        <h1>One Campus.<br/><span>Three Portals.</span></h1>\n        <p>A unified platform for students, faculty and administrators to manage academics, attendance, examinations and communication from one secure workspace.</p>\n        <div className="feature-row">\n          <div className="feature"><div className="feature-icon">🎓</div><b>Role-based access</b><small>Every user gets the right workspace.</small></div>\n          <div className="feature"><div className="feature-icon">▮▮▮</div><b>Real-time analytics</b><small>Track academic activity at a glance.</small></div>\n          <div className="feature"><div className="feature-icon">✓</div><b>Secure & reliable</b><small>Protected access for campus data.</small></div>\n        </div>\n        <div className="campus-art"><div className="building"/></div>\n        <div className="quote">“Education is the most powerful weapon which you can use to change the world.”<br/><b>— Nelson Mandela</b></div>\n      </div>\n    </section>\n\n    <section className="login-panel">\n      <button type="button" className="theme-button" onClick={()=>setDark(v=>!v)}>{dark?'☀ Light':'◐ Dark'}</button>\n      <div className="login-card-redesign">\n        <div className="card-logo"><span>O</span>CMS</div>\n        <div className="card-sub">ONLINE COLLEGE MANAGEMENT SYSTEM</div>\n        <h2>{register?'Create your account':'Welcome Back'}</h2>\n        <p className="card-description">{register?'Create a student or faculty account to continue.':'Sign in to your account to continue'}</p>\n\n        <div className="role-tabs">\n          {Object.entries(roles).map(([r,v])=><button type="button" key={r} className={role===r?'active':''} onClick={()=>chooseRole(r)}>{v.icon} {v.label}</button>)}\n        </div>\n\n        <form onSubmit={submit}>\n          {register&&<div className="input-wrap"><span>👤</span><input required placeholder="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>}\n          <div className="input-wrap"><span>✉</span><input required type="email" placeholder="Email address" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>\n          <div className="input-wrap"><span>🔒</span><input required minLength="6" type="password" placeholder="Password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></div>\n          {!register&&<div className="form-row"><label className="remember"><input type="checkbox"/> Remember me</label><button type="button" className="forgot" onClick={()=>setError('Please contact the administrator to reset your password.')}>Forgot password?</button></div>}\n          {error&&<div className="login-error"><AlertTriangle size={14}/>{error}</div>}\n          <button className="login-submit" disabled={busy}>{busy?'Please wait…':register?'Create account':'Sign in as '+roles[role].label}</button>\n        </form>\n\n        {role==='admin'&&!register&&<div className="demo-note"><b>Demo administrator</b> · admin@ocms.com · admin123</div>}\n        {role!=='admin'&&<button className="account-link" onClick={()=>{setRegister(!register);setError('')}}>{register?'Already have an account? Sign in':'＋ Create a new account'}</button>}\n      </div>\n      <div className="login-footer"><span>© 2026 OCMS. All rights reserved.</span><span>Privacy · Terms · Help</span></div>\n    </section>\n  </div>;\n}\n`;
  source = source.slice(0, loginStartIndex) + loginReplacement + source.slice(loginEndIndex);
}

// Route administrator dashboard to the real dashboard. Other administrator pages use AdminModule.
const pageStart = 'function Page({user,page,go}){';
const pageEnd = 'function Dashboard({user,go}){';
const start = source.indexOf(pageStart);
const end = source.indexOf(pageEnd);

if (start !== -1 && end !== -1) {
  const replacement = `function Page({user,page,go}){\n  if(page==='dashboard')return <Dashboard user={user} go={go}/>;\n  if(user.role==='admin')return <AdminModule page={page}/>;\n  if(user.role==='student')return <StudentPage page={page} user={user} go={go}/>;\n  if(user.role==='faculty'&&page==='exams')return <FacultyResults/>;\n  if(page==='attendance')return <AttendancePage role={user.role}/>;\n  if(page==='leaves')return <LeavePage role={user.role}/>;\n  if(page==='reports')return <Reports/>;\n  return <CrudPage type={page} role={user.role}/>;\n}\n`;
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
console.log('OCMS: frontend source repair, login redesign and admin routing complete');
