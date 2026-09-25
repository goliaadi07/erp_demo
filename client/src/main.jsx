import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';
import './toolbar.css';
import './crb-redesign.css';
import './admin-atelier.css';

const DEMO_USER = 'admin';
const DEMO_PASSWORD = 'Threadline@123';
const TOKEN_KEY = 'threadline_token';

const STR = {
  en: {
    tagline: 'Uniforms & Garments', title: 'Sign in', sub: 'Owner workspace for production, stock and quote requests',
    username: 'Username', password: 'Password', show: 'Show', hide: 'Hide', showPw: 'Show password', hidePw: 'Hide password',
    signin: 'Sign in', signing: 'Signing in…', failed: 'Login failed', dark: 'Dark', light: 'Light', back: '← Back to website',
    lang: 'Language', theme: 'Theme', required: 'Username and password are required', invalid: 'Invalid username or password',
  },
  mr: {
    tagline: 'युनिफॉर्म्स व गारमेंट्स', title: 'साइन इन', sub: 'उत्पादन, साठा आणि कोटेशन विनंत्यांसाठी मालक कार्यक्षेत्र',
    username: 'वापरकर्ता नाव', password: 'पासवर्ड', show: 'दाखवा', hide: 'लपवा', showPw: 'पासवर्ड दाखवा', hidePw: 'पासवर्ड लपवा',
    signin: 'साइन इन करा', signing: 'साइन इन होत आहे…', failed: 'लॉगिन अयशस्वी', dark: 'डार्क', light: 'लाइट', back: '← वेबसाइटवर परत',
    lang: 'भाषा', theme: 'थीम', required: 'वापरकर्ता नाव आणि पासवर्ड आवश्यक आहेत', invalid: 'चुकीचे वापरकर्ता नाव किंवा पासवर्ड',
  },
};
const SERVER_MSG_MR = {
  'Username and password are required': STR.mr.required,
  'Invalid username or password': STR.mr.invalid,
};

function storeToken(token){
  try{ sessionStorage.setItem(TOKEN_KEY, token); localStorage.setItem(TOKEN_KEY, token); }catch(e){}
}
function clearToken(){
  try{ sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); }catch(e){}
}
function readToken(){
  try{ return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY); }catch(e){ return null; }
}
function readLang(){ try{ return localStorage.getItem('threadline_lang')==='mr' ? 'mr' : 'en'; }catch(e){ return 'en'; } }

function applyTheme(dark){
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  try{
    localStorage.setItem('threadline_dark', dark ? '1' : '0');
    localStorage.setItem('threadline_erp_dark', dark ? '1' : '0');
  }catch(e){}
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', dark ? '#131217' : '#faf6ef');
}

function Logo({size=44}){
  return <img className="login-logo" src="/brand/logo-mark.svg" width={size} height={size} alt="" />;
}

function Login({onLogin, lang, setLang, dark, setDark}){
  const t = STR[lang];
  const [username,setUsername]=useState(DEMO_USER);
  const [password,setPassword]=useState(DEMO_PASSWORD);
  const [showPassword,setShowPassword]=useState(false);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const submit=async(e)=>{
    e.preventDefault(); setError('');
    if(!username.trim() || !password){ setError(t.required); return; }
    setBusy(true);
    try{
      const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error((lang==='mr' && SERVER_MSG_MR[data.message]) || data.message || t.failed);
      storeToken(data.token);
      onLogin(data.user);
    }catch(err){setError(err.message)} finally{setBusy(false)}
  };
  return <div className="login-page">
    <div className="login-tools" role="group" aria-label={`${t.lang} / ${t.theme}`}>
      <div className="login-lang">
        <button type="button" className={lang==='en'?'active':''} aria-pressed={lang==='en'} onClick={()=>setLang('en')}>EN</button>
        <button type="button" className={lang==='mr'?'active':''} aria-pressed={lang==='mr'} onClick={()=>setLang('mr')} lang="mr">मराठी</button>
      </div>
      <button type="button" className="login-theme" onClick={()=>setDark(v=>!v)} aria-pressed={dark}>{dark?`☀ ${t.light}`:`☾ ${t.dark}`}</button>
    </div>
    <div className="login-card">
      <div className="brand-row"><Logo/><div><div className="brand-name">CRB</div><div className="brand-sub">{t.tagline}</div></div></div>
      <h1>{t.title}</h1><p className="login-sub">{t.sub}</p>
      <form onSubmit={submit} noValidate>
        <label>{t.username}<input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} /></label>
        <label>{t.password}<div className="password-field"><input type={showPassword?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} /><button className="password-toggle" type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?t.hidePw:t.showPw}>{showPassword?t.hide:t.show}</button></div></label>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="login-submit" disabled={busy}>{busy?t.signing:t.signin}</button>
      </form>
      <a className="login-back" href="/">{t.back}</a>
    </div>
  </div>
}

function pushAuthToIframe(frame){
  const token = readToken();
  if(!frame || !frame.contentWindow) return;
  try{
    if(token) frame.contentWindow.postMessage({type:'threadline-auth', token}, '*');
    else frame.contentWindow.postMessage({type:'threadline-auth-clear'}, '*');
  }catch(e){}
}

function App(){
  const [user,setUser]=useState(null);
  const [checking,setChecking]=useState(()=>!!readToken());
  const [lang,setLangState]=useState(readLang);
  const [dark,setDark]=useState(()=>localStorage.getItem('threadline_dark')==='1' || localStorage.getItem('threadline_erp_dark')==='1');
  const iframeRef=useRef(null);
  const setLang=useCallback((l)=>{ setLangState(l); try{ localStorage.setItem('threadline_lang', l); }catch(e){} },[]);
  const signOut=useCallback(()=>{ clearToken(); setUser(null); },[]);

  useEffect(()=>{ document.documentElement.lang = lang; },[lang]);
  useEffect(()=>{
    applyTheme(dark);
    const frame=iframeRef.current;
    if(frame && frame.contentWindow){ try{ frame.contentWindow.postMessage({type:'threadline-theme', dark}, '*'); }catch(e){} }
  },[dark]);

  useEffect(()=>{
    const onMsg=(ev)=>{
      if(!ev || !ev.data || ev.origin!==window.location.origin) return;
      if(ev.data.type==='threadline-theme') setDark(!!ev.data.dark);
      if(ev.data.type==='threadline-auth-request') pushAuthToIframe(iframeRef.current);
      if(ev.data.type==='threadline-signout') signOut();
    };
    const onStorage=(ev)=>{ if(ev.key==='threadline_lang') setLangState(ev.newValue==='mr'?'mr':'en'); };
    window.addEventListener('message', onMsg);
    window.addEventListener('storage', onStorage);
    return ()=>{ window.removeEventListener('message', onMsg); window.removeEventListener('storage', onStorage); };
  },[signOut]);

  useEffect(()=>{
    const token=readToken();
    if(!token){ setChecking(false); return; }
    fetch('/api/auth/me',{headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.ok?r.json():null).then(d=>{ if(d&&d.user) setUser(d.user); else clearToken(); })
      .catch(()=>{}).finally(()=>setChecking(false));
  },[]);

  useEffect(()=>{ if(user) pushAuthToIframe(iframeRef.current); },[user]);

  if(checking) return <div className="login-page" aria-busy="true" />;
  if(!user) return <Login onLogin={setUser} lang={lang} setLang={setLang} dark={dark} setDark={setDark}/>;
  return <div className="erp-wrap">
    <iframe
      ref={iframeRef}
      title="CRB ERP"
      src={`/erp.html${window.location.hash || ''}`}
      onLoad={()=>{
        pushAuthToIframe(iframeRef.current);
        try{ iframeRef.current.contentWindow.postMessage({type:'threadline-theme', dark}, '*'); }catch(e){}
      }}
    />
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);
