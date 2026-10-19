require('dotenv').config();
const express = require('express');
const {rateLimit} = require('express-rate-limit');
const {spawn} = require('node:child_process');
const {randomBytes} = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const app = express();
const port = Number(process.env.PORT || 8000);
const pythonPort = Number(process.env.PYTHON_PORT || 8001);
const token = randomBytes(32).toString('hex');
const venv = path.join(__dirname,'.venv',process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const command = process.env.PYTHON_BIN || (fs.existsSync(venv) ? venv : (process.platform === 'win32' ? 'py' : 'python3'));
const args = command === 'py' ? ['-3.13','app.py'] : ['app.py'];
const python = spawn(command,args,{cwd:__dirname,env:{...process.env,INTERNAL_TOKEN:token},stdio:'inherit',windowsHide:true});
python.on('error',e => {console.error('No se pudo iniciar Python:',e.message);process.exit(1);});
python.on('exit',code => {console.error('La API Python se ha detenido. Comprueba MySQL y .env.');process.exit(code || 1);});
process.on('exit',() => python.kill());
process.on('SIGINT',() => process.exit(0));
process.on('SIGTERM',() => process.exit(0));
app.disable('x-powered-by');
app.use((req,res,next) => {res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Content-Type-Options','nosniff');next();});
app.use('/api',rateLimit({windowMs:60_000,limit:120,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Demasiadas solicitudes. Espera un minuto.'}}));
const authLimit = rateLimit({windowMs:15*60_000,limit:30,legacyHeaders:false,message:{error:'Demasiados intentos. Inténtalo más tarde.'}});
app.use(['/api/login','/api/register'],authLimit);
app.use(express.json({limit:'16kb'}));
app.use('/api',async (req,res) => {
 if (!['GET','POST'].includes(req.method)) return res.status(405).json({error:'Método no permitido.'});
 if (req.method === 'POST' && req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return res.status(403).json({error:'Origen no permitido.'});
 try {
  const upstream = await fetch(`http://127.0.0.1:${pythonPort}${req.originalUrl}`,{
   method:req.method,redirect:'error',signal:AbortSignal.timeout(20000),
   headers:{'Content-Type':'application/json','X-Internal-Token':token,'X-CSRF-Token':req.headers['x-csrf-token'] || '',cookie:req.headers.cookie || ''},
   ...(req.method === 'POST' ? {body:JSON.stringify(req.body || {})} : {})
  });
  const cookies = upstream.headers.getSetCookie();
  if(cookies.length) res.setHeader('Set-Cookie',cookies);
  res.setHeader('Cache-Control','no-store');
  res.status(upstream.status).type('json').send(await upstream.text());
 } catch {res.status(503).json({error:'La API Python no está disponible. Revisa MySQL y la terminal.'});}
});
app.use(express.static(path.join(__dirname,'static')));
app.use((err,req,res,next) => res.status(err.status || 500).json({error:'La solicitud no se pudo procesar.'}));
app.listen(port,'127.0.0.1',() => console.log(`Spotifree → http://127.0.0.1:${port}`));
