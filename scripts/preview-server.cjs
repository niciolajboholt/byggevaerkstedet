// Local-only preview; no build step or runtime dependency for the GitHub Pages app.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const args=process.argv.slice(2),port=Number(args[args.indexOf('--port')+1])||4173;
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.woff2':'font/woff2'};
http.createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]);let file=path.resolve(root,'.'+(name==='/'?'/preview.html':name));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(err,body)=>{if(err){res.writeHead(404).end('Not found');return}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body)})}).listen(port,'127.0.0.1',()=>console.log(`Preview ready at http://127.0.0.1:${port}/index.html`));
