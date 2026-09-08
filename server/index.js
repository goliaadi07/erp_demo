const express=require('express');
const cors=require('cors');
const path=require('path');
const fs=require('fs');
const Database=require('better-sqlite3');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');

const PORT=process.env.PORT||4000;
const JWT_SECRET=process.env.JWT_SECRET||'CHANGE_THIS_SECRET_BEFORE_PRODUCTION';
const ROOT=path.join(__dirname,'..');
const DB_DIR=path.join(ROOT,'data'); fs.mkdirSync(DB_DIR,{recursive:true});
const db=new Database(path.join(DB_DIR,'threadline.db'));
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'owner', phone TEXT, otp_enabled INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS otp_requests(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,code_hash TEXT,expires_at TEXT,verified INTEGER DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,action TEXT,ip TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);
const exists=db.prepare('SELECT id FROM users WHERE username=?').get('admin');
if(!exists){const hash=bcrypt.hashSync('Threadline@123',12);db.prepare('INSERT INTO users(username,password_hash,role) VALUES(?,?,?)').run('admin',hash,'owner');}
const app=express();app.use(cors());app.use(express.json({limit:'1mb'}));
function tokenFor(u){return jwt.sign({sub:u.id,username:u.username,role:u.role},JWT_SECRET,{expiresIn:'8h'})}
function auth(req,res,next){const h=req.headers.authorization||'';const t=h.startsWith('Bearer ')?h.slice(7):null;if(!t)return res.status(401).json({message:'Authentication required'});try{req.auth=jwt.verify(t,JWT_SECRET);next()}catch{return res.status(401).json({message:'Session expired or invalid'})}}
function audit(userId,action,ip){db.prepare('INSERT INTO audit_log(user_id,action,ip) VALUES(?,?,?)').run(userId,action,ip||'')}
app.get('/api/health',(req,res)=>res.json({ok:true,service:'threadline-api'}));
app.post('/api/auth/login',(req,res)=>{const {username,password}=req.body||{};if(!username||!password)return res.status(400).json({message:'Username and password are required'});const u=db.prepare('SELECT * FROM users WHERE username=?').get(username);if(!u||!bcrypt.compareSync(password,u.password_hash)){return res.status(401).json({message:'Invalid username or password'})}audit(u.id,'LOGIN',req.ip);res.json({token:tokenFor(u),user:{id:u.id,username:u.username,role:u.role,otpEnabled:!!u.otp_enabled}})});
app.get('/api/auth/me',auth,(req,res)=>{const u=db.prepare('SELECT id,username,role,otp_enabled AS otpEnabled FROM users WHERE id=?').get(req.auth.sub);if(!u)return res.status(401).json({message:'User not found'});res.json({user:u})});
app.post('/api/auth/request-otp',auth,(req,res)=>res.status(501).json({message:'OTP delivery is scaffolded but not connected to SMS/email yet.'}));
app.post('/api/auth/verify-otp',auth,(req,res)=>res.status(501).json({message:'OTP verification endpoint reserved for the next phase.'}));
app.get('/api/auth/audit',auth,(req,res)=>{if(req.auth.role!=='owner')return res.status(403).json({message:'Forbidden'});res.json({rows:db.prepare('SELECT id,user_id,action,ip,created_at FROM audit_log ORDER BY id DESC LIMIT 100').all()})});
const DIST=path.join(ROOT,'client','dist');
if(fs.existsSync(DIST)){
  app.use(express.static(DIST));
  app.get('*',(req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).end();res.sendFile(path.join(DIST,'index.html'))});
}else{
  app.get('*',(req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).end();res.status(404).json({message:'Frontend is running in Vite development mode on port 5173.'})});
}
app.listen(PORT,()=>console.log(`Threadline API listening on http://127.0.0.1:${PORT}`));
