import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';
import './toolbar.css';
import './crb-redesign.css';
import './admin-atelier.css';
import './login-lux.css';

const DEMO_USER = 'admin';
const DEMO_PASSWORD = 'Threadline@123';
const TOKEN_KEY = 'threadline_token';

const STR = {
  en: {
    tagline: 'Uniforms & Garments', title: 'Sign in', sub: 'Owner workspace for production, stock and quote requests',
    username: 'Username', password: 'Password', show: 'Show', hide: 'Hide', showPw: 'Show password', hidePw: 'Hide password',
    signin: 'Sign in', signing: 'Signing in…', failed: 'Login failed', dark: 'Dark', light: 'Light', back: '← Back to website',
    lang: 'Language', theme: 'Theme', required: 'Username and password are required', invalid: 'Invalid username or password',
    eyebrow: 'Owner workspace', welcome: 'Welcome back', welcomeSub: 'Sign in to manage production, stock and quote requests.',
    headline: 'Every stitch, every order — in one quiet place.', blurb: 'Cutting to packing, raw cloth to quote requests. Your atelier, beautifully organised.',
    f1: 'Live production pipeline', f2: 'Raw material & size charts', f3: 'Quote requests from your website', secure: 'Secure sign-in · session stays on this device',
    switchDark: 'Switch to dark mode', switchLight: 'Switch to light mode',
  },
  mr: {
    tagline: 'युनिफॉर्म्स व गारमेंट्स', title: 'साइन इन', sub: 'उत्पादन, साठा आणि कोटेशन विनंत्यांसाठी मालक कार्यक्षेत्र',
    username: 'वापरकर्ता नाव', password: 'पासवर्ड', show: 'दाखवा', hide: 'लपवा', showPw: 'पासवर्ड दाखवा', hidePw: 'पासवर्ड लपवा',
    signin: 'साइन इन करा', signing: 'साइन इन होत आहे…', failed: 'लॉगिन अयशस्वी', dark: 'डार्क', light: 'लाइट', back: '← वेबसाइटवर परत',
    lang: 'भाषा', theme: 'थीम', required: 'वापरकर्ता नाव आणि पासवर्ड आवश्यक आहेत', invalid: 'चुकीचे वापरकर्ता नाव किंवा पासवर्ड',
    eyebrow: 'मालक कार्यक्षेत्र', welcome: 'पुन्हा स्वागत आहे', welcomeSub: 'उत्पादन, साठा आणि कोटेशन विनंत्या सांभाळण्यासाठी साइन इन करा.',
    headline: 'प्रत्येक टाका, प्रत्येक ऑर्डर — एकाच शांत ठिकाणी.', blurb: 'कटिंगपासून पॅकिंगपर्यंत, कच्च्या कापडापासून कोटेशनपर्यंत. तुमचे अटेलिअर, सुंदररीत्या व्यवस्थित.',
    f1: 'थेट उत्पादन प्रक्रिया', f2: 'कच्चा माल व साइज चार्ट', f3: 'वेबसाइटवरून आलेल्या कोटेशन विनंत्या', secure: 'सुरक्षित साइन इन · सत्र याच डिव्हाइसवर राहते',
    switchDark: 'डार्क मोड वापरा', switchLight: 'लाइट मोड वापरा',
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
  const [shake,setShake]=useState(0);
  useEffect(()=>{ if(error) setShake(n=>n+1); },[error]);
  return <div className="lx">
    <section className="lx-art" aria-hidden="false">
      <div className="lx-art-img" />
      <div className="lx-art-weave" />
      <div className="lx-art-inner">
        <a className="lx-brand" href="/" aria-label="CRB — Uniforms & Garments">
          <img src="/brand/logo-mark.svg" width="54" height="54" alt="" />
          <span><b>CRB</b><small>{t.tagline}</small></span>
        </a>
        <div className="lx-art-copy">
          <p className="lx-kicker">{t.eyebrow}</p>
          <h2 className="lx-headline">{t.headline}</h2>
          <p className="lx-blurb">{t.blurb}</p>
          <ul className="lx-features">
            <li><span aria-hidden="true">✂</span>{t.f1}</li>
            <li><span aria-hidden="true">📏</span>{t.f2}</li>
            <li><span aria-hidden="true">✉</span>{t.f3}</li>
          </ul>
        </div>
        <p className="lx-art-foot">© {new Date().getFullYear()} CRB · {t.tagline}</p>
      </div>
    </section>
    <main className="lx-side">
      <div className="lx-tools" role="group" aria-label={`${t.lang} / ${t.theme}`}>
        <div className="lx-lang">
          <button type="button" className={lang==='en'?'active':''} aria-pressed={lang==='en'} onClick={()=>setLang('en')}>EN</button>
          <button type="button" className={lang==='mr'?'active':''} aria-pressed={lang==='mr'} onClick={()=>setLang('mr')} lang="mr">मराठी</button>
        </div>
        <button type="button" className="lx-theme" onClick={()=>setDark(v=>!v)} aria-pressed={dark} aria-label={dark?t.switchLight:t.switchDark} title={dark?t.switchLight:t.switchDark}>
          {dark
            ? <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            : <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>}
        </button>
      </div>
      <div className="lx-card" data-shake={shake>0 ? (shake%2 ? 'a' : 'b') : undefined}>
        <img className="lx-card-logo" src="/brand/logo-mark.svg" width="52" height="52" alt="" />
        <p className="lx-eyebrow">{t.eyebrow}</p>
        <h1 className="lx-title">{t.welcome}</h1>
        <p className="lx-sub">{t.welcomeSub}</p>
        <form onSubmit={submit} noValidate className="lx-form">
          <div className="lx-field">
            <label htmlFor="lx-user">{t.username}</label>
            <div className="lx-input">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M4.5 20c1.3-3.6 4.1-5.4 7.5-5.4s6.2 1.8 7.5 5.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
              <input id="lx-user" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} aria-invalid={!!error} />
            </div>
          </div>
          <div className="lx-field">
            <label htmlFor="lx-pass">{t.password}</label>
            <div className="lx-input">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="5" y="10.5" width="14" height="9.5" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg>
              <input id="lx-pass" type={showPassword?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} aria-invalid={!!error} />
              <button className="lx-eye" type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?t.hidePw:t.showPw} aria-pressed={showPassword} title={showPassword?t.hidePw:t.showPw}>
                {showPassword
                  ? <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 3l18 18M10.6 5.2A9.6 9.6 0 0 1 12 5c5 0 8.5 4.4 9.5 7-.4 1-1.2 2.4-2.4 3.7M6.3 6.8C4.4 8.1 3.1 10 2.5 12c1 2.6 4.5 7 9.5 7 1.8 0 3.4-.6 4.8-1.4M9.9 9.9a3 3 0 0 0 4.2 4.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
                  : <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M2.5 12c1-2.6 4.5-7 9.5-7s8.5 4.4 9.5 7c-1 2.6-4.5 7-9.5 7s-8.5-4.4-9.5-7z" fill="none" stroke="currentColor" strokeWidth="1.7"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg>}
              </button>
            </div>
          </div>
          {error && <div className="lx-error" role="alert"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7.5v5.5M12 16.2v.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg><span>{error}</span></div>}
          <button className="lx-submit" disabled={busy} aria-busy={busy}>
            {busy && <span className="lx-spin" aria-hidden="true" />}
            <span>{busy?t.signing:t.signin}</span>
            {!busy && <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </button>
        </form>
        <p className="lx-secure"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 3l7 3v5.5c0 4.4-3 8.2-7 9.5-4-1.3-7-5.1-7-9.5V6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>{t.secure}</p>
      </div>
      <a className="lx-back" href="/">{t.back}</a>
    </main>
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

  if(checking) return <div className="lx lx-checking" aria-busy="true" />;
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
