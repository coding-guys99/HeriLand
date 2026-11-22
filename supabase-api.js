/* HeriLand Cloud preview API adapter (Supabase PostgREST/Auth/Storage).
   Loaded BEFORE app.js. No service-role keys; RLS is enforced by Supabase. */
(function(){
'use strict';
const BASE='https://kojhcaiyhuoovytmbtga.supabase.co';
const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvamhjYWl5aHVvb3Z5dG1idGdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzMTgyNzQsImV4cCI6MjExMDg5NDI3NH0.u0XTBtb_VZueC9W2HHLIRADhCB8N9LctEV_elku6w2o';
const nativeFetch=window.fetch.bind(window);
const SESSION_KEY='heriland-supabase-auth-v1';
const cities=[['Kuching',1.5535,110.3593],['Sibu',2.2873,111.8305],['Miri',4.3995,113.9914],['Bintulu',3.1713,113.0419],['Samarahan',1.4599,110.4883],['Serian',1.1667,110.5667],['Sri Aman',1.2371,111.4621],['Sarikei',2.1167,111.5167],['Mukah',2.8944,112.0914],['Kapit',2.0167,112.9333],['Limbang',4.75,115],['Lawas',4.86,115.41]].map(([name,lat,lng],i)=>({id:i+1,name,lat,lng}));
const categories=['Food & Cafe','Travel & Nature','Lifestyle','Hidden Gems','Events & Festivals','Shopping','Campus Life','Jobs & Opportunities','Home & Living','Community','Local Businesses','Deals & Promotions'];
let session;try{session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{session=null}
let currentUser=null;
// Supabase email verification can redirect back with an implicit-flow session.
const hash=new URLSearchParams(location.hash.replace(/^#/, ''));
if(hash.get('access_token')&&hash.get('refresh_token')){
 const expires=Number(hash.get('expires_in')||3600);
 saveSession({access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token'),expires_at:Math.floor(Date.now()/1000)+expires});
 history.replaceState(null,'',location.pathname+location.search);
}

function saveSession(s){session=s;if(s)localStorage.setItem(SESSION_KEY,JSON.stringify(s));else localStorage.removeItem(SESSION_KEY)}
const result=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const fail=(e,status=400)=>result({error:String(e?.message||e)},status);
async function refresh(){
 if(!session?.refresh_token)return;
 if(Date.now() < (session.expires_at||0)*1000-60000)return;
 try{
  const r=await nativeFetch(BASE+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
  const d=await r.json();if(!r.ok)throw Error(d.msg||d.message||'Session expired');
  saveSession({...d,expires_at:Math.floor(Date.now()/1000)+(d.expires_in||3600)});
 }catch{saveSession(null);currentUser=null}
}
async function request(path,options={}){
 await refresh();
 const headers={apikey:KEY,Authorization:'Bearer '+(session?.access_token||KEY),...options.headers};
 const r=await nativeFetch(BASE+path,{...options,headers});
 if(!r.ok){const d=await r.json().catch(()=>({}));throw Object.assign(new Error(d.message||d.msg||d.error_description||d.error||('Cloud API '+r.status)),{status:r.status})}
 if(r.status===204||r.status===205)return null;
 const text=await r.text();return text?JSON.parse(text):null;
}
const qs=(table,obj={})=>{const u=new URL(BASE+'/rest/v1/'+table);Object.entries(obj).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,String(v))});return u.pathname+u.search};
const list=(table,query)=>request(qs('heriland_'+table,query),{method:'GET'});
const insert=(table,data)=>request('/rest/v1/heriland_'+table,{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(data)});
const remove=(table,query)=>request(qs('heriland_'+table,query),{method:'DELETE'});
const update=(table,query,data)=>request(qs('heriland_'+table,query),{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(data)});
function mediaUrl(path){return path?.startsWith('/')||path?.startsWith('http')?path:BASE+'/storage/v1/object/public/heriland-media/'+String(path).split('/').map(encodeURIComponent).join('/')}
function guide(g,saved=false){return {...g,image_url:mediaUrl(g.image_path),saved,heritage:'',tags:g.tags||[]}}
function userPublic(p){return p?{id:p.user_id,user_id:p.user_id,email:currentUser?.email||'',username:p.username,display_name:p.display_name,bio:p.bio,city:p.city,avatar:p.avatar_path||'',is_admin:false,language:'en'}:null}
async function who(){
 if(!session?.access_token)return null;
 try{
  currentUser=await request('/auth/v1/user');return currentUser
 }catch{saveSession(null);currentUser=null;return null}
}
async function ensureProfile(u){
 if(!u)return null;
 let rows=await list('profiles',{select:'*',user_id:'eq.'+u.id,limit:1});
 if(rows.length)return rows[0];
 const name=String(u.user_metadata?.name||u.email?.split('@')[0]||'HeriLand member').slice(0,50);
 const handle='user_'+u.id.replace(/-/g,'').slice(0,16);
 const created=await insert('profiles',{user_id:u.id,username:handle,display_name:name,city:'Kuching'});
 return created[0];
}
async function bootstrap(){
 const u=await who(),p=u?await ensureProfile(u):null;
 return {user:userPublic(p),cities,categories};
}
async function postRows(params){
 const per=20,offset=Math.max(0,Number(params.get('offset')||0));
 const filters={select:'*',status:'eq.published',order:'created_at.desc,id.desc',offset,limit:per+1};
 const city=params.get('city'),cat=params.get('category'),term=params.get('search'),author=params.get('author'),saved=params.get('saved');
 if(city&&city!=='All Sarawak')filters.city='eq.'+city;
 if(cat&&!['All','For You','Nearby','Following'].includes(cat))filters.category='eq.'+cat;
 if(author)filters.user_id='eq.'+author;
 if(term){const clean=term.replace(/[*,()]/g,'').slice(0,80);filters.or='(title.ilike.*'+clean+'*,body.ilike.*'+clean+'*,city.ilike.*'+clean+'*)'}
 let rows=await list('posts',filters);
 if(cat==='Following'){
  if(!currentUser)return {items:[],more:false};
  const f=await list('follows',{select:'followed_id',follower_id:'eq.'+currentUser.id});
  const allowed=new Set(f.map(x=>x.followed_id));rows=rows.filter(x=>allowed.has(x.user_id));
 }
 if(saved){
  if(!currentUser)return {items:[],more:false};
  const s=await list('saves',{select:'post_id',user_id:'eq.'+currentUser.id});
  const ids=new Set(s.map(x=>x.post_id));rows=rows.filter(x=>ids.has(x.id));
 }
 const more=rows.length>per;rows=rows.slice(0,per);
 return {items:await decorate(rows),more};
}
async function decorate(rows){
 if(!rows.length)return [];
 const ids=rows.map(p=>p.id).join(',');
 const owners=[...new Set(rows.map(p=>p.user_id).filter(Boolean))];
 const [media,likes,comments,profiles,ownLikes,ownSaves,followed]=await Promise.all([
  list('post_media',{select:'post_id,path,kind,sort_order',post_id:'in.('+ids+')',order:'sort_order.asc,id.asc'}),
  list('likes',{select:'post_id',post_id:'in.('+ids+')'}),
  list('comments',{select:'post_id',post_id:'in.('+ids+')'}),
  owners.length?list('profiles',{select:'user_id,display_name,username,avatar_path',user_id:'in.('+owners.join(',')+')'}):[],
  currentUser?list('likes',{select:'post_id',post_id:'in.('+ids+')',user_id:'eq.'+currentUser.id}):[],
  currentUser?list('saves',{select:'post_id',post_id:'in.('+ids+')',user_id:'eq.'+currentUser.id}):[],
  currentUser?list('follows',{select:'followed_id',follower_id:'eq.'+currentUser.id}):[]
 ]);
 const prof=new Map(profiles.map(x=>[x.user_id,x])),liked=new Set(ownLikes.map(x=>x.post_id)),saved=new Set(ownSaves.map(x=>x.post_id)),follows=new Set(followed.map(x=>x.followed_id));
 return rows.map(p=>{
  const pr=prof.get(p.user_id);
  return {...p,user_id:p.user_id||'',display_name:pr?.display_name||p.demo_author||'Local creator',username:pr?.username||(p.is_demo?'demo_creator':'heriland'),avatar:pr?.avatar_path||'',media:media.filter(m=>m.post_id===p.id).map(m=>({url:mediaUrl(m.path),kind:m.kind,aspect:.85})),tags:[],liked:liked.has(p.id),saved:saved.has(p.id),following:follows.has(p.user_id),like_count:likes.filter(v=>v.post_id===p.id).length,comment_count:comments.filter(v=>v.post_id===p.id).length};
 });
}
async function onePost(id){
 const p=await list('posts',{select:'*',id:'eq.'+id,limit:1});
 if(!p.length)throw Object.assign(Error('Post not found'),{status:404});
 return (await decorate(p))[0];
}
async function authRoute(action,body){
 if(action==='logout'){
  if(session)await request('/auth/v1/logout',{method:'POST'}).catch(()=>{});
  saveSession(null);currentUser=null;return {ok:true};
 }
 if(action==='register'){
  const r=await request('/auth/v1/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:body.email,password:body.password,data:{name:body.name}})});
  if(!r.access_token)return {pending_email:true,message:'Check your email to verify your account before signing in.'};
  saveSession({...r,expires_at:Math.floor(Date.now()/1000)+(r.expires_in||3600)});
  currentUser=r.user;await ensureProfile(currentUser);return {ok:true};
 }
 const r=await request('/auth/v1/token?grant_type=password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:body.email,password:body.password})});
 saveSession({...r,expires_at:Math.floor(Date.now()/1000)+(r.expires_in||3600)});
 currentUser=r.user;await ensureProfile(currentUser);return {ok:true};
}
async function upload(file){
 if(!currentUser)throw Object.assign(Error('Sign in to upload'),{status:401});
 if(!['image/jpeg','image/png','image/webp','video/mp4'].includes(file.type))throw Error('Unsupported file type');
 if(file.size>(file.type==='video/mp4'?12:10)*1024*1024)throw Error('File too large');
 const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4'}[file.type];
 const path=currentUser.id+'/'+crypto.randomUUID()+'.'+ext;
 await request('/storage/v1/object/heriland-media/'+path,{method:'POST',headers:{'Content-Type':file.type,'x-upsert':'false'},body:file});
 return {url:mediaUrl(path)};
}
async function route(url,init){
 const path=url.pathname.slice(4),q=url.searchParams,method=(init?.method||'GET').toUpperCase();
 const body=(init?.body instanceof Blob)?init.body:typeof init?.body==='string'?JSON.parse(init.body):init?.body||{};
 if(path==='/bootstrap')return bootstrap();
 if(path==='/heritage'&&method==='GET'){
  let rows=await list('guides',{select:'*',status:'eq.published',order:'id.asc',limit:300});
  if(q.get('city')&&q.get('city')!=='All Sarawak')rows=rows.filter(g=>g.city===q.get('city'));
  if(q.get('type')&&q.get('type')!=='All')rows=rows.filter(g=>g.type===q.get('type'));
  if(q.get('search'))rows=rows.filter(g=>[g.title,g.body,g.summary].join(' ').toLowerCase().includes(q.get('search').toLowerCase()));
  const s=currentUser?await list('guide_saves',{select:'guide_id',user_id:'eq.'+currentUser.id}):[];
  const saved=new Set(s.map(x=>x.guide_id));if(q.get('saved')==='1')rows=rows.filter(g=>saved.has(g.id));
  return {items:rows.map(g=>guide(g,saved.has(g.id))),total:rows.length,more:false};
 }
 if(/^\/heritage\/\d+$/.test(path)&&method==='GET'){
  const rows=await list('guides',{select:'*',id:'eq.'+path.split('/')[2],limit:1});
  if(!rows.length)throw Object.assign(Error('Guide not found'),{status:404});
  const s=currentUser?await list('guide_saves',{select:'guide_id',guide_id:'eq.'+rows[0].id,user_id:'eq.'+currentUser.id}):[];
  return {item:guide(rows[0],s.length>0),shops:[]};
 }
 if(/^\/heritage\/\d+\/save$/.test(path)&&method==='POST'){
  if(!currentUser)throw Object.assign(Error('Sign in to save guides'),{status:401});
  const id=Number(path.split('/')[2]),match={user_id:'eq.'+currentUser.id,guide_id:'eq.'+id};
  const prev=await list('guide_saves',{select:'guide_id',...match});
  if(prev.length)await remove('guide_saves',match);
  else await insert('guide_saves',{user_id:currentUser.id,guide_id:id});
  return {saved:!prev.length};
 }
 if(path==='/posts'&&method==='GET')return postRows(q);
 if(path==='/posts'&&method==='POST'){
  if(!currentUser)throw Object.assign(Error('Sign in to publish'),{status:401});
  if(!body.title?.trim())throw Error('Post title is required');
  if(!Array.isArray(body.media)||body.media.length>10)throw Error('Maximum 10 media items');
  // Validate file ownership BEFORE creating the post to avoid orphan posts.
  const prefix=BASE+'/storage/v1/object/public/heriland-media/';
  const mediaFiles=body.media.map((url,i)=>{
   const path=String(url).startsWith(prefix)?decodeURIComponent(String(url).slice(prefix.length)):null;
   if(!path?.startsWith(currentUser.id+'/'))throw Error('Only your uploads can be attached');
   return {path,kind:/\.mp4$/i.test(path)?'video':'image',sort_order:i};
  });
  if(!categories.includes(body.category)||!cities.some(c=>c.name===body.city))throw Error('Invalid category or city');
  const created=await insert('posts',{user_id:currentUser.id,title:body.title.trim().slice(0,140),body:String(body.body||'').slice(0,5000),city:body.city,category:body.category});
  const id=created[0].id;
  if(mediaFiles.length){
   try{await insert('post_media',mediaFiles.map(m=>({...m,post_id:id})))}
   catch(e){await remove('posts',{id:'eq.'+id,user_id:'eq.'+currentUser.id}).catch(()=>{});throw e}
  }
  await remove('drafts',{user_id:'eq.'+currentUser.id});
  return {ok:true,id};
 }
 if(/^\/posts\/\d+$/.test(path)){
  const id=Number(path.split('/')[2]);
  if(method==='GET')return onePost(id);
  if(!currentUser)throw Object.assign(Error('Sign in required'),{status:401});
  const mine=await list('posts',{select:'id',id:'eq.'+id,user_id:'eq.'+currentUser.id});
  if(!mine.length)throw Object.assign(Error('Not your post'),{status:403});
  if(method==='DELETE'){await remove('posts',{id:'eq.'+id});return {ok:true}}
  if(method==='PATCH'){await update('posts',{id:'eq.'+id},{title:body.title,body:body.body});return {ok:true}}
 }
 if(/^\/posts\/\d+\/(like|save)$/.test(path)&&method==='POST'){
  if(!currentUser)throw Object.assign(Error('Sign in required'),{status:401});
  const id=Number(path.split('/')[2]),table=path.endsWith('/like')?'likes':'saves';
  const query={post_id:'eq.'+id,user_id:'eq.'+currentUser.id},prev=await list(table,{select:'post_id',...query});
  if(prev.length)await remove(table,query);
  else await insert(table,{post_id:id,user_id:currentUser.id});
  return {active:!prev.length};
 }
 if(path==='/comments'&&method==='GET'){
  const rows=await list('comments',{select:'*',post_id:'eq.'+q.get('post_id'),order:'created_at.asc'});
  const ids=[...new Set(rows.map(x=>x.user_id))];
  const profiles=ids.length?await list('profiles',{select:'user_id,display_name,username',user_id:'in.('+ids.join(',')+')'}):[];
  const names=new Map(profiles.map(x=>[x.user_id,x]));
  return {items:rows.map(x=>({...x,display_name:names.get(x.user_id)?.display_name||'Member',username:names.get(x.user_id)?.username||'member'}))};
 }
 if(path==='/comments'&&method==='POST'){
  if(!currentUser)throw Object.assign(Error('Sign in required'),{status:401});
  const rows=await insert('comments',{post_id:Number(body.post_id),user_id:currentUser.id,body:String(body.body||'').trim()});
  return {id:rows[0].id};
 }
 if(/^\/comments\/\d+$/.test(path)&&method==='DELETE'){
  if(!currentUser)throw Object.assign(Error('Sign in required'),{status:401});
  await remove('comments',{id:'eq.'+path.split('/')[2],user_id:'eq.'+currentUser.id});return {ok:true};
 }
 if(path.startsWith('/auth/')&&method==='POST')return authRoute(path.split('/')[2],body);
 if(path==='/upload'&&method==='POST')return upload(body);
 if(path==='/draft'){
  if(!currentUser)throw Object.assign(Error('Sign in required'),{status:401});
  if(method==='GET'){
   const rows=await list('drafts',{select:'*',user_id:'eq.'+currentUser.id});
   if(!rows.length)return {};
   const d=rows[0];return {...d,media:JSON.stringify((d.media_paths||[]).map(mediaUrl))};
  }
  if(method==='PUT'){
   const existing=await list('drafts',{select:'user_id',user_id:'eq.'+currentUser.id});
   const data={title:String(body.title||''),body:String(body.body||''),city:body.city,category:body.category,media_paths:(body.media||[]).map(u=>decodeURIComponent(u.split('/heriland-media/')[1]||'')).filter(Boolean)};
   if(existing.length)await update('drafts',{user_id:'eq.'+currentUser.id},data);
   else await insert('drafts',{...data,user_id:currentUser.id});
   return {ok:true};
  }
 }
 if(path==='/me'&&method==='PATCH'){
  if(!currentUser)throw Object.assign(Error('Sign in required'),{status:401});
  const data={};for(const k of ['display_name','bio','city'])if(body[k]!==undefined)data[k]=String(body[k]);
  await update('profiles',{user_id:'eq.'+currentUser.id},data);return {ok:true};
 }
 if(path==='/follow'&&method==='POST'){
  if(!currentUser)throw Object.assign(Error('Sign in required'),{status:401});
  if(!body.user_id||body.user_id===currentUser.id)throw Error('Invalid follow target');
  const f={follower_id:'eq.'+currentUser.id,followed_id:'eq.'+body.user_id},prev=await list('follows',{select:'followed_id',...f});
  if(prev.length)await remove('follows',f);
  else await insert('follows',{follower_id:currentUser.id,followed_id:body.user_id});
  return {active:!prev.length};
 }
 if(path==='/report'&&method==='POST'){
  if(!currentUser)throw Object.assign(Error('Sign in required'),{status:401});
  await insert('reports',{reporter_id:currentUser.id,post_id:body.post_id||null,reason:String(body.reason||'').slice(0,1000)});return {ok:true};
 }
 if(path==='/notifications'&&method==='GET')return {items:[]};
 if(path==='/notifications/read'&&method==='POST')return {ok:true};
 throw Object.assign(Error('This feature is not available yet in the cloud version.'),{status:404});
}
window.fetch=async (input,init={})=>{
 const raw=typeof input==='string'?input:input.url;
 const url=new URL(raw,location.origin);
 if(url.origin!==location.origin||!url.pathname.startsWith('/api/'))return nativeFetch(input,init);
 try{return result(await route(url,init))}catch(e){console.warn('HeriLand API',url.pathname,e);return fail(e,e.status||400)}
};
})();
