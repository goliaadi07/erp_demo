import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';
import './toolbar.css';
import './crb-redesign.css';

const DEMO_USER='admin';
const DEMO_PASSWORD='Threadline@123';

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
      sessionStorage.setItem('threadline_token',data.token);
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

function App(){
  const [user,setUser]=useState(null);
  const [dark,setDark]=useState(localStorage.getItem('threadline_dark')==='1');
  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';localStorage.setItem('threadline_dark',dark?'1':'0')},[dark]);
  useEffect(()=>{
    const token=sessionStorage.getItem('threadline_token');
    if(token) fetch('/api/auth/me',{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.ok?r.json():null).then(d=>d&&setUser(d.user)).catch(()=>{});
  },[]);
  if(!user) return <Login onLogin={setUser}/>;
  return <div className="erp-wrap">
    <div className="erp-toolbar"><span>Signed in as <b>{user.username}</b></span><div><button onClick={()=>setDark(v=>!v)}>{dark?'☀ Light':'☾ Dark'}</button><button onClick={()=>{sessionStorage.removeItem('threadline_token');setUser(null)}}>Sign out</button></div></div>
    <iframe title="CRB ERP" src="/erp.html" />
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);
