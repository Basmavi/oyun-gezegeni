const http=require('http'),fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,LOG=path.join(__dirname,'oyuncular.log');
const KEY='1bb4f921fdb324988272cc24cbb010405e3c67ba63da4cf6a195ce6efc1b07ebc6d1dcd7b4caa6f1bd8efa5a9d3feb4759fa8a4f4db7c0e1d7cc8bb6deaf12d5';

if(process.argv.includes('--yeni-kod')){
 const nk=crypto.randomBytes(64).toString('hex');
 fs.writeFileSync(__filename,fs.readFileSync(__filename,'utf8').replace(/const KEY='[0-9a-f]*';/,"const KEY='"+nk+"';"));
 ['aramizda.html','voxelcraft.html','sapurtnite.html','crownclash.html','index.html'].forEach(f=>{
  const fp=path.join(__dirname,f);
  if(fs.existsSync(fp)){
   fs.writeFileSync(fp,fs.readFileSync(fp,'utf8').replace(/const _k=\[[^\]]*\];/,'const _k=['+nk.match(/.{8}/g).map(x=>"'"+x+"'").join(',')+'];'));
  }
 });
 console.log('Yeni kod dosyalara yazildi. Sunucuyu yeniden baslat.');
 process.exit(0);
}

const ADIR=path.join(__dirname,'adayis'),MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.tga':'application/octet-stream','.fbx':'application/octet-stream','.obj':'text/plain; charset=utf-8'};
const tokens=new Set(),rooms={},bad={};
const send=(s,o)=>s.write('data: '+JSON.stringify(o)+'\n\n');
const ipOf=q=>(q.headers['cf-connecting-ip']||(q.headers['x-forwarded-for']||'').split(',')[0].trim()||q.socket.remoteAddress||'?').replace('::ffff:','');
const log=o=>{const l={zaman:new Date().toISOString(),...o};fs.appendFile(LOG,JSON.stringify(l)+'\n',()=>{});console.log(l.zaman.slice(11,19),o.olay,o.ip,o.ad||'',o.oda||'')};
const same=a=>{const x=Buffer.from(String(a)),y=Buffer.from(KEY);return x.length===y.length&&crypto.timingSafeEqual(x,y)};
const body=(q,cb)=>{let b='';q.on('data',d=>{b+=d;if(b.length>150000)q.destroy()});q.on('end',()=>cb(b))};

http.createServer((q,s)=>{
 const u=new URL(q.url,'http://x'),ip=ipOf(q),r=u.searchParams.get('r'),id=u.searchParams.get('id'),tk=u.searchParams.get('s');
 
 if(u.pathname==='/verify'&&q.method==='POST'){
  if((bad[ip]||0)>=10){s.writeHead(429);s.end('x');return}
  body(q,b=>{
   if(same(b)){bad[ip]=0;const t=crypto.randomBytes(16).toString('hex');tokens.add(t);log({olay:'dogrulama_basarili',ip});s.writeHead(200);s.end(t)}
   else{bad[ip]=(bad[ip]||0)+1;log({olay:'YANLIS_KOD',ip});s.writeHead(403);s.end('x')}
  });
  return;
 }

 if(u.pathname==='/events'||u.pathname==='/send'){
  if(!tokens.has(tk)){s.writeHead(403);s.end('x');return}
  if(u.pathname==='/events'){
   s.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
   const R=rooms[r]=rooms[r]||{c:{},h:null};
   if(!R.h||!R.c[R.h])R.h=id;
   R.c[id]=s;
   log({olay:'baglandi',ip,oda:r,id});
   send(s,{t:'hello',host:R.h});
   const hb=setInterval(()=>s.write(':\n\n'),20000);
   q.on('close',()=>{
    clearInterval(hb);
    if(R.c[id]!==s)return;
    delete R.c[id];
    log({olay:'ayrildi',ip,oda:r,id});
    const remIds=Object.keys(R.c);
    if(R.h===id){
     R.h=remIds[0]||null;
     for(const k of remIds){
      send(R.c[k],{t:'left',id});
      send(R.c[k],{t:'hostleft',newHost:R.h});
     }
     if(!R.h)delete rooms[r];
    }else{
     for(const k of remIds)send(R.c[k],{t:'left',id});
    }
   });
   return;
  }
  body(q,b=>{
   try{
    const m=JSON.parse(b),R=rooms[r];
    if(m.t==='join'||m.t==='who'||m.t==='mc_join')log({olay:'oyuncu',ip,ad:String(m.name).slice(0,14),oda:r,id});
    if(R){
     const to=m.to;delete m.to;m.from=id;
     if(m.t==='join'||m.t==='mc_join')m.ip=ip;
     if(to==='h'){if(R.c[R.h])send(R.c[R.h],m)}
     else if(to==='*'){for(const k in R.c)if(k!==id)send(R.c[k],m)}
     else if(R.c[to])send(R.c[to],m);
    }
   }catch(e){}
   s.end('ok');
  });
  return;
 }

 if(u.pathname==='/adayis/liste.json'){s.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});s.end('{"karakter":[],"harita":[],"yan_karakterler":[],"araclar":[]}');return}

 // Yönlendirme (Routing) Kısmı
 let dosyaAdi = null;
 if (u.pathname === '/adayis' || u.pathname === '/adayis/' || u.pathname === '/adayis.html' || u.pathname === '/index.html') {
  dosyaAdi = 'index.html';
 } else if (u.pathname === '/voxelcraft' || u.pathname === '/voxelcraft.html') {
  dosyaAdi = 'voxelcraft.html';
 } else if (u.pathname === '/aramizda' || u.pathname === '/aramizda.html') {
  dosyaAdi = 'aramizda.html';
 } else if (u.pathname === '/sapurtnite' || u.pathname === '/sapurtnite.html') {
  dosyaAdi = 'sapurtnite.html';
 } else if (u.pathname === '/crownclash' || u.pathname === '/crownclash.html') {
  dosyaAdi = 'crownclash.html';
 } else if (u.pathname === '/') {
  s.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  s.end(`<!doctype html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Oyun Lobisi</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background-color: #090d16;
            color: #fff;
            font-family: 'Inter', sans-serif, system-ui;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .container {
            width: 100%;
            max-width: 380px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .game-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #131c31;
            border: 1px solid #1e293b;
            border-radius: 16px;
            padding: 16px 20px;
            text-decoration: none;
            color: #fff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: transform 0.15s ease, border-color 0.15s ease;
        }
        .game-card:active {
            transform: scale(0.97);
        }
        .mc-btn { border-left: 6px solid #10b981; }
        .mc-title { font-size: 20px; font-weight: 900; letter-spacing: 1px; color: #10b981; text-transform: uppercase; }

        .aramizda-btn { border-left: 6px solid #ef4444; }
        .aramizda-title { font-size: 20px; font-weight: 900; letter-spacing: 1px; color: #ef4444; text-transform: uppercase; }

        .sapurtnite-btn { border-left: 6px solid #eab308; }
        .sapurtnite-title { font-size: 20px; font-weight: 900; letter-spacing: 1px; color: #eab308; text-transform: uppercase; }

        .crown-btn { border-left: 6px solid #f59e0b; }
        .crown-content { display: flex; align-items: center; gap: 12px; }
        .crown-logo { width: 36px; height: 36px; background: #eab308; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 0 10px rgba(234,179,8,0.4); }
        .crown-title { font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #f59e0b; text-transform: uppercase; }
        
        .adayis-btn { border-left: 6px solid #22d3ee; }
        .adayis-title { font-size: 20px; font-weight: 900; letter-spacing: 1px; color: #22d3ee; text-transform: uppercase; }

        .arrow { color: #64748b; font-size: 16px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <a href="/voxelcraft" class="game-card mc-btn">
            <span class="mc-title">🧱 VoxelCraft 3D</span>
            <span class="arrow">➜</span>
        </a>
        <a href="/adayis/" class="game-card adayis-btn">
            <span class="adayis-title">ADAYIS City</span>
            <span class="arrow">➜</span>
        </a>
        <a href="/aramizda" class="game-card aramizda-btn">
            <span class="aramizda-title">Aramızda</span>
            <span class="arrow">➜</span>
        </a>
        <a href="/sapurtnite" class="game-card sapurtnite-btn">
            <span class="sapurtnite-title">Şapurtnite</span>
            <span class="arrow">➜</span>
        </a>
        <a href="/crownclash" class="game-card crown-btn">
            <div class="crown-content">
                <div class="crown-logo">👑</div>
                <span class="crown-title">Crown Clash</span>
            </div>
            <span class="arrow">➜</span>
        </a>
    </div>
</body>
</html>`);
  return;
 } else {
  s.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
  s.end('bulunamadi');
  return;
 }

 fs.readFile(path.join(__dirname, dosyaAdi),(e,d)=>{
  if(e){s.writeHead(404);s.end(dosyaAdi + ' bulunamadi');return}
  s.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
  s.end(d);
 });
}).listen(PORT,'0.0.0.0',()=>{
 console.log('Sunucu calisiyor. Bu adreslerden gir:');
 console.log('http://localhost:'+PORT);
 for(const l of Object.values(os.networkInterfaces()))for(const a of l)if(a.family==='IPv4'&&!a.internal){
  console.log('VoxelCraft:  http://'+a.address+':'+PORT+'/voxelcraft');
  console.log('ADAYIS City: http://'+a.address+':'+PORT+'/adayis/');
  console.log('Aramizda:    http://'+a.address+':'+PORT+'/aramizda');
  console.log('Sapurtnite:  http://'+a.address+':'+PORT+'/sapurtnite');
  console.log('Crown Clash: http://'+a.address+':'+PORT+'/crownclash');
 }
 console.log('Kayit dosyasi: '+LOG);
});