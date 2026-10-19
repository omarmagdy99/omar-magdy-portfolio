import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(import.meta.dirname,'../dist');
const redirects = (await readFile(resolve(root, '_redirects'), 'utf8')).split(/\r?\n/)
  .filter(line => line.trim() && !line.startsWith('#'))
  .map(line => line.trim().split(/\s+/));
const headersFile = await readFile(resolve(root, '_headers'), 'utf8');
const policy = headersFile.match(/^  Content-Security-Policy: (.+)$/m)?.[1];
const commonHeaders = { 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff', ...(policy ? {'Content-Security-Policy':policy} : {}) };
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.pdf':'application/pdf','.xml':'application/xml','.txt':'text/plain'};
createServer(async(req,res)=>{
  try {
    const url = new URL(req.url,'http://localhost');
    let path = decodeURIComponent(url.pathname);
    const rule = redirects.find(([from]) => from === path);
    if (rule) {
      const [,to,status] = rule;
      if (Number(status) >= 300) {
        res.writeHead(Number(status), { ...commonHeaders, Location:to + url.search });
        return res.end();
      }
      path = to;
    }
    let file = resolve(root,'.'+path);
    if (file !== root && !file.startsWith(root+sep)) { res.writeHead(403); return res.end(); }
    if ((await stat(file)).isDirectory()) file = resolve(file,'index.html');
    const data = await readFile(file);
    res.writeHead(200,{...commonHeaders,'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404,{...commonHeaders,'Content-Type':'text/html; charset=utf-8'});res.end(await readFile(resolve(root,'404.html')));
  }
}).listen(Number(process.env.PORT || 4173),'127.0.0.1',()=>console.log('Portfolio preview: http://127.0.0.1:' + (process.env.PORT || 4173)));
