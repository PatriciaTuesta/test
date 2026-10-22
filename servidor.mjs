// Servidor de desarrollo opcional. GitHub Pages no lo utiliza.
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';

const root=fileURLToPath(new URL('.',import.meta.url));
const port=Number(process.env.ATLAS_PORT || 8000);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'};

const server=createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end('Método no permitido');return;}
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let path=resolve(root,'.'+pathname);
    if(path!==resolve(root)&&!path.startsWith(resolve(root)+sep)){res.writeHead(403);res.end('Ruta no permitida');return;}
    let info=await stat(path);
    if(info.isDirectory()){path=resolve(path,'index.html');info=await stat(path);}
    res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD')res.end();
    else createReadStream(path).on('error',()=>res.destroy()).pipe(res);
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Archivo no encontrado. Conserva las carpetas del proyecto.');}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`El puerto ${port} está ocupado. Cierra otro servidor o usa ATLAS_PORT.`:'No se pudo iniciar el servidor local.');process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Patricia Tuesta English Classes listo: http://localhost:${port}\nDeja esta ventana abierta. Para detener: Ctrl+C.`));
