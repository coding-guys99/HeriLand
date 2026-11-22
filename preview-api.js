/* Read-only public preview adapter. No account data or mutating API endpoints. */
(function(){
 const realFetch=window.fetch.bind(window);
 let bundlePromise=null;
 function bundle(){return bundlePromise||(bundlePromise=realFetch('/demo-data.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Demo data unavailable');return r.json()}))}
 function respond(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}})}
 window.fetch=async function(input,init){
  const path=typeof input==='string'?input:input.url;
  if(!path.startsWith('/api/'))return realFetch(input,init);
  const req=new URL(path,location.origin),p=req.pathname.slice(4),method=String(init?.method||'GET').toUpperCase();
  if(method!=='GET')return respond({error:'Public preview is read-only. Sign-in, posting and saves require the live server.'},403);
  try{
   const d=await bundle(),search=req.searchParams;
   if(p==='/bootstrap')return respond(d.bootstrap);
   if(p==='/heritage'){
    let items=d.guides.filter(t=>
     (!search.get('city')||search.get('city')==='All Sarawak'||t.city===search.get('city'))&&
     (!search.get('type')||search.get('type')==='All'||t.type===search.get('type'))&&
     (!search.get('search')||[t.title,t.summary,t.body,t.city,...(t.tags||[])].join(' ').toLowerCase().includes(search.get('search').toLowerCase())));
    if(search.get('saved')==='1')items=[];
    return respond({items,total:items.length,more:false});
   }
   if(/^\/heritage\/\d+$/.test(p)){
    const it=d.guides.find(x=>x.id===Number(p.split('/').pop()));
    return it?respond({item:it,shops:[]}):respond({error:'Guide not found'},404);
   }
   if(p==='/posts'){
    const city=search.get('city')||'',category=search.get('category')||'',query=(search.get('search')||'').toLowerCase();
    let items=d.posts.filter(t=>(!city||city==='All Sarawak'||t.city===city)&&(!category||['All','For You','Nearby'].includes(category)||t.category===category)&&(!query||[t.title,t.body,t.city,t.display_name].join(' ').toLowerCase().includes(query)));
    const offset=Number(search.get('offset')||0),page=items.slice(offset,offset+20);
    return respond({items:page,more:items.length>offset+20});
   }
   if(/^\/posts\/\d+$/.test(p)){
    const it=d.posts.find(x=>x.id===Number(p.split('/').pop()));
    return it?respond(it):respond({error:'Post not found'},404);
   }
   if(p==='/comments')return respond({items:[]});
   return respond({error:'This feature is unavailable in the read-only preview.'},404);
  }catch(err){return respond({error:'Preview data unavailable: '+err.message},503)}
 };
 document.addEventListener('DOMContentLoaded',()=>{
  const b=document.createElement('div');b.className='public-demo-label';
  b.textContent='HERILAND · PUBLIC READ-ONLY DEMO';
  b.setAttribute('aria-label','Public preview only; account and publishing unavailable');
  document.body.appendChild(b);
 });
})();
