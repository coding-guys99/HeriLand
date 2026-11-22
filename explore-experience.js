/* HeriLand Explore v7: visual discovery with explicitly labelled demo content.
   Uses existing authenticated guide and post detail handlers, no new data APIs. */
const exploreUI={query:'',kind:'All',showCities:false,showMap:false,view:'mix',activeIndex:0};
const EXPLORE_KINDS=[['All','For you'],['Taste','Food'],['Explore','Places'],['Experience','Experiences'],['Culture','Culture']];
function exploreItems(){
 const city=state.exploreCity||'All Sarawak',kind=discoveryState.exploreType||'All';
 const q=(state.search||'').trim().toLowerCase();
 return discoveryState.items.filter(t=>(city==='All Sarawak'||t.city===city)&&(kind==='All'||kind===t.type)&&(!q||[t.title,t.summary,t.body,t.city,...(t.tags||[])].join(' ').toLowerCase().includes(q)));
}
function explorePosts(){
 const kind=discoveryState.exploreType||'All',city=state.exploreCity||'All Sarawak',q=(state.search||'').trim().toLowerCase();
 const map={Taste:['Food & Cafe'],Explore:['Travel & Nature','Hidden Gems'],Experience:['Lifestyle','Shopping','Local Businesses','Community'],Culture:['Events & Festivals','Community']};
 return state.posts.filter(p=>(city==='All Sarawak'||p.city===city)&&(kind==='All'||(map[kind]||[]).includes(p.category))&&(!q||[p.title,p.body,p.city,p.category].join(' ').toLowerCase().includes(q)));
}
function exploreTile(item,i){
 const p=item.data;
 if(item.kind==='guide')return '<article class="xp-tile xp-tile-guide"><button class="xp-cover" data-guide="'+p.id+'" aria-label="Open guide '+esc(p.title)+'"><img src="'+esc(topicImg(p))+'" alt="Illustrative '+esc(p.title)+'" loading="lazy"/><span class="xp-cover-label">'+esc(p.type)+'</span></button><div class="xp-tile-meta"><span class="xp-tile-city">'+ico('pin')+' '+esc(p.city)+'</span><button class="xp-tile-title" data-guide="'+p.id+'">'+esc(p.title)+'</button><div class="xp-tile-bottom"><span class="xp-source">Guide · Demo</span><button data-explore-save="'+p.id+'" aria-label="'+(p.saved?'Remove saved guide':'Save guide')+'" class="xp-save '+(p.saved?'saved':'')+'">'+ico('bookmark')+'</button></div></div></article>';
 const media=p.media?.[0],src=media?.url||'';
 return '<article class="xp-tile xp-tile-post"><button class="xp-cover" data-post="'+p.id+'" aria-label="Open story '+esc(p.title)+'">'+(src?'<img src="'+esc(src)+'" alt="'+esc(p.title)+'" loading="lazy"/>':'<span class="xp-fallback">'+esc(p.city)+'</span>')+'<span class="xp-cover-label">Community</span>'+(media?.kind==='video'?'<span class="xp-video-indicator">▶ Video</span>':'')+'</button><div class="xp-tile-meta"><span class="xp-tile-city">'+ico('pin')+' '+esc(p.city)+'</span><button class="xp-tile-title" data-post="'+p.id+'">'+esc(p.title)+'</button><div class="xp-tile-bottom"><span class="xp-source">'+esc(p.display_name||'Local creator')+' · '+(p.is_demo?'Demo':'Community')+'</span><button class="xp-save '+(p.saved?'saved':'')+'" data-save="'+p.id+'" aria-label="Save post">'+ico('bookmark')+'</button></div></div></article>';
}
function discoveryExploreV7(){
 const city=state.exploreCity||'All Sarawak',type=discoveryState.exploreType||'All';
 const guides=exploreItems(),posts=explorePosts();
 // Alternate editorial guide cards and existing community posts.
 const merged=[];
 if(exploreUI.view!=='posts')guides.forEach((data,i)=>merged.push({kind:'guide',data,order:i*2}));
 if(exploreUI.view!=='guides')posts.forEach((data,i)=>merged.push({kind:'post',data,order:i*2+1}));
 merged.sort((a,b)=>a.order-b.order);
 const cities=['All Sarawak',...(state.cities||[]).map(c=>c.name)];
 return '<div class="xp-page">'+
 '<div class="xp-intro"><div><span class="xp-eyebrow">HERILAND / DISCOVER</span><h1>Find your <em>next story.</em></h1><p>Food, culture, places and stories from Sarawak — all in one feed.</p></div><span class="xp-count-badge">DEMO DISCOVERIES</span></div>'+
 '<form id="xp-search-form" class="xp-search"><span class="xp-search-icon">'+ico('search')+'</span><input id="xp-search" name="query" type="search" autocomplete="off" placeholder="Search laksa, Bako, Sibu, culture..." value="'+esc(state.search)+'" aria-label="Search Sarawak discoveries"/><button type="submit">Search</button></form>'+
 '<div class="xp-controls"><div class="xp-topics" role="group" aria-label="Explore by interest">'+EXPLORE_KINDS.map(([key,label])=>'<button class="xp-chip '+(type===key?'active':'')+'" data-xp-type="'+key+'" aria-pressed="'+(type===key)+'">'+esc(label)+'</button>').join('')+'</div><div class="xp-city-control"><label for="xp-city">City</label><select id="xp-city" aria-label="Filter by city">'+cities.map(c=>'<option value="'+esc(c)+'" '+(c===city?'selected':'')+'>'+esc(c)+'</option>').join('')+'</select></div></div>'+
 '<div class="xp-tools"><div class="xp-section-name"><h2>'+esc(city==='All Sarawak'?'Explore Sarawak':city+' discoveries')+'</h2><p>'+merged.length+' stories in this view · Guides and sample posts are clearly labelled</p></div><div class="xp-tool-actions"><button class="'+(exploreUI.view==='mix'?'selected':'')+'" data-xp-view="mix">All</button><button class="'+(exploreUI.view==='guides'?'selected':'')+'" data-xp-view="guides">Guides</button><button class="'+(exploreUI.view==='posts'?'selected':'')+'" data-xp-view="posts">Stories</button><button data-xp-map class="xp-map-toggle">'+ico('pin')+' Map</button></div></div>'+
 (exploreUI.showMap?'<section class="xp-map"><div class="xp-map-heading"><strong>'+esc(city==='All Sarawak'?'Sarawak city overview':city+' city overview')+'</strong><p>City centre only · Not verified venue locations</p></div><iframe title="OpenStreetMap city overview" loading="lazy" referrerpolicy="no-referrer" src="https://www.openstreetmap.org/export/embed.html?bbox='+mapBBox()+'&layer=mapnik&marker='+encodeURIComponent(mapMarker())+'"></iframe></section>':'')+
 (merged.length?'<div class="xp-masonry">'+merged.map(exploreTile).join('')+'</div>':'<div class="xp-empty"><div class="xp-empty-icon">⌕</div><h3>Nothing here just yet.</h3><p>Try another city or topic — our Sarawak guide collection is still growing.</p><button data-xp-reset>Explore all Sarawak →</button></div>')+
 (state.more&&exploreUI.view!=='guides'?'<div class="xp-load"><button data-more>Load more stories ↓</button></div>':'')+
 '<div class="xp-end"><span>INSPIRED BY LOCAL LIFE</span><p>Found something worth sharing?</p><button data-nav="create">Share your Sarawak story →</button></div></div>';
}
const oldExploreRenderer=discoveryExplore;
discoveryExplore=discoveryExploreV7;
explore=discoveryExploreV7;
document.addEventListener('submit',async e=>{
 if(e.target.id!=='xp-search-form')return;
 e.preventDefault();e.stopImmediatePropagation();
 state.search=e.target.elements.query.value.trim();
 state.offset=0;await fetchPosts();
},true);
document.addEventListener('change',async e=>{
 if(e.target.id!=='xp-city')return;
 e.stopImmediatePropagation();
 state.exploreCity=e.target.value;
 state.offset=0;state.search=document.getElementById('xp-search')?.value||state.search;
 await fetchPosts();
},true);
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-xp-type],[data-xp-view],[data-xp-map],[data-xp-reset],[data-explore-save]');
 if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(b.hasAttribute('data-xp-type')){discoveryState.exploreType=b.dataset.xpType;render();return}
 if(b.hasAttribute('data-xp-view')){exploreUI.view=b.dataset.xpView;render();return}
 if(b.hasAttribute('data-xp-map')){exploreUI.showMap=!exploreUI.showMap;render();return}
 if(b.hasAttribute('data-xp-reset')){state.search='';state.exploreCity='All Sarawak';discoveryState.exploreType='All';exploreUI.view='mix';state.offset=0;await fetchPosts();return}
 if(b.hasAttribute('data-explore-save')){
  if(needAuth())return;
  try{
   const r=await send('/heritage/'+b.dataset.exploreSave+'/save',{});
   const item=discoveryState.items.find(x=>x.id===Number(b.dataset.exploreSave));
   if(item)item.saved=r.saved;
   render();toast(r.saved?'Saved to your guides':'Removed from saved guides');
  }catch(error){toast(error.message)}
 }
},true);
