import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'); const name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).slice(1);const target=path.resolve(root,name);if(!['index.html','app.js','style.css'].includes(name)||!target.startsWith(root)||!types[path.extname(name)]){res.writeHead(404);res.end();return;}const body=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(name)],'X-Content-Type-Options':'nosniff'});res.end(body);}catch{res.writeHead(404);res.end('Nie znaleziono');}}).listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Iwonicz Pixel — port '+(process.env.PORT||3000)));
