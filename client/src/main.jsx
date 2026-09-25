import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';
import './toolbar.css';
import './crb-redesign.css';
import './quote-bell.css';
import QuoteBell from './QuoteBell.jsx';

const DEMO_USER = 'admin';
const DEMO_PASSWORD = 'Threadline@123';
const TOKEN_KEY = 'threadline_token';

function storeToken(token){
  try{
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_KEY, token);
  }catch(e){}
}
function clearToken(){
  try{
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }catch(e){}
}
function readToken(){
  try{
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  }catch(e){ return null; }
}

function applyTheme(dark){
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  localStorage.setItem('threadline_dark', dark ? '1' : '0');
  localStorage.setItem('threadline_erp_dark', dark ? '1' : '0');
}

function Login({onLogin}){
  const [username,setUsername]=useState(DEMO_USER);
  const [password,setPassword]=useState(DEMO_PASSWORD);
  const [showPassword,setShowPassword]=useState(false);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const submit=async(e)=>{
    e.preventDefault(); setError(''); setBusy(true);
    try{
      const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
      const data=await r.json();
      if(!r.ok) throw new Error(data.message||'Login failed');
      storeToken(data.token);
      onLogin(data.user);
    }catch(err){setError(err.message)} finally{setBusy(false)}
  };
  return <div className="login-page"><div className="login-card">
    <div className="brand-row"><div className="brand-swatch"><span></span></div><div><div className="brand-name">CRB</div><div className="brand-sub">Uniform Manufacturing ERP</div></div></div>
    <h1>Sign in</h1><p className="login-sub">Secure access to your garment ERP</p>
    <form onSubmit={submit}>
      <label>Username<input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} /></label>
      <label>Password<div className="password-field"><input type={showPassword?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} /><button className="password-toggle" type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?'Hide':'Show'}</button></div></label>
      {error && <div className="error">{error}</div>}
      <button disabled={busy}>{busy?'Signing in…':'Sign in'}</button>
    </form>
  </div></div>
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
  const [dark,setDark]=useState(()=>localStorage.getItem('threadline_dark')==='1' || localStorage.getItem('threadline_erp_dark')==='1');
  const iframeRef=useRef(null);
  const [quotesOpen,setQuotesOpen]=useState(false);
  const unreadRef=useRef(0);
  const pushUnreadToIframe=useCallback((count)=>{
    unreadRef.current=count;
    const frame=iframeRef.current;
    try{ if(frame && frame.contentWindow) frame.contentWindow.postMessage({type:'threadline-quotes', unread:count}, '*'); }catch(e){}
  },[]);
  const signOut=useCallback(()=>{clearToken();setQuotesOpen(false);setUser(null)},[]);

  useEffect(()=>{
    applyTheme(dark);
    const frame=iframeRef.current;
    if(frame && frame.contentWindow){
      try{ frame.contentWindow.postMessage({type:'threadline-theme', dark}, '*'); }catch(e){}
    }
  },[dark]);

  useEffect(()=>{
    const onMsg=(ev)=>{
      if(!ev || !ev.data) return;
      if(ev.data.type==='threadline-theme'){
        setDark(!!ev.data.dark);
      }
      if(ev.data.type==='threadline-auth-request'){
        pushAuthToIframe(iframeRef.current);
      }
      if(ev.data.type==='threadline-open-quotes'){
        setQuotesOpen(true);
      }
    };
    window.addEventListener('message', onMsg);
    return ()=>window.removeEventListener('message', onMsg);
  },[]);

  useEffect(()=>{
    const token=readToken();
    if(token) fetch('/api/auth/me',{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.ok?r.json():null).then(d=>d&&setUser(d.user)).catch(()=>{});
  },[]);

  useEffect(()=>{
    if(user) pushAuthToIframe(iframeRef.current);
  },[user]);

  if(!user) return <Login onLogin={setUser}/>;
  return <div className="erp-wrap">
    <div className="erp-toolbar">
      <span className="erp-toolbar-user">Signed in as <b>{user.username}</b></span>
      <div className="erp-toolbar-actions">
        <QuoteBell getToken={readToken} open={quotesOpen} setOpen={setQuotesOpen} onUnreadChange={pushUnreadToIframe} onUnauthorized={signOut}/>
        <button type="button" onClick={()=>setDark(v=>!v)}>{dark?'☀ Light':'☾ Dark'}</button>
        <button type="button" onClick={signOut}>Sign out</button>
      </div>
    </div>
    <iframe
      ref={iframeRef}
      title="CRB ERP"
      src="/erp.html"
      onLoad={()=>{
        pushAuthToIframe(iframeRef.current);
        try{ iframeRef.current.contentWindow.postMessage({type:'threadline-theme', dark}, '*'); }catch(e){}
        pushUnreadToIframe(unreadRef.current);
      }}
    />
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);
