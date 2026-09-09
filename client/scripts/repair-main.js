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

// Load the complete faculty workspace from its own module.
if (!source.includes("import FacultyModule from './faculty/FacultyModule.jsx';")) {
  source = source.replace(
    "import './styles-fixed.css';",
    "import './styles-fixed.css';\nimport FacultyModule from './faculty/FacultyModule.jsx';",
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
  const loginReplacement = `function Login({onLogin}){
  const [role,setRole]=useState('student');
  const [register,setRegister]=useState(false);
  const [form,setForm]=useState({name:'',email:'',password:''});
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [dark,setDark]=useState(localStorage.getItem('ocms_theme')==='dark');

  useEffect(()=>{
    document.documentElement.dataset.theme=dark?'dark':'light';
    localStorage.setItem('ocms_theme',dark?'dark':'light');
  },[dark]);

  const chooseRole=r=>{
    setRole(r);
    setRegister(false);
    setError('');
    setForm({name:'',email:r==='admin'?'admin@ocms.com':'',password:r==='admin'?'admin123':''});
  };

  const submit=async e=>{
    e.preventDefault();
    setBusy(true);
    setError('');
    try{
      const d=await api('/auth/'+(register?'register':'login'),{method:'POST',body:JSON.stringify({...form,role})});
      localStorage.setItem('ocms_token',d.token);
      localStorage.setItem(key,JSON.stringify(d.user));
      onLogin(d.user);
    }catch(err){setError(err.message)}finally{setBusy(false)}
  };

  return <div className="login-redesign">
    <section className="login-showcase">
      <div className="brand-lockup"><span className="brand-o">O</span><div>CMS<small>ONLINE COLLEGE MANAGEMENT SYSTEM</small></div></div>
      <div className="showcase-copy">
        <span className="showcase-kicker">SMART CAMPUS PLATFORM</span>
        <h1>One Campus.<br/><span>Three Portals.</span></h1>
        <p>A unified platform for students, faculty and administrators to manage academics, attendance, examinations and communication from one secure workspace.</p>
        <div className="feature-row">
          <div className="feature"><div className="feature-icon">🎓</div><b>Role-based access</b><small>Every user gets the right workspace.</small></div>
          <div className="feature"><div className="feature-icon">▮▮▮</div><b>Real-time analytics</b><small>Track academic activity at a glance.</small></div>
          <div className="feature"><div className="feature-icon">✓</div><b>Secure & reliable</b><small>Protected access for campus data.</small></div>
        </div>
        <div className="campus-art"><div className="building"/></div>
        <div className="quote">“Education is the most powerful weapon which you can use to change the world.”<br/><b>— Nelson Mandela</b></div>
      </div>
    </section>

    <section className="login-panel">
      <button type="button" className="theme-button" onClick={()=>setDark(v=>!v)}>{dark?'☀ Light':'◐ Dark'}</button>
      <div className="login-card-redesign">
        <div className="card-logo"><span>O</span>CMS</div>
        <div className="card-sub">ONLINE COLLEGE MANAGEMENT SYSTEM</div>
        <h2>{register?'Create your account':'Welcome Back'}</h2>
        <p className="card-description">{register?'Create a student or faculty account to continue.':'Sign in to your account to continue'}</p>

        <div className="role-tabs">
          {Object.entries(roles).map(([r,v])=><button type="button" key={r} className={role===r?'active':''} onClick={()=>chooseRole(r)}>{v.icon} {v.label}</button>)}
        </div>

        <form onSubmit={submit}>
          {register&&<div className="input-wrap"><span>👤</span><input required placeholder="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>}
          <div className="input-wrap"><span>✉</span><input required type="email" placeholder="Email address" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
          <div className="input-wrap"><span>🔒</span><input required minLength="6" type="password" placeholder="Password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></div>
          {!register&&<div className="form-row"><label className="remember"><input type="checkbox"/> Remember me</label><button type="button" className="forgot" onClick={()=>setError('Please contact the administrator to reset your password.')}>Forgot password?</button></div>}
          {error&&<div className="login-error"><AlertTriangle size={14}/>{error}</div>}
          <button className="login-submit" disabled={busy}>{busy?'Please wait…':register?'Create account':'Sign in as '+roles[role].label}</button>
        </form>

        {role==='admin'&&!register&&<div className="demo-note"><b>Demo administrator</b> · admin@ocms.com · admin123</div>}
        {role!=='admin'&&<button className="account-link" onClick={()=>{setRegister(!register);setError('')}}>{register?'Already have an account? Sign in':'＋ Create a new account'}</button>}
      </div>
      <div className="login-footer"><span>© 2026 OCMS. All rights reserved.</span><span>Privacy · Terms · Help</span></div>
    </section>
  </div>;
}
`;
  source = source.slice(0, loginStartIndex) + loginReplacement + source.slice(loginEndIndex);
}

// Route administrator and faculty workspaces to their dedicated modules.
const pageStart = 'function Page({user,page,go}){';
const pageEnd = 'function Dashboard({user,go}){';
const start = source.indexOf(pageStart);
const end = source.indexOf(pageEnd);

if (start !== -1 && end !== -1) {
  const replacement = `function Page({user,page,go}){
  if(page==='dashboard'){
    if(user.role==='faculty')return <FacultyModule page={page}/>;
    return <Dashboard user={user} go={go}/>;
  }
  if(user.role==='admin')return <AdminModule page={page}/>;
  if(user.role==='faculty')return <FacultyModule page={page}/>;
  if(user.role==='student')return <StudentPage page={page} user={user} go={go}/>;
  return <Dashboard user={user} go={go}/>;
}
`;
  source = source.slice(0, start) + replacement + source.slice(end);
}

// Keep the theme override available in the generated source.
if (!source.includes("import './theme-override.css';")) {
  source = source.replace(
    "import './styles-fixed.css';",
    "import './styles-fixed.css';\nimport './theme-override.css';",
  );
}

// Prevent the login checkbox from inheriting full-size text input styles.
const checkboxCssMarker = "input[type='checkbox']";
if (!source.includes(checkboxCssMarker)) {
  source = source.replace('</style>', `<style>
.login-redesign input[type='checkbox'],.login-card input[type='checkbox'],.login-form input[type='checkbox']{width:16px!important;height:16px!important;min-width:16px!important;padding:0!important;margin:0!important;border:0!important;box-shadow:none!important;appearance:auto!important;accent-color:#315efb}
</style>`);
}

fs.writeFileSync(file, source);
console.log('OCMS: frontend source repair, login redesign, admin routing and faculty routing complete');
