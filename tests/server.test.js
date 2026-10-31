import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
let server;const base='http://127.0.0.1:3101';
before(async()=>{server=spawn(process.execPath,['server.js'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:'3101'},stdio:['ignore','pipe','pipe']});await Promise.race([once(server.stdout,'data'),once(server,'exit').then(()=>{throw new Error('Server failed to start');}),new Promise((_,reject)=>{const t=setTimeout(()=>reject(new Error('Startup timeout')),5000);t.unref();})]);});
after(()=>server?.kill());
test('serves the Polish application and browser modules with correct MIME types',async()=>{for(const [route,type,content]of [['/','text/html','lang="pl"'],['/app.js','text/javascript','createOSMMap'],['/osm-map.js','text/javascript','Pijalnia Wód Mineralnych'],['/traffic.js','text/javascript','buildNetwork'],['/data/iwonicz-osm.json','application/json','OpenStreetMap'],['/style.css','text/css','.map']]){const res=await fetch(base+route);assert.equal(res.status,200);assert.ok(res.headers.get('content-type').startsWith(type));assert.ok((await res.text()).includes(content));}});
test('does not expose repository metadata, server source or unsupported files',async()=>{for(const route of ['/.git/config','/server.js','/package.json','/missing.css']){const res=await fetch(base+route);assert.equal(res.status,404,route);}});
