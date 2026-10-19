// Run with Spotifree running. Does not create users or alter the catalogue.
const assert = require('node:assert/strict');
async function main(){
 const base=process.env.TEST_URL || 'http://127.0.0.1:8000';
 const page=await fetch(base);assert.equal(page.status,200);assert.match(await page.text(),/Spotifree/);
 const health=await fetch(base+'/api/health');assert.equal(health.status,200);assert.equal((await health.json()).backend,'python');
 const session=await fetch(base+'/api/session');const value=await session.json();assert.ok(value.csrf);
 const cookie=session.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 const invalid=await fetch(base+'/api/register',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':value.csrf,cookie},body:JSON.stringify({email:'invalid'})});assert.equal(invalid.status,400);
 const blocked=await fetch(base+'/api/playlists',{method:'POST',headers:{'Content-Type':'application/json',cookie},body:'{"name":"x"}'});assert.equal(blocked.status,403);
 const library=await fetch(base+'/api/library');assert.ok((await library.json()).tracks.length>0);
 console.log('OK: HTML, Express → Python → SQL, cookies, validación y CSRF.');
}
main().catch(e=>{console.error(e);process.exit(1);});
